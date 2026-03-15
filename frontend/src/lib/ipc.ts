/**
 * IPC utilities for Tauri command invocation with type safety.
 */

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

let _invoke: InvokeFn | null = null;

async function getInvoke(): Promise<InvokeFn> {
  if (!_invoke) {
    const { invoke } = await import("@tauri-apps/api/core");
    _invoke = invoke;
  }
  return _invoke;
}

export async function startSidecar(): Promise<string> {
  const invoke = await getInvoke();
  return invoke("start_sidecar") as Promise<string>;
}

export async function stopSidecar(): Promise<void> {
  const invoke = await getInvoke();
  await invoke("stop_sidecar");
}

export async function sendRpc(
  method: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  const invoke = await getInvoke();
  await invoke("send_rpc", { method, params });
}

export async function startInference(
  videoPath: string,
  modelId: string,
  outputDir?: string,
): Promise<void> {
  await sendRpc("run_inference", {
    video_path: videoPath,
    model_id: modelId,
    output_dir: outputDir ?? ".",
  });
}

export async function renderSequence(
  renderListPath: string,
  outputPath: string,
  reencode: boolean = false,
): Promise<string> {
  const invoke = await getInvoke();
  return invoke("render_sequence", {
    renderListPath,
    outputPath,
    reencode,
  }) as Promise<string>;
}

export async function openProject(path: string): Promise<unknown> {
  const invoke = await getInvoke();
  return invoke("open_project", { path });
}

export async function saveProject(
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  const invoke = await getInvoke();
  await invoke("save_project", { path, data });
}
