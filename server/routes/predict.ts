import type { RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import type { PredictRequest, PredictResponse } from "@shared/api";

// Load regression model artifact (coefficients, scaler, feature order, and y stats)
const MODEL_PATH = path.resolve(process.cwd(), "server/models/laptop_price_regression.json");

type ModelArtifact = {
  feature_order: string[];
  scaler: { means: number[]; stds: number[] };
  coefficients: number[];
  intercept: number; // in original target units
  y_stats: { mean: number; std: number; min: number; max: number };
};

let model: ModelArtifact | null = null;
function loadModel(): ModelArtifact {
  if (model) return model;
  const raw = fs.readFileSync(MODEL_PATH, "utf-8");
  model = JSON.parse(raw) as ModelArtifact;
  return model!;
}

function brandScore(brand?: string): number {
  if (!brand) return 0;
  const b = brand.toLowerCase();
  if (b.includes("apple")) return 1.0;
  if (b.includes("msi")) return 0.35;
  if (b.includes("dell")) return 0.25;
  if (b.includes("samsung")) return 0.25;
  if (b.includes("lenovo")) return 0.2;
  if (b.includes("asus")) return 0.15;
  if (b.includes("hp")) return 0.15;
  if (b.includes("acer")) return 0.05;
  return 0.0;
}

function cpuLevel(cpu?: string): number {
  if (!cpu) return 0;
  const s = cpu.toLowerCase();
  if (/i9\b/.test(s)) return 4.0;
  if (/i7\b/.test(s)) return 3.0;
  if (/i5\b/.test(s)) return 2.0;
  if (/i3\b/.test(s)) return 1.0;
  if (/ryzen\s*9\b/.test(s)) return 3.8;
  if (/ryzen\s*7\b/.test(s)) return 3.1;
  if (/ryzen\s*5\b/.test(s)) return 2.2;
  if (/ryzen\s*3\b/.test(s)) return 1.2;
  return 0.0;
}

function parseSpecs(specs?: string) {
  if (!specs) return {} as { ram_gb?: number; storage_gb?: number; cpu?: string };
  const s = specs.toLowerCase();
  let ram_gb: number | undefined;
  let storage_gb: number | undefined;
  const ramMatch = s.match(/(\d{2,3})\s*gb\b/);
  if (ramMatch) ram_gb = parseInt(ramMatch[1], 10);
  const storageMatch = s.match(/(\d{2,4})\s*(tb|gb)\b/);
  if (storageMatch) {
    const val = parseInt(storageMatch[1], 10);
    const unit = storageMatch[2];
    storage_gb = unit === "tb" ? val * 1024 : val;
  }
  const cpu = (s.match(/(i[3579]|ryzen\s*[3579])\b/)?.[1] ?? "").trim();
  return { ram_gb, storage_gb, cpu };
}

function standardize(x: number, mean: number, std: number): number {
  return std === 0 ? 0 : (x - mean) / std;
}

async function llmExplain(prompt: string): Promise<{ text: string | null; error?: string }>{
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  const llm = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  if (!apiKey) return { text: null, error: "no_api_key" };
  try {
    if (llm === "openai") {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an assistant that explains anomalous price predictions for products succinctly." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        return { text: null, error: `http_${resp.status}: ${txt.slice(0,200)}` };
      }
      const data = (await resp.json()) as any;
      const text = data.choices?.[0]?.message?.content?.trim();
      return { text: text || null };
    }
    return { text: null, error: "unsupported_provider" };
  } catch (err: any) {
    return { text: null, error: String(err?.message ?? err) };
  }
}

export const handlePredict: RequestHandler = async (req, res) => {
  try {
    const m = loadModel();
    const body = req.body as PredictRequest;

    const parsed = parseSpecs(body.specsText);
    const ram_gb = body.ram_gb ?? parsed.ram_gb ?? 0;
    const storage_gb = body.storage_gb ?? parsed.storage_gb ?? 0;
    const cpu = body.cpu ?? parsed.cpu ?? "";
    const cpu_lvl = body.cpu_level ?? cpuLevel(cpu);
    const brand_score = body.brand_score ?? brandScore(body.brand);
    const rating = body.rating ?? 4.0;

    const featuresDict: Record<string, number> = {
      ram_gb,
      storage_gb,
      cpu_level: cpu_lvl,
      brand_score,
      rating,
    };

    const xStd = m.feature_order.map((f, i) =>
      standardize(featuresDict[f] ?? 0, m.scaler.means[i], m.scaler.stds[i])
    );

    const dot = xStd.reduce((acc, v, i) => acc + v * m.coefficients[i], 0);
    const predicted_price = Math.max(50, m.intercept + dot);

    const lower = m.y_stats.min - 1.5 * m.y_stats.std;
    const upper = m.y_stats.max + 1.5 * m.y_stats.std;
    const is_anomalous = predicted_price < lower || predicted_price > upper;

    let explanation: string | undefined;
    if (is_anomalous) {
      const userStr = JSON.stringify({ brand: body.brand, cpu, ram_gb, storage_gb, rating });
      const prompt = `The following product spec ${userStr} produced a predicted price of $${predicted_price.toFixed(
        2
      )}, which seems anomalous compared to the expected range [${lower.toFixed(0)}, ${upper.toFixed(
        0
      )}]. Explain concisely 1-2 sentences why this might happen (e.g., premium branding, supply constraints, currency fluctuations, sparse training data, feature distribution shift).`;
      const llmRes = await llmExplain(prompt);
      explanation =
        llmRes.text ||
        (predicted_price > upper
          ? "High predicted price may reflect premium branding, top-tier CPU/RAM configuration, or limited supply driving up costs."
          : "Low predicted price could indicate entry-level specs, discounting, refurbished stock, or gaps in the training data for this configuration.");
    }

    const response: PredictResponse = {
      input: {
        brand: body.brand,
        ram_gb,
        storage_gb,
        cpu: cpu || body.cpu,
        cpu_level: cpu_lvl,
        rating,
      },
      predicted_price,
      anomaly: is_anomalous
        ? {
            is_anomalous,
            bounds: { lower, upper },
            explanation,
          }
        : { is_anomalous, bounds: { lower, upper } },
      model: {
        feature_order: m.feature_order,
        coefficients: m.coefficients,
        intercept: m.intercept,
        scaler: m.scaler,
        y_stats: m.y_stats,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ error: "Prediction failed" });
  }
};

export const handleSampleData: RequestHandler = async (_req, res) => {
  try {
    const url = "https://fakestoreapi.com/products";
    const r = await fetch(url);
    const j = (await r.json()) as any;
    const arr = Array.isArray(j) ? j : j.products || [];
    const items = arr.map((p: any) => ({
      id: p.id,
      title: p.title,
      brand: p.category ?? "",
      description: p.description,
      rating: p?.rating?.rate ?? typeof p.rating === "number" ? p.rating : 0,
      price: p.price,
    }));
    res.json({ source: url, count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch sample data" });
  }
};
