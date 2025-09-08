import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PredictResponse } from "@shared/api";

const schema = z.object({
  brand: z.string().min(1, "Brand is required"),
  cpu: z.string().min(1, "CPU is required"),
  ram_gb: z.coerce.number().min(2).max(256),
  storage_gb: z.coerce.number().min(32).max(8192),
  rating: z.number().min(1).max(5),
  specsText: z.string().optional(),
});

export type PredictFormValues = z.infer<typeof schema>;

export function PredictForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PredictFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { brand: "Dell", cpu: "Intel i7", ram_gb: 16, storage_gb: 512, rating: 4 },
  });

  const rating = watch("rating");

  async function onSubmit(values: PredictFormValues) {
    setLoading(true);
    try {
      const resp = await fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = (await resp.json()) as PredictResponse;
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  function applySpecsText() {
    const text = (document.getElementById("specsText") as HTMLTextAreaElement)?.value || "";
    const s = text.toLowerCase();
    const ram = s.match(/(\d{2,3})\s*gb/);
    if (ram) setValue("ram_gb", Number(ram[1]));
    const storage = s.match(/(\d{2,4})\s*(tb|gb)/);
    if (storage) setValue("storage_gb", storage[2] === "tb" ? Number(storage[1]) * 1024 : Number(storage[1]));
    const cpu = s.match(/(i[3579]|ryzen\s*[3579])/);
    if (cpu) setValue("cpu", cpu[0].replace(/\s+/, " ").toUpperCase().replace("RYZEN", "Ryzen"));
  }

  return (
    <div className="w-full grid md:grid-cols-2 gap-8 items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white/70 dark:bg-white/5 backdrop-blur rounded-xl p-6 shadow-xl border border-white/20">
        <h3 className="text-xl font-semibold">Enter product details</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" placeholder="e.g., Apple" {...register("brand")} />
            {errors.brand && <p className="text-destructive text-sm mt-1">{errors.brand.message}</p>}
          </div>
          <div>
            <Label htmlFor="cpu">CPU</Label>
            <Select onValueChange={(v) => setValue("cpu", v)} defaultValue="Intel i7">
              <SelectTrigger id="cpu"><SelectValue placeholder="CPU" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Intel i3">Intel i3</SelectItem>
                <SelectItem value="Intel i5">Intel i5</SelectItem>
                <SelectItem value="Intel i7">Intel i7</SelectItem>
                <SelectItem value="Intel i9">Intel i9</SelectItem>
                <SelectItem value="Ryzen 5">Ryzen 5</SelectItem>
                <SelectItem value="Ryzen 7">Ryzen 7</SelectItem>
                <SelectItem value="Ryzen 9">Ryzen 9</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ram_gb">RAM (GB)</Label>
            <Input id="ram_gb" type="number" min={2} max={256} {...register("ram_gb", { valueAsNumber: true })} />
            {errors.ram_gb && <p className="text-destructive text-sm mt-1">{errors.ram_gb.message}</p>}
          </div>
          <div>
            <Label htmlFor="storage_gb">Storage (GB)</Label>
            <Input id="storage_gb" type="number" min={32} max={8192} {...register("storage_gb", { valueAsNumber: true })} />
            {errors.storage_gb && <p className="text-destructive text-sm mt-1">{errors.storage_gb.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-4">
              <Slider min={1} max={5} step={0.1} defaultValue={[rating]} onValueChange={(v) => setValue("rating", v[0])} />
              <span className="text-sm tabular-nums">{rating.toFixed(1)}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="specsText">Or paste specs text</Label>
            <textarea id="specsText" className="mt-1 w-full rounded-md bg-background/60 border px-3 py-2 h-24" placeholder="e.g., 16GB RAM, 1TB SSD, Intel i7" {...register("specsText")} />
            <div className="mt-2">
              <Button type="button" variant="secondary" onClick={applySpecsText}>Parse from text</Button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Predicting..." : "Predict Price"}</Button>
          <Button type="button" variant="outline" onClick={async () => {
            const r = await fetch("/api/sample-data");
            const j = await r.json();
            alert(`Fetched ${j.count} laptop items from public API: ${j.source}`);
          }}>Fetch Sample Data</Button>
        </div>
      </form>

      <div className="bg-gradient-to-b from-primary/10 to-transparent border border-white/20 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-semibold">Prediction</h3>
        {!result && <p className="text-muted-foreground mt-3">Submit details to see predicted price and model internals.</p>}
        {result && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Price</p>
              <p className="text-4xl font-extrabold tracking-tight">{"$" + result.predicted_price.toFixed(0)}</p>
            </div>
            {result.anomaly.is_anomalous && (
              <div className="rounded-md border border-yellow-300/40 bg-yellow-100/40 dark:bg-yellow-900/20 p-3">
                <p className="font-medium">Anomalous prediction</p>
                <p className="text-sm mt-1">Expected range ${'{'}result.anomaly.bounds.lower.toFixed(0){'}'}–${'{'}result.anomaly.bounds.upper.toFixed(0){'}'}</p>
                {result.anomaly.explanation && <p className="text-sm mt-2">{result.anomaly.explanation}</p>}
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Model details</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {result.model.feature_order.map((f, i) => (
                  <div key={f} className="flex items-center justify-between rounded border px-2 py-1">
                    <span className="text-muted-foreground">{f}</span>
                    <span className="tabular-nums">{result.model.coefficients[i]}</span>
                  </div>
                ))}
              </div>
              {result.llm_debug && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <p className="font-medium">LLM debug</p>
                  <pre className="mt-1 p-2 rounded bg-background/50 text-xs">{result.llm_debug}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
