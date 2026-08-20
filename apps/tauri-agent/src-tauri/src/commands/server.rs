use tauri::Window;
use std::path::PathBuf;
use crate::config::{Server, ServerStatus, add_server, remove_server, get_all_servers};
use uuid::Uuid;
use std::fs;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ServerDirInspection {
    pub path: String,
    pub exists: bool,
    pub has_server_cfg: bool,
    pub has_resources_folder: bool,
    pub framework_hint: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn open_folder_cmd(window: Window) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let dialog = window.dialog();
    let builder = dialog.file();
    
    let path = builder.blocking_pick_folder();
    
    match path {
        Some(p) => {
            let path_buf = p.into_path().map_err(|e| e.to_string())?;
            Ok(path_buf.to_string_lossy().to_string())
        },
        None => Ok("".to_string()),
    }
}

#[tauri::command]
pub fn inspect_server_dir(path: String) -> Result<ServerDirInspection, String> {
    let path_buf = PathBuf::from(&path);
    let exists = path_buf.exists();

    if !exists {
        return Ok(ServerDirInspection {
            path,
            exists: false,
            has_server_cfg: false,
            has_resources_folder: false,
            framework_hint: None,
            error: Some("Directory does not exist".to_string()),
        });
    }

    if !path_buf.is_dir() {
        return Ok(ServerDirInspection {
            path,
            exists: true,
            has_server_cfg: false,
            has_resources_folder: false,
            framework_hint: None,
            error: Some("Path is not a directory".to_string()),
        });
    }

    let has_server_cfg = path_buf.join("server.cfg").exists();
    let has_resources = path_buf.join("resources").is_dir();

    // Try to detect framework from server.cfg
    let framework_hint = if has_server_cfg {
        if let Ok(content) = fs::read_to_string(path_buf.join("server.cfg")) {
            if content.contains("ensure qb-core") || content.contains("qb-core") {
                Some("QBCore".to_string())
            } else if content.contains("es_extended") || content.contains("ensure es_extended") {
                Some("ESX".to_string())
            } else if content.contains("qbx_core") || content.contains("ensure qbx_core") {
                Some("QBox".to_string())
            } else if content.contains("ox_core") || content.contains("ensure ox_core") {
                Some("OX".to_string())
            } else {
                Some("Unknown".to_string())
            }
        } else {
            None
        }
    } else {
        None
    };

    let error = if !has_server_cfg {
        Some("server.cfg not found — this doesn't look like a valid FiveM server-data folder".to_string())
    } else if !has_resources {
        Some("server.cfg found but resources/ folder not found".to_string())
    } else {
        None
    };

    Ok(ServerDirInspection {
        path,
        exists: true,
        has_server_cfg,
        has_resources_folder: has_resources,
        framework_hint,
        error,
    })
}

#[tauri::command]
pub fn create_server_cmd(
    name: String,
    directory: Option<String>,
) -> Result<serde_json::Value, String> {
    let server_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    
    let server = Server {
        id: server_id.clone(),
        name: name.clone(),
        directory: PathBuf::from(directory.clone().unwrap_or_default()),
        framework: "fxserver".to_string(),
        status: ServerStatus::Offline,
        last_seen: Some(now),
    };
    
    add_server(server.clone());
    
    Ok(serde_json::json!({
        "id": server_id,
        "name": name,
        "directory": directory.unwrap_or_default(),
        "status": "offline",
        "pairingCode": "DIRECT"
    }))
}

#[tauri::command]
pub fn get_servers_cmd() -> Result<Vec<Server>, String> {
    Ok(get_all_servers())
}

#[tauri::command]
pub fn remove_server_cmd(server_id: String) -> Result<(), String> {
    remove_server(&server_id);
    Ok(())
}

#[tauri::command]
pub fn scan_resources_cmd(directory: String) -> Result<Vec<FileInfo>, String> {
    let mut files = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&directory) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(metadata) = fs::metadata(&path) {
                files.push(FileInfo {
                    path: path.to_string_lossy().to_string(),
                    name: entry.file_name().to_string_lossy().to_string(),
                    is_dir: metadata.is_dir(),
                    size: metadata.len(),
                });
            }
        }
    }
    
    Ok(files)
}
