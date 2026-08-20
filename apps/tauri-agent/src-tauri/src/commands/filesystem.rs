use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub lines: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Diff {
    pub path: String,
    pub old_content: String,
    pub new_content: String,
    pub additions: Vec<String>,
    pub deletions: Vec<String>,
}

// Filesystem commands
#[tauri::command]
pub fn list_files_cmd(server_directory: String, path: String) -> Result<Vec<FileInfo>, String> {
    let base_path = PathBuf::from(&server_directory);
    let target_path = base_path.join(&path);

    if !target_path.exists() {
        return Err("Path does not exist".to_string());
    }

    let mut files = Vec::new();

    if target_path.is_dir() {
        let entries = fs::read_dir(&target_path)
            .map_err(|e| format!("Failed to read directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;
            let file_path = entry.path();

            files.push(FileInfo {
                name: file_path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
                path: file_path.strip_prefix(&base_path)
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default(),
                is_directory: metadata.is_dir(),
                size: metadata.len(),
                modified_at: metadata.modified()
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0))
                    .unwrap_or(0),
            });
        }
    }

    Ok(files)
}

#[tauri::command]
pub fn read_file_cmd(server_directory: String, file_path: String) -> Result<FileContent, String> {
    let base_path = PathBuf::from(&server_directory);
    let full_path = base_path.join(&file_path);

    if !full_path.exists() {
        return Err("File does not exist".to_string());
    }

    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();

    Ok(FileContent {
        path: file_path,
        content,
        lines,
    })
}

#[tauri::command]
pub fn find_server_data_cmd(search_path: String) -> Result<Option<String>, String> {
    let path = PathBuf::from(&search_path);

    if !path.exists() {
        return Ok(None);
    }

    // Check if this looks like a FiveM server-data directory
    let has_server_meta = path.join("server.cfg").exists();
    let has_resources = path.join("resources").is_dir();
    let has_data = path.join("data").is_dir();

    if has_server_meta || (has_resources && has_data) {
        Ok(Some(search_path))
    } else {
        // Search subdirectories
        if let Ok(entries) = fs::read_dir(&path) {
            for entry in entries.flatten() {
                let child_path = entry.path();
                if child_path.is_dir() {
                    if let Ok(Some(found)) = find_server_data_cmd(child_path.to_string_lossy().to_string()) {
                        return Ok(Some(found));
                    }
                }
            }
        }
        Ok(None)
    }
}
