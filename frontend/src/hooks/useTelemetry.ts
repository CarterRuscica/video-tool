import { useState, useCallback } from "react";
import { TelemetryPoint } from "../types/schema";

/**
 * Hook for loading and managing telemetry data.
 */
export function useTelemetry() {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFromFile = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("send_rpc", {
        method: "load_telemetry",
        params: { path },
      });
      // Results come back via sidecar-stdout event
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFromArray = useCallback((points: TelemetryPoint[]) => {
    setData(points);
    if (points.length > 0) {
      setChannels(Object.keys(points[0].values));
    }
  }, []);

  return { data, channels, isLoading, loadFromFile, loadFromArray };
}
