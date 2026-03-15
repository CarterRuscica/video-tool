mod commands;

use commands::{sidecar, ffmpeg, project};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(sidecar::SidecarState::default())
        .invoke_handler(tauri::generate_handler![
            sidecar::start_sidecar,
            sidecar::send_rpc,
            sidecar::stop_sidecar,
            project::open_project,
            project::save_project,
            ffmpeg::render_sequence,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
