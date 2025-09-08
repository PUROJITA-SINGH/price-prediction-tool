import { useEffect, useState } from "react";
import { PredictForm } from "@/components/PredictForm";

export default function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,hsl(var(--primary)/0.15),transparent_60%),radial-gradient(800px_400px_at_80%_10%,hsl(var(--accent)/0.2),transparent_40%)]">
      <header className="sticky top-0 z-30 backdrop-blur border-b border-white/10 bg-background/60">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent shadow" />
            <span className="font-bold tracking-tight">Price Sage</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#predict" className="hover:text-foreground">Predict</a>
            <a href="#model" className="hover:text-foreground">Model</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="container py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Predict laptop prices from real-world data
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                We collect live product data, train a regression model in a Jupyter Notebook, and deploy it to this app. Enter specs like RAM, CPU, and storage to get an instant price estimate.
              </p>
              <div className="mt-6 flex gap-3">
                <a href="#predict" className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-4 py-2 font-medium">Try it now</a>
                <a href="#model" className="inline-flex items-center justify-center rounded-md border px-4 py-2 font-medium">View model</a>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border p-3 bg-white/60 dark:bg-white/5">
                  <p className="font-medium">Public API</p>
                  <p className="text-muted-foreground">Fetches laptops from DummyJSON</p>
                </div>
                <div className="rounded-lg border p-3 bg-white/60 dark:bg-white/5">
                  <p className="font-medium">Notebook training</p>
                  <p className="text-muted-foreground">Scikit-learn regression</p>
                </div>
                <div className="rounded-lg border p-3 bg-white/60 dark:bg-white/5">
                  <p className="font-medium">LLM explanations</p>
                  <p className="text-muted-foreground">Optional anomaly insights</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl rounded-3xl" />
              <div className="relative rounded-3xl border bg-background/60 p-6 shadow-2xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Live Model
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Intercept</p>
                    <p className="font-semibold">$800</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Target range</p>
                    <p className="font-semibold">$300–$2500</p>
                  </div>
                  <div className="rounded-md border p-3 col-span-2">
                    <p className="text-muted-foreground">Features</p>
                    <p className="font-semibold">RAM, Storage, CPU level, Brand score, Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="predict" className="container py-12">
          <h2 className="text-2xl font-bold tracking-tight">Predict a price</h2>
          <p className="text-muted-foreground mt-2">Describe your laptop or enter the specs. We return an estimate and flag anomalies with explanations from an LLM when available.</p>
          <div className="mt-8">
            <PredictForm />
          </div>
        </section>

        <section id="model" className="container py-16">
          <h2 className="text-2xl font-bold tracking-tight">Model + Notebook</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 rounded-xl border p-6 bg-white/60 dark:bg-white/5">
              <p className="text-muted-foreground">Training happens in a Jupyter Notebook using a public API for data collection. The trained model (coefficients, scaler, and target stats) is exported to JSON and loaded by the server for real-time predictions.</p>
              <ul className="list-disc pl-6 mt-4 text-sm space-y-2 text-muted-foreground">
                <li>Data source: DummyJSON laptops (public API)</li>
                <li>Features extracted from text: RAM (GB), storage (GB), CPU family, brand score, rating</li>
                <li>Model: StandardScaler + Linear Regression</li>
                <li>Anomaly detection via prediction range vs. training distribution</li>
              </ul>
              <p className="mt-4 text-sm">Find the notebook at <code>notebooks/train_laptop_price.ipynb</code> and the model artifact at <code>server/models/laptop_price_regression.json</code>.</p>
            </div>
            <div className="rounded-xl border p-6 bg-gradient-to-b from-accent/20 to-transparent">
              <p className="font-medium">Pro tip</p>
              <p className="text-muted-foreground mt-2">Set OPENAI_API_KEY to enable LLM-based anomaly explanations. Without it, the app falls back to a concise heuristic explanation.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="container text-sm text-muted-foreground flex items-center justify-between">
          <p>© {new Date().getFullYear()} Price Sage</p>
          <a className="hover:text-foreground" href="#top">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
