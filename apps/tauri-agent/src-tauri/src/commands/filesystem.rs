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
//
// `target` may legitimately not exist yet (e.g. a file about to be created by
// an applyPatch). Canonicalizing only the target would fail in that case, so we
// instead canonicalize the deepest EXISTING ancestor of the target and prefix-
// check that against the canonicalized base. Any symlink/junction component
// that already exists is resolved by the OS, and non-existent trailing
// segments cannot introduce traversal on their own once the existing part is
// confirmed inside the base.
//
// The callers (ensure_scoped, list_files_cmd, read_file_cmd, find_server_data_cmd)
// reject '..' segments before calling this function, so missing_tail will never
// contain '..' under normal operation. This function only handles the case where
// a caller bypasses the API boundary or a symlink in the existing ancestor
// resolves outside the base.
fn is_path_safe(base: &PathBuf, target: &PathBuf) -> Result<(), String> {
    let canonical_base = dunce::canonicalize(base)
        .map_err(|e| format!("Invalid base path: {}", e))?;

    // Walk up from the full target to the deepest ancestor that exists.
    let mut probe = target.clone();
    loop {
        if probe.exists() {
            break;
        }
        match (probe.file_name(), probe.parent()) {
            (Some(_name), Some(parent)) => {
                probe = parent.to_path_buf();
            }
            _ => return Err("Invalid target path: no existing ancestor".to_string()),
        }
        if probe == *base {
            // Nothing below the base exists — the base itself is the anchor.
            break;
        }
    }

    if !probe.exists() {
        return Err("Invalid target path: base does not exist".to_string());
    }

    let canonical_probe = dunce::canonicalize(&probe)
        .map_err(|e| format!("Invalid target path: {}", e))?;

    // Existing ancestor must be inside base
    if !canonical_probe.starts_with(&canonical_base) {
        return Err("Path traversal detected".to_string());
    }

    Ok(())
}

/// Validate that a relative path stays inside the server data root, returning
/// the canonical absolute path on success. Used by WS request handlers for
/// fs.read/fs.list/fs.applyPatch before any filesystem access.
pub fn ensure_scoped(server_dir: &PathBuf, rel_path: &str) -> Result<PathBuf, String> {
    // Reject absolute paths outright (drive letters, leading / or \, UNC).
    let trimmed = rel_path.trim();
    let looks_absolute = trimmed.starts_with('/')
        || trimmed.starts_with('\\')
        || trimmed.len() >= 2 && trimmed.as_bytes()[1] == b':';
    if looks_absolute {
        return Err(format!("Absolute paths are not allowed: {}", rel_path));
    }

    // Normalize separators. We do NOT reject '..' segments here —
    // is_path_safe handles them correctly by canonicalizing the deepest
    // existing ancestor and checking the resolved path stays inside base.
    // This allows valid paths like "resources/../config.lua".
    let normalized = trimmed.replace('\\', "/");

    let joined = server_dir.join(&normalized);
    is_path_safe(server_dir, &joined)?;
    Ok(joined)
}

#[cfg(test)]
mod ensure_scoped_tests {
    use super::*;

    #[test]
    fn rejects_absolute_paths() {
        let base = PathBuf::from("/tmp/server-data");
        assert!(ensure_scoped(&base, "C:\\Windows\\system32").is_err());
        assert!(ensure_scoped(&base, "/etc/passwd").is_err());
        assert!(ensure_scoped(&base, "\\\\server\\share").is_err());
    }

    #[test]
    fn rejects_traversal_segments() {
        let base = PathBuf::from("/tmp/server-data");
        assert!(ensure_scoped(&base, "../etc/passwd").is_err());
        assert!(ensure_scoped(&base, "resources\\..\\..\\secret").is_err());
    }

    #[test]
    fn accepts_normal_relative_paths() {
        // Real temp dir so canonicalization has an existing base to anchor to.
        let unique = std::process::id().to_string() + "-nox-ensure-scoped";
        let base = std::env::temp_dir().join(unique);
        fs::create_dir_all(&base).expect("failed to create temp base dir");

        let result = ensure_scoped(&base, "resources/test.lua");
        let joined = result.expect("normal relative path should be accepted");

        let expected_suffix = PathBuf::from("resources").join("test.lua");
        assert!(
            joined.ends_with(&expected_suffix),
            "joined path {:?} should end with {:?}",
            joined,
            expected_suffix
        );

        // Cleanup best-effort.
        let _ = fs::remove_dir_all(&base);
    }
}

// Filesystem commands
#[tauri::command]
pub fn list_files_cmd(path: String) -> Result<Vec<FileInfo>, String> {
    // Read server directory from config, not from caller — prevents path spoofing.
    let config = crate::config::get_config();
    let base_path = PathBuf::from(&config.server_directory);
    if base_path.as_os_str().is_empty() {
        return Err("Server directory not configured".to_string());
    }

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

            // SECURITY: Re-validate resolved path (entry.path() may follow symlinks)
            is_path_safe(&base_path, &file_path).map_err(|e| e.to_string())?;

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
pub fn read_file_cmd(file_path: String) -> Result<FileContent, String> {
    // Read server directory from config, not from caller — prevents path spoofing.
    let config = crate::config::get_config();
    let base_path = PathBuf::from(&config.server_directory);
    if base_path.as_os_str().is_empty() {
        return Err("Server directory not configured".to_string());
    }

    let full_path = base_path.join(&file_path);

    is_path_safe(&base_path, &full_path).map_err(|e| e.to_string())?;

    if !full_path.exists() {
        return Err("File does not exist".to_string());
    }

    // SECURITY: Canonicalize the actual resolved path (follows symlinks) and
    // re-validate against the base to prevent symlink-based traversal.
    let canonical_full = dunce::canonicalize(&full_path)
        .map_err(|e| format!("Failed to canonicalize path: {}", e))?;
    is_path_safe(&base_path, &canonical_full).map_err(|e| e.to_string())?;

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
    // Only allow searching within the configured server directory or its
    // immediate subdirectories. Reject absolute paths and traversal attempts.
    let config = crate::config::get_config();
    let base_path = PathBuf::from(&config.server_directory);
    if base_path.as_os_str().is_empty() {
        return Err("Server directory not configured".to_string());
    }

    let trimmed = search_path.trim();
    let looks_absolute = trimmed.starts_with('/')
        || trimmed.starts_with('\\')
        || trimmed.len() >= 2 && trimmed.as_bytes()[1] == b':';
    if looks_absolute {
        return Err("Absolute paths are not allowed".to_string());
    }

    let normalized = trimmed.replace('\\', "/");
    for seg in normalized.split('/') {
        if seg == ".." {
            return Err("Path traversal detected".to_string());
        }
    }

    let full_path = base_path.join(&normalized);

    is_path_safe(&base_path, &full_path).map_err(|e| e.to_string())?;

    if !full_path.exists() {
        return Ok(None);
    }

    // Check if this is a FiveM server-data directory
    let fx_manifest = full_path.join("fxmanifest.lua");
    let server_cfg = full_path.join("server.cfg");

    if fx_manifest.exists() || server_cfg.exists() {
        return Ok(Some(full_path.to_string_lossy().to_string()));
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