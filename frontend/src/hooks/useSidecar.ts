import { useEffect, useRef, useCallback, useState } from "react";

interface SidecarMessage {
  jsonrpc: string;
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Hook for managing the Python sidecar lifecycle and communication.
 */
export function useSidecar() {
  const [isRunning, setIsRunning] = useState(false);
  const listenersRef = useRef<Array<() => void>>([]);

  const start = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("start_sidecar");
      setIsRunning(true);
    } catch (e) {
      console.error("Failed to start sidecar:", e);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("stop_sidecar");
      setIsRunning(false);
    } catch (e) {
      console.error("Failed to stop sidecar:", e);
    }
  }, []);

  const sendRpc = useCallback(
    async (method: string, params: Record<string, unknown> = {}) => {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("send_rpc", { method, params });
    },
    [],
  );

  const onMessage = useCallback((handler: (msg: SidecarMessage) => void) => {
    let cleanup: (() => void) | null = null;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen<string>("sidecar-stdout", (event) => {
        try {
          const msg: SidecarMessage = JSON.parse(event.payload);
          handler(msg);
        } catch {
          // Non-JSON output, ignore
        }
      });
      cleanup = unlisten;
      listenersRef.current.push(unlisten);
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((fn) => fn());
    };
  }, []);

  return { isRunning, start, stop, sendRpc, onMessage };
}
