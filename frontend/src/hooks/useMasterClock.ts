import { useEffect, useRef } from "react";
import { useClockStore } from "../stores/clockStore";

/**
 * Drives the master clock via requestAnimationFrame, polling the video
 * element at ~60Hz for smooth sync (vs browser timeupdate at ~4Hz).
 */
export function useMasterClock(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const rafId = useRef<number>(0);
  const tick = useClockStore((s) => s.tick);
  const playing = useClockStore((s) => s.playing);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const loop = () => {
      if (video && !video.paused) {
        tick(video.currentTime);
      }
      rafId.current = requestAnimationFrame(loop);
    };

    if (playing) {
      rafId.current = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, [videoRef, playing, tick]);
}
