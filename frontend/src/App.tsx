import { useState, useCallback, useEffect } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { TelemetryChart } from "./components/TelemetryChart";
import { EventTrack } from "./components/EventTrack";
import { SequenceBin } from "./components/SequenceBin";
import { MasterClock } from "./components/MasterClock";
import { useClockStore } from "./stores/clockStore";
import { TelemetryPoint, TimedEvent, Sequence } from "./types/schema";

export default function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [events, setEvents] = useState<TimedEvent[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const seek = useClockStore((s) => s.seek);

  // Listen for sidecar events to populate data
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const unlisten = await listen<string>("sidecar-stdout", (event) => {
          try {
            const msg = JSON.parse(event.payload);
            if (msg.result?.events) {
              setEvents(msg.result.events);
            }
            if (msg.result?.telemetry) {
              setTelemetry(msg.result.telemetry);
            }
            if (msg.result?.video_path) {
              setVideoSrc(msg.result.video_path);
            }
          } catch {
            // Non-JSON output
          }
        });

        cleanup = unlisten;
      } catch {
        // Not running in Tauri context
      }
    })();

    return () => cleanup?.();
  }, []);

  const handleAddSequence = useCallback((seq: Sequence) => {
    setSequences((prev) => [...prev, seq]);
  }, []);

  const handleRemoveSequence = useCallback((id: string) => {
    setSequences((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleReorderSequences = useCallback((reordered: Sequence[]) => {
    setSequences(reordered);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Analysis</h1>
      </header>
      <main className="app-main">
        <div className="top-panel">
          <VideoPlayer src={videoSrc} events={events} />
        </div>
        <div className="middle-panel">
          <TelemetryChart data={telemetry} />
          <EventTrack events={events} onSeek={seek} />
          <MasterClock />
        </div>
        <div className="bottom-panel">
          <SequenceBin
            sequences={sequences}
            onAdd={handleAddSequence}
            onRemove={handleRemoveSequence}
            onReorder={handleReorderSequences}
          />
        </div>
      </main>
    </div>
  );
}
