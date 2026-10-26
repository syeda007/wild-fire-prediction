export interface Hotspot {
  lat: number;
  lon: number;
  brightness_ti4?: number;
  brightness_ti5?: number;
  frp: number | null;
  confidence: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  daynight: string;
  data_type?: string;
}

export interface LiveFirmsResponse {
  success: boolean;
  region_name: string;
  center: [number, number];
  zoom: number;
  source: string;
  day_range: number;
  count: number;
  hotspots: Hotspot[];
  summary: {
    total_detections: number;
    mean_frp: number;
    max_frp: number;
    confidence_breakdown: {
      nominal: number;
      low: number;
      high: number;
    };
    last_updated: string;
  };
  cached?: boolean;
  cached_seconds_ago?: number;
  error?: string;
  disclaimer: string;
}

export interface HistoricalMetadata {
  available: boolean;
  loading?: boolean;
  filename?: string;
  study_case: string;
  dataset_source: string;
  total_records: number;
  start_date?: string;
  end_date?: string;
  distinct_dates?: string[];
  center?: [number, number];
  default_zoom?: number;
  disclaimer?: string;
  instructions?: string;
}

export interface HistoricalObservationsResponse {
  target_date: string;
  cumulative: boolean;
  region_filter?: string;
  total_detections_in_period: number;
  displayed_count: number;
  hotspots: Hotspot[];
  loading?: boolean;
}

export interface TimelineDay {
  date: string;
  daily_count: number;
  cumulative_count: number;
  avg_frp: number;
  max_frp: number;
  total_frp: number;
}

export interface HistoricalTrendsResponse {
  available: boolean;
  total_days: number;
  timeline: TimelineDay[];
  peak_day?: string;
  peak_count?: number;
  loading?: boolean;
}

export interface PredictionResponse {
  success: boolean;
  prediction?: {
    class_name: string;
    is_wildfire: boolean;
    fire_probability: number;
    reference_probability: number;
    confidence_percentage: number;
    optimal_threshold: number;
    inference_latency_ms: number;
  };
  explainability?: {
    method: string;
    target_layer: string;
    interpretation: string;
  };
  images?: {
    original: string;
    gradcam_blended: string;
    gradcam_heatmap: string;
  };
  methodological_disclaimer?: string;
  error?: string;
}

export interface MetricsTableRow {
  metric: string;
  baseline_cnn: string;
  mobilenet_v2: string;
  delta: string;
}

export interface TrainingCurvePoint {
  epoch: string;
  mobilenet_train_loss: number | null;
  mobilenet_val_loss: number | null;
  baseline_train_loss: number | null;
  baseline_val_loss: number | null;
  mobilenet_val_acc: number | null;
  baseline_val_acc: number | null;
}

export interface ModelEvaluationResponse {
  available: boolean;
  dataset_metadata?: {
    source: string;
    classes: string[];
    total_images: number;
    train_samples_used: number;
    val_samples_used: number;
    test_samples_used: number;
    image_resolution: string;
    semantic_definition: string;
  };
  training_timestamp?: string;
  hyperparameters?: Record<string, any>;
  metrics_table: MetricsTableRow[];
  confusion_matrices: {
    baseline_cnn: {
      matrix: number[][];
      labels: string[];
    };
    mobilenet_v2: {
      matrix: number[][];
      labels: string[];
    };
  };
  training_curves: TrainingCurvePoint[];
  error?: string;
}
