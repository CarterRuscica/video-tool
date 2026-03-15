import { useCallback } from "react";
import { useClockStore } from "../stores/clockStore";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

export function MasterClock() {
  const currentTime = useClockStore((s) => s.currentTime);
  const duration = useClockStore((s) => s.duration);
  const playing = useClockStore((s) => s.playing);
  const seek = useClockStore((s) => s.seek);
  const setPlaying = useClockStore((s) => s.setPlaying);
  const playbackRate = useClockStore((s) => s.playbackRate);
  const setPlaybackRate = useClockStore((s) => s.setPlaybackRate);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      seek(parseFloat(e.target.value));
    },
    [seek],
  );

  const cycleRate = useCallback(() => {
    const rates = [0.25, 0.5, 1, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
  }, [playbackRate, setPlaybackRate]);

  return (
    <div className="master-clock">
      <button onClick={() => setPlaying(!playing)}>
        {playing ? "Pause" : "Play"}
      </button>
      <span className="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <input
        className="scrubber"
        type="range"
        min={0}
        max={duration || 1}
        step={0.01}
        value={currentTime}
        onChange={handleScrub}
      />
      <button onClick={cycleRate}>{playbackRate}x</button>
    </div>
  );
}
