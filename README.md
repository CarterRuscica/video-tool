# Video Analysis

Cross-platform desktop app that synchronizes time-series telemetry data with video playback, performs automated event detection via Roboflow CV, and supports non-destructive sequence editing.

## Architecture

| Layer | Tech | Role |
|-------|------|------|
| Frontend | React + TypeScript (Vite) | UI: video player, telemetry chart, event timeline, sequence bin |
| Desktop shell | Tauri 2 (Rust) | Window management, IPC bridge, sidecar lifecycle |
| Backend sidecar | Python 3.11+ | Roboflow inference, telemetry parsing, FFmpeg rendering |
| Shared types | JSON Schema | Single source of truth for TypeScript + Pydantic models |

### IPC

| Path | Mechanism |
|------|-----------|
| Frontend → Rust | `invoke()` (Tauri commands) |
| Rust → Frontend | `app.emit()` (Tauri events) |
| Rust → Python | Sidecar stdin (JSON-RPC) |
| Python → Rust | Sidecar stdout (JSON lines) |
| Docker dev | WebSocket on port 8765 |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Python](https://www.python.org/) 3.11+
- [FFmpeg](https://ffmpeg.org/) (for rendering)
- Tauri 2 CLI: `cargo install tauri-cli --version "^2"`

## Getting Started

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..

# Create a Python virtualenv for the backend
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]" && cd ..

# Run the app in development mode
make dev
```

### Docker Development

```bash
# Optionally set your Roboflow API key
export ROBOFLOW_API_KEY=your_key_here

make dev-docker
```

## Project Structure

```
video-analysis/
├── frontend/                     # React + TypeScript (Vite)
│   └── src/
│       ├── components/           # VideoPlayer, TelemetryChart, EventTrack, SequenceBin, MasterClock
│       ├── hooks/                # useMasterClock, useTelemetry, useSidecar
│       ├── stores/clockStore.ts  # Zustand — single source of truth for playback state
│       ├── types/schema.ts       # Generated TypeScript interfaces
│       └── lib/                  # ipc, interpolate, slidingWindow
├── src-tauri/                    # Tauri Rust core
│   └── src/commands/             # sidecar, ffmpeg, project
├── backend/                      # Python sidecar
│   └── src/                      # main (JSON-RPC), inference_worker, telemetry, ffmpeg_render, schema
├── shared/schema.json            # JSON Schema source of truth
├── scripts/                      # Type generation scripts
├── docker-compose.yml
└── Makefile
```

## Key Commands

| Command | Description |
|---------|-------------|
| `make dev` | Launch Tauri app with hot reload |
| `make build` | Production build |
| `make test` | Run all tests (pytest + vitest) |
| `make test-backend` | Run Python tests only |
| `make test-frontend` | Run frontend tests only |
| `make lint` | TypeScript type check + Python linting |
| `make schema` | Regenerate TS/Pydantic types from JSON Schema |

## Usage

1. Load a video file and optionally a CSV/JSON telemetry file
2. Use the scrubber or click the telemetry chart to navigate — video and data stay in sync at 60Hz
3. Run Roboflow inference to detect events — results appear on the event timeline
4. Press **I** to set an in-point, **O** to set an out-point — clips are added to the sequence bin
5. Drag to reorder clips, then render via FFmpeg (stream-copy by default, re-encode for frame-accurate cuts)

## Design Decisions

- **rAF polling at 60Hz** instead of the browser's `timeupdate` event (~4Hz) for smooth sync
- **Canvas-based d3 charts** instead of SVG for performance with large telemetry datasets
- **Sliding window rendering** — only ~2000 data points rendered at a time
- **Pre-computation inference** — full video pass produces a cached manifest, not frame-by-frame streaming
- **Stream-copy default** — FFmpeg `-c copy` for near-instant stitching; re-encode is opt-in
