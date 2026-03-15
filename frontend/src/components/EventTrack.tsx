import { useMemo } from "react";
import { useClockStore } from "../stores/clockStore";
import { TimedEvent } from "../types/schema";

interface Props {
  events: TimedEvent[];
  onSeek: (time: number) => void;
}

export function EventTrack({ events, onSeek }: Props) {
  const duration = useClockStore((s) => s.duration);
  const currentTime = useClockStore((s) => s.currentTime);

  const blocks = useMemo(() => {
    if (duration === 0) return [];
    return events.map((event) => ({
      event,
      left: `${(event.start_time / duration) * 100}%`,
      width: `${((event.end_time - event.start_time) / duration) * 100}%`,
    }));
  }, [events, duration]);

  return (
    <div className="event-track">
      {duration > 0 && (
        <div
          className="playhead"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      )}
      {blocks.map(({ event, left, width }) => {
        const isActive =
          currentTime >= event.start_time && currentTime <= event.end_time;
        return (
          <div
            key={event.id}
            className="event-block"
            style={{
              left,
              width,
              backgroundColor: event.color ?? "#e94560",
              opacity: isActive ? 1 : 0.7,
              border: isActive ? "1px solid #fff" : "none",
            }}
            onClick={() => onSeek(event.start_time)}
            title={`${event.label} (${event.start_time.toFixed(1)}s - ${event.end_time.toFixed(1)}s)`}
          >
            {event.label}
          </div>
        );
      })}
      {events.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "var(--text-secondary)",
            fontSize: 11,
          }}
        >
          No events — run inference to detect
        </div>
      )}
    </div>
  );
}
