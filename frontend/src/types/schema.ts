// Generated from shared/schema.json — do not edit manually

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  class_name: string;
  confidence: number;
  bbox: BBox;
  frame_index: number;
  timestamp: number;
}

export interface TimedEvent {
  id: string;
  label: string;
  class_name: string;
  start_time: number;
  end_time: number;
  start_frame: number;
  end_frame: number;
  color?: string;
  avg_confidence?: number;
}

export interface TelemetryPoint {
  timestamp: number;
  values: Record<string, number>;
}

export interface Sequence {
  id: string;
  label: string;
  source_video: string;
  in_point: number;
  out_point: number;
  in_frame: number;
  out_frame: number;
}

export interface RenderList {
  id: string;
  name: string;
  sequences: Sequence[];
  total_duration: number;
}

export interface SpatialTemporalManifest {
  video_path: string;
  model_id: string;
  fps: number;
  total_frames: number;
  duration: number;
  events: TimedEvent[];
  detections_file: string;
}
