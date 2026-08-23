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

// Path validation - prevent directory traversal
fn is_path_safe(base: &PathBuf, target: &PathBuf) -> Result<(), String> {
    let canonical_base = base.canonicalize().map_err(|e| format!("Invalid base path: {}", e))?;
    let canonical_target = target.canonicalize().map_err(|e| format!("Invalid target path: {}", e))?;
    
    if !canonical_target.starts_with(&canonical_base) {
        return Err("Path traversal detected".to_string());
    }
    
    Ok(())
}

// Filesystem commands
#[tauri::command]
pub fn list_files_cmd(server_directory: String, path: String) -> Result<Vec<FileInfo>, String> {
    let base_path = PathBuf::from(&server_directory);
    let target_path = base_path.join(&path);

    is_path_safe(&base_path, &target_path).map_err(|e| e.to_string())?;

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

    is_path_safe(&base_path, &full_path).map_err(|e| e.to_string())?;

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

    // Check if this is a FiveM server-data directory
    let fx_manifest = path.join("fxmanifest.lua");
    let server_cfg = path.join("server.cfg");
    
    if fx_manifest.exists() || server_cfg.exists() {
        return Ok(Some(path.to_string_lossy().to_string()));
    }

    Ok(None)
}

// Add txAdmin bridge commands
#[tauri::command]
pub async fn txadmin_restart_resource_cmd(
    txadmin_url: String,
    txadmin_api_key: String,
    resource_name: String,
) -> Result<bool, String> {
    // Use reqwest to call txAdmin API
    let client = reqwest::Client::new();
    
    let url = format!("{}/api/v3/server/resources", txadmin_url);
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", txadmin_api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "action": "restart",
            "resource": resource_name
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to call txAdmin: {}", e))?;

    Ok(response.status().is_success())
}

#[tauri::command]
pub async fn txadmin_restart_server_cmd(
    txadmin_url: String,
    txadmin_api_key: String,
) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let url = format!("{}/api/v3/server", txadmin_url);
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", txadmin_api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "action": "restart"
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to call txAdmin: {}", e))?;

    Ok(response.status().is_success())
}

#[tauri::command]
pub async fn txadmin_get_console_cmd(
    txadmin_url: String,
    txadmin_api_key: String,
    lines: Option<usize>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let url = format!("{}/api/v3/server/logs", txadmin_url);
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", txadmin_api_key))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to call txAdmin: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin returned error: {}", response.status()));
    }

    let text = response.text().await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Return last N lines if specified
    if let Some(line_count) = lines {
        let all_lines: Vec<&str> = text.lines().collect();
        let start = if all_lines.len() > line_count {
            all_lines.len() - line_count
        } else {
            0
        };
        Ok(all_lines[start..].join("\n"))
    } else {
        Ok(text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_traversal() {
        let base = PathBuf::from("/tmp/server-data");
        let target = PathBuf::from("/etc/passwd");
        assert!(is_path_safe(&base, &target).is_err());
    }
}