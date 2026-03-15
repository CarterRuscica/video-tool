import { useCallback, useEffect, useState } from "react";
import { useClockStore } from "../stores/clockStore";
import { Sequence } from "../types/schema";

interface Props {
  sequences: Sequence[];
  onAdd: (seq: Sequence) => void;
  onRemove: (id: string) => void;
  onReorder: (reordered: Sequence[]) => void;
}

export function SequenceBin({ sequences, onAdd, onRemove, onReorder }: Props) {
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const currentTime = useClockStore((s) => s.currentTime);
  const fps = useClockStore((s) => s.fps);
  const seek = useClockStore((s) => s.seek);

  // Keyboard shortcuts: 'i' for in point, 'o' for out point
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "i") {
        setInPoint(currentTime);
      } else if (e.key === "o" && inPoint !== null) {
        const outTime = currentTime;
        if (outTime > inPoint) {
          onAdd({
            id: crypto.randomUUID(),
            label: `Clip ${sequences.length + 1}`,
            source_video: "",
            in_point: inPoint,
            out_point: outTime,
            in_frame: Math.round(inPoint * fps),
            out_frame: Math.round(outTime * fps),
          });
          setInPoint(null);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentTime, inPoint, fps, sequences.length, onAdd]);

  const totalDuration = sequences.reduce(
    (sum, s) => sum + (s.out_point - s.in_point),
    0,
  );

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDrop = useCallback(
    (targetIdx: number) => {
      if (dragIdx === null || dragIdx === targetIdx) return;
      const reordered = [...sequences];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      onReorder(reordered);
      setDragIdx(null);
    },
    [dragIdx, sequences, onReorder],
  );

  return (
    <div className="sequence-bin">
      <div className="sequence-bin-header">
        <span>
          Sequence Bin ({sequences.length} clips, {totalDuration.toFixed(1)}s)
        </span>
        {inPoint !== null && (
          <span style={{ color: "var(--accent)" }}>
            IN: {inPoint.toFixed(2)}s — press O to set out point
          </span>
        )}
      </div>
      <div className="sequence-list">
        {sequences.map((seq, idx) => (
          <div
            key={seq.id}
            className="sequence-block"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            onClick={() => seek(seq.in_point)}
          >
            <span className="label">{seq.label}</span>
            <span className="times">
              {seq.in_point.toFixed(2)}s → {seq.out_point.toFixed(2)}s
            </span>
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 10,
                padding: 0,
                alignSelf: "flex-end",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(seq.id);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        {sequences.length === 0 && (
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
            }}
          >
            Press I/O to set in/out points, or drag events here
          </div>
        )}
      </div>
    </div>
  );
}
