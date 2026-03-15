"""Roboflow inference pipeline worker.

Runs a full pre-computation pass over a video, producing:
- A SpatialTemporalManifest with collapsed event spans
- A JSONL file with per-frame detection data
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

from .schema import (
    BBox,
    Detection,
    SpatialTemporalManifest,
    TimedEvent,
)


class InferenceWorker:
    """Wraps Roboflow InferencePipeline for video analysis."""

    def __init__(self) -> None:
        self._pipeline = None

    async def run(
        self,
        video_path: str,
        model_id: str,
        output_dir: str,
    ) -> SpatialTemporalManifest:
        """Run inference on the entire video and produce manifest + JSONL."""
        output_dir_path = Path(output_dir)
        output_dir_path.mkdir(parents=True, exist_ok=True)

        detections_path = output_dir_path / "frame-detections.jsonl"
        manifest_path = output_dir_path / "spatial-temporal.json"

        # Collect per-frame detections
        all_detections: list[Detection] = []
        fps = 30.0  # Will be updated from video metadata
        total_frames = 0

        try:
            from inference import InferencePipeline

            def on_prediction(predictions: dict, video_frame: any) -> None:
                nonlocal total_frames, fps
                frame_idx = video_frame.frame_id
                frame_ts = video_frame.frame_timestamp
                total_frames = max(total_frames, frame_idx + 1)

                if hasattr(video_frame, "fps") and video_frame.fps:
                    fps = video_frame.fps

                for pred in predictions.get("predictions", []):
                    det = Detection(
                        class_name=pred["class"],
                        confidence=pred["confidence"],
                        bbox=BBox(
                            x=pred["x"] - pred["width"] / 2,
                            y=pred["y"] - pred["height"] / 2,
                            width=pred["width"],
                            height=pred["height"],
                        ),
                        frame_index=frame_idx,
                        timestamp=frame_ts,
                    )
                    all_detections.append(det)

            pipeline = InferencePipeline.init(
                model_id=model_id,
                video_reference=video_path,
                on_prediction=on_prediction,
            )
            pipeline.start()
            pipeline.join()

        except ImportError:
            # Fallback: no inference SDK available, return empty manifest
            import subprocess
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", video_path],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                probe = json.loads(result.stdout)
                for stream in probe.get("streams", []):
                    if stream.get("codec_type") == "video":
                        r_fps = stream.get("r_frame_rate", "30/1")
                        num, den = r_fps.split("/")
                        fps = float(num) / float(den)
                        total_frames = int(stream.get("nb_frames", 0))
                        break

        # Write per-frame detections JSONL
        with open(detections_path, "w") as f:
            for det in all_detections:
                f.write(det.model_dump_json() + "\n")

        # Collapse detections into temporal event spans
        events = self._collapse_events(all_detections, fps)
        duration = total_frames / fps if fps > 0 else 0.0

        manifest = SpatialTemporalManifest(
            video_path=video_path,
            model_id=model_id,
            fps=fps,
            total_frames=total_frames,
            duration=duration,
            events=events,
            detections_file=str(detections_path),
        )

        with open(manifest_path, "w") as f:
            f.write(manifest.model_dump_json(indent=2))

        return manifest

    @staticmethod
    def _collapse_events(
        detections: list[Detection],
        fps: float,
        gap_threshold_frames: int = 5,
    ) -> list[TimedEvent]:
        """Collapse per-frame detections into contiguous event spans.

        If the same class is detected in consecutive frames (within gap_threshold),
        they are merged into a single TimedEvent.
        """
        if not detections:
            return []

        # Group by class
        by_class: dict[str, list[Detection]] = {}
        for det in detections:
            by_class.setdefault(det.class_name, []).append(det)

        events: list[TimedEvent] = []
        colors = [
            "#e94560", "#0f3460", "#16c79a", "#f5a623",
            "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
        ]

        for idx, (class_name, dets) in enumerate(by_class.items()):
            sorted_dets = sorted(dets, key=lambda d: d.frame_index)
            spans: list[list[Detection]] = []
            current_span: list[Detection] = [sorted_dets[0]]

            for det in sorted_dets[1:]:
                if det.frame_index - current_span[-1].frame_index <= gap_threshold_frames:
                    current_span.append(det)
                else:
                    spans.append(current_span)
                    current_span = [det]
            spans.append(current_span)

            color = colors[idx % len(colors)]
            for span in spans:
                avg_conf = sum(d.confidence for d in span) / len(span)
                events.append(TimedEvent(
                    id=str(uuid.uuid4()),
                    label=f"{class_name} ({len(span)} frames)",
                    class_name=class_name,
                    start_time=span[0].timestamp,
                    end_time=span[-1].timestamp,
                    start_frame=span[0].frame_index,
                    end_frame=span[-1].frame_index,
                    color=color,
                    avg_confidence=round(avg_conf, 3),
                ))

        return sorted(events, key=lambda e: e.start_time)
