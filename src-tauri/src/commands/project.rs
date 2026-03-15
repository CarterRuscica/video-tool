use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectData {
    pub video_path: Option<String>,
    pub telemetry_path: Option<String>,
    pub sequences: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn open_project(path: String) -> Result<ProjectData, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let project: ProjectData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn save_project(path: String, data: ProjectData) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}
