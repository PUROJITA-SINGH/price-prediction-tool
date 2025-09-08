/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

export interface DemoResponse {
  message: string;
}

export interface PredictRequest {
  brand?: string;
  ram_gb?: number;
  storage_gb?: number;
  cpu?: string;
  cpu_level?: number;
  brand_score?: number;
  rating?: number; // 1-5
  specsText?: string; // free-form text to parse
}

export interface PredictResponse {
  input: {
    brand?: string;
    ram_gb: number;
    storage_gb: number;
    cpu?: string;
    cpu_level: number;
    rating: number;
  };
  predicted_price: number;
  anomaly: {
    is_anomalous: boolean;
    bounds: { lower: number; upper: number };
    explanation?: string;
  };
  llm_debug?: string;
  model: {
    feature_order: string[];
    coefficients: number[];
    intercept: number;
    scaler: { means: number[]; stds: number[] };
    y_stats: { mean: number; std: number; min: number; max: number };
  };
}
