use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::{ShellExt, process::CommandChild};

pub struct SidecarState {
    child: Mutex<Option<CommandChild>>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_sidecar(app: AppHandle) -> Result<String, String> {
    let shell = app.shell();
    let (mut rx, child) = shell
        .sidecar("video-analysis-sidecar")
        .map_err(|e| e.to_string())?
        .args(&["--mode", "sidecar"])
        .spawn()
        .map_err(|e| e.to_string())?;

    // Store child for later communication
    let state = app.state::<SidecarState>();
    *state.child.lock().unwrap() = Some(child);

    // Spawn a task to relay stdout events
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    let _ = app_handle.emit("sidecar-stdout", line_str.to_string());
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    let _ = app_handle.emit("sidecar-stderr", line_str.to_string());
                }
                CommandEvent::Terminated(status) => {
                    let _ = app_handle.emit("sidecar-terminated", format!("{:?}", status));
                    break;
                }
                _ => {}
            }
        }
    });

    Ok("Sidecar started".to_string())
}

#[tauri::command]
pub async fn send_rpc(app: AppHandle, method: String, params: serde_json::Value) -> Result<(), String> {
    let state = app.state::<SidecarState>();
    let mut guard = state.child.lock().unwrap();
    if let Some(child) = guard.as_mut() {
        let rpc = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        });
        let msg = format!("{}\n", rpc);
        child.write(msg.as_bytes()).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Sidecar not running".to_string())
    }
}

#[tauri::command]
pub async fn stop_sidecar(app: AppHandle) -> Result<(), String> {
    let state = app.state::<SidecarState>();
    let mut guard = state.child.lock().unwrap();
    if let Some(child) = guard.take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
