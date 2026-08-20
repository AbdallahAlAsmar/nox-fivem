use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct GitCheckpoint {
    pub sha: String,
    pub message: String,
    pub timestamp: i64,
}

// Git commands
#[tauri::command]
pub fn git_init_cmd(server_directory: String) -> Result<bool, String> {
    let output = Command::new("git")
        .arg("init")
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_add_all_cmd(server_directory: String) -> Result<bool, String> {
    let output = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_commit_cmd(server_directory: String, message: String) -> Result<String, String> {
    // Add all changes
    let add_output = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to add files: {}", e))?;

    if !add_output.status.success() {
        return Err("Failed to add files".to_string());
    }

    // Commit
    let output = Command::new("git")
        .arg("commit")
        .arg("-m")
        .arg(&message)
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("nothing to commit") {
            // Get current HEAD
            let head_output = Command::new("git")
                .arg("rev-parse")
                .arg("HEAD")
                .current_dir(&server_directory)
                .output()
                .map_err(|e| format!("Failed to get HEAD: {}", e))?;

            if head_output.status.success() {
                let sha = String::from_utf8_lossy(&head_output.stdout).trim().to_string();
                return Ok(sha);
            }
        }
        return Err(format!("Commit failed: {}", stderr));
    }

    // Get the commit SHA
    let sha_output = Command::new("git")
        .arg("rev-parse")
        .arg("HEAD")
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to get commit SHA: {}", e))?;

    let sha = String::from_utf8_lossy(&sha_output.stdout).trim().to_string();
    Ok(sha)
}

#[tauri::command]
pub fn git_rollback_cmd(server_directory: String, sha: String) -> Result<bool, String> {
    let output = Command::new("git")
        .arg("reset")
        .arg("--hard")
        .arg(&sha)
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to rollback: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_log_cmd(server_directory: String, limit: usize) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .arg("log")
        .arg("--oneline")
        .arg(format!("--limit={}", limit))
        .current_dir(&server_directory)
        .output()
        .map_err(|e| format!("Failed to get git log: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get git log".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits: Vec<String> = stdout.lines().map(|l| l.to_string()).collect();
    Ok(commits)
}
