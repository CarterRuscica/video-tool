# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Full app (Tauri + Vite hot reload)
make dev

# Docker dev (backend WebSocket mode on :8765)
make dev-docker

# Production build
make build

# Tests
make test                 # all (pytest + vitest)
make test-backend         # cd backend && python -m pytest tests/ -v
make test-frontend        # cd frontend && npx vitest run

# Single test (backend)
cd backend && python -m pytest tests/test_schema.py::test_bbox_creation -v

# Single test (frontend)
cd frontend && npx vitest run src/lib/slidingWindow.test.ts

# Lint
make lint                 # tsc --noEmit + ruff check

# Type checking only
cd frontend && npx tsc --noEmit
cd src-tauri && cargo check

# Regenerate types from shared schema
make schema
```

Backend Python runs in a virtualenv at `backend/.venv`. Activate with `source backend/.venv/bin/activate` before running pytest directly. The `inference` package is optional (heavy dependency); tests and basic sidecar functions work without it.

## Architecture

Three-process desktop app: **React frontend** (Vite) ↔ **Tauri Rust shell** ↔ **Python sidecar** (long-lived).

### IPC Flow

```
Frontend                    Rust (Tauri)                 Python Sidecar
   │                            │                              │
   │── invoke("send_rpc") ─────>│── stdin JSON-RPC ───────────>│
   │                            │                              │
   │<── listen("sidecar-stdout")│<── stdout JSON lines ────────│
   │                            │                              │
   │── invoke("start_sidecar")─>│── Command::sidecar().spawn()─│
```

- `invoke()` = Tauri Commands (frontend→Rust). Defined in `src-tauri/src/commands/`.
- `app.emit()` = Tauri Events (Rust→frontend). Sidecar stdout/stderr relayed as `sidecar-stdout`/`sidecar-stderr` events.
- Sidecar communicates via **JSON-RPC over stdin/stdout** in desktop mode, or **WebSocket :8765** in Docker dev mode (`--mode=server`).
- The sidecar is spawned once at app launch via `SidecarState` (Mutex-wrapped `CommandChild` in `src-tauri/src/commands/sidecar.rs`), not per-request.

### Shared Type System

`shared/schema.json` is the single source of truth. Running `make schema` generates:
- `frontend/src/types/schema.ts` — TypeScript interfaces (via `scripts/generate-ts-types.js`)
- `backend/src/schema.py` — Pydantic models (via `scripts/generate_pydantic.py`)

When modifying data structures, edit `shared/schema.json` first, then regenerate. Do not hand-edit the generated files.

### Clock Synchronization

`frontend/src/stores/clockStore.ts` (Zustand) is the single source of truth for playback state. All components read from it:

- `tick()` — called at 60Hz from `useMasterClock` hook via `requestAnimationFrame` (not `timeupdate` which is ~4Hz)
- `seek()` — called by scrubber, chart click, event click, or sequence click; updates `currentTime` which triggers video element seek

### Rendering Approach

- **TelemetryChart** uses d3 rendering to `<canvas>` (not SVG) for performance with large datasets. A sliding window of ~2000 points is rendered around the current position.
- **VideoPlayer** has a `<canvas>` overlay absolutely positioned over `<video>` for drawing bounding boxes from detection data.

### Sidecar Python Methods

The JSON-RPC handler in `backend/src/main.py` dispatches to: `run_inference`, `load_telemetry`, `render`, `ping`. Inference does a full pre-computation pass over the video (not streaming), writing `frame-detections.jsonl` + `spatial-temporal.json` manifest. FFmpeg render uses `-c copy` by default (stream-copy), with re-encode (`libx264`) as opt-in.

## Key Constraints

- Tauri 2 requires RGBA PNGs for icons in `src-tauri/icons/`. `cargo check` will fail with non-RGBA images.
- Rust sidecar commands use `tauri::Emitter` trait (must be imported) for `app.emit()`.
- New Tauri commands must be registered in `src-tauri/src/lib.rs` `generate_handler![]` and the corresponding module in `src-tauri/src/commands/mod.rs`.
- New sidecar capabilities require entries in `src-tauri/capabilities/default.json`.
- The dev sidecar wrapper at `src-tauri/binaries/video-analysis-sidecar-aarch64-apple-darwin` must be executable and `cd`s into `backend/` before running `python3 -m src.main`.
