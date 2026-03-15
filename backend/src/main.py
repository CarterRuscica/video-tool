"""JSON-RPC sidecar process for video analysis.

Communicates via stdin/stdout JSON lines when run as a sidecar,
or optionally via WebSocket when --mode=server (for Docker dev).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any

from .inference_worker import InferenceWorker
from .ffmpeg_render import render_sequence
from .telemetry import load_telemetry


class JsonRpcHandler:
    """Dispatch JSON-RPC requests to the appropriate handler."""

    def __init__(self) -> None:
        self.inference_worker = InferenceWorker()
        self.methods: dict[str, Any] = {
            "run_inference": self._run_inference,
            "load_telemetry": self._load_telemetry,
            "render": self._render,
            "ping": self._ping,
        }

    async def handle(self, request: dict) -> dict:
        method = request.get("method", "")
        params = request.get("params", {})
        req_id = request.get("id")

        handler = self.methods.get(method)
        if handler is None:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"},
            }

        try:
            result = await handler(params)
            return {"jsonrpc": "2.0", "id": req_id, "result": result}
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": str(e)},
            }

    async def _run_inference(self, params: dict) -> dict:
        video_path = params["video_path"]
        model_id = params["model_id"]
        output_dir = params.get("output_dir", ".")
        manifest = await self.inference_worker.run(video_path, model_id, output_dir)
        return manifest.model_dump()

    async def _load_telemetry(self, params: dict) -> list[dict]:
        path = params["path"]
        points = load_telemetry(path)
        return [p.model_dump() for p in points]

    async def _render(self, params: dict) -> dict:
        render_list_path = params["render_list_path"]
        output_path = params["output_path"]
        reencode = params.get("reencode", False)
        await render_sequence(render_list_path, output_path, reencode)
        return {"status": "complete", "output_path": output_path}

    async def _ping(self, _params: dict) -> str:
        return "pong"


def _send(data: dict) -> None:
    """Write a JSON line to stdout."""
    sys.stdout.write(json.dumps(data) + "\n")
    sys.stdout.flush()


async def _run_stdio(handler: JsonRpcHandler) -> None:
    """Main loop: read JSON-RPC from stdin, write responses to stdout."""
    loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        try:
            request = json.loads(line.decode().strip())
        except json.JSONDecodeError:
            continue

        response = await handler.handle(request)
        _send(response)


async def _run_websocket(handler: JsonRpcHandler, port: int) -> None:
    """WebSocket server mode for Docker development."""
    try:
        import websockets
    except ImportError:
        print("websockets package required for server mode", file=sys.stderr)
        sys.exit(1)

    async def ws_handler(websocket: Any) -> None:
        async for message in websocket:
            try:
                request = json.loads(message)
            except json.JSONDecodeError:
                continue
            response = await handler.handle(request)
            await websocket.send(json.dumps(response))

    async with websockets.serve(ws_handler, "0.0.0.0", port):
        print(f"WebSocket server running on port {port}", file=sys.stderr)
        await asyncio.Future()  # run forever


def main() -> None:
    parser = argparse.ArgumentParser(description="Video Analysis Sidecar")
    parser.add_argument("--mode", choices=["sidecar", "server"], default="sidecar")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    handler = JsonRpcHandler()

    if args.mode == "server":
        asyncio.run(_run_websocket(handler, args.port))
    else:
        asyncio.run(_run_stdio(handler))


if __name__ == "__main__":
    main()
