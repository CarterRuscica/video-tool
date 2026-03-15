use tauri::AppHandle;

#[tauri::command]
pub async fn render_sequence(
    app: AppHandle,
    render_list_path: String,
    output_path: String,
    reencode: bool,
) -> Result<String, String> {
    // Delegates to sidecar which handles ffmpeg
    let params = serde_json::json!({
        "render_list_path": render_list_path,
        "output_path": output_path,
        "reencode": reencode,
    });

    super::sidecar::send_rpc(app, "render".to_string(), params).await?;
    Ok("Render started".to_string())
}
