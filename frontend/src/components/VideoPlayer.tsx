import { useRef, useEffect, useCallback } from "react";
import { useClockStore } from "../stores/clockStore";
import { useMasterClock } from "../hooks/useMasterClock";
import { TimedEvent, Detection } from "../types/schema";

interface Props {
  src: string | null;
  events: TimedEvent[];
  detections?: Detection[];
}

export function VideoPlayer({ src, events, detections = [] }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentTime = useClockStore((s) => s.currentTime);
  const playing = useClockStore((s) => s.playing);
  const setDuration = useClockStore((s) => s.setDuration);
  const setPlaying = useClockStore((s) => s.setPlaying);
  const setFps = useClockStore((s) => s.setFps);
  const playbackRate = useClockStore((s) => s.playbackRate);

  // rAF-based 60Hz polling instead of timeupdate (~4Hz)
  useMasterClock(videoRef);

  // Sync play/pause state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (playing) {
      video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [playing, src, setPlaying]);

  // Sync playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate]);

  // Handle external seek
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime;
    }
  }, [currentTime, src]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setFps(30);
  }, [setDuration, setFps]);

  // Draw bounding box overlays for active detections
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Show active event labels
    const activeEvents = events.filter(
      (e) => currentTime >= e.start_time && currentTime <= e.end_time,
    );
    for (let i = 0; i < activeEvents.length; i++) {
      ctx.fillStyle = activeEvents[i].color ?? "#e94560";
      ctx.font = "bold 14px monospace";
      ctx.fillText(activeEvents[i].label, 8, 20 + i * 20);
    }

    const fps = useClockStore.getState().fps;
    const currentFrame = Math.round(currentTime * fps);
    const frameDetections = detections.filter(
      (d) => d.frame_index === currentFrame,
    );

    for (const det of frameDetections) {
      const scaleX = canvas.width / (video.videoWidth || canvas.width);
      const scaleY = canvas.height / (video.videoHeight || canvas.height);

      ctx.strokeStyle = "#e94560";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        det.bbox.x * scaleX,
        det.bbox.y * scaleY,
        det.bbox.width * scaleX,
        det.bbox.height * scaleY,
      );

      ctx.fillStyle = "#e94560";
      ctx.font = "12px monospace";
      ctx.fillText(
        `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`,
        det.bbox.x * scaleX,
        det.bbox.y * scaleY - 4,
      );
    }
  }, [currentTime, events, detections]);

  return (
    <div className="video-container">
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlaying(false)}
            onClick={() => setPlaying(!playing)}
          />
          <canvas ref={canvasRef} className="video-overlay" />
        </>
      ) : (
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          No video loaded
        </div>
      )}
    </div>
  );
}
