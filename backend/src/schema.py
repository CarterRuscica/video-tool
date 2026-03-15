"""Generated from shared/schema.json — do not edit manually."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection(BaseModel):
    class_name: str
    confidence: float = Field(ge=0, le=1)
    bbox: BBox
    frame_index: int
    timestamp: float


class TimedEvent(BaseModel):
    id: str
    label: str
    class_name: str
    start_time: float
    end_time: float
    start_frame: int
    end_frame: int
    color: str | None = None
    avg_confidence: float | None = None


class TelemetryPoint(BaseModel):
    timestamp: float
    values: dict[str, float]


class Sequence(BaseModel):
    id: str
    label: str
    source_video: str
    in_point: float
    out_point: float
    in_frame: int
    out_frame: int


class RenderList(BaseModel):
    id: str
    name: str
    sequences: list[Sequence]
    total_duration: float


class SpatialTemporalManifest(BaseModel):
    video_path: str
    model_id: str
    fps: float
    total_frames: int
    duration: float
    events: list[TimedEvent]
    detections_file: str
