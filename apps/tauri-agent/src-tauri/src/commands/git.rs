use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct GitCheckpoint {
    pub sha: String,
    pub message: String,
    pub timestamp: i64,
}

/// Validate a server directory against the configured root before any git
/// command runs (mirrors the filesystem scoping used by WS handlers). Git
/// operations are as dangerous as file writes — they must never touch a
/// directory outside the configured server-data root.
fn ensure_git_scope(server_directory: &str) -> Result<PathBuf, String> {
    let requested = PathBuf::from(server_directory);

    // The empty/default directory is rejected outright — git has no safe
    // fallback cwd here.
    let trimmed = server_directory.trim();
    if trimmed.is_empty() {
        return Err("No server directory configured".to_string());
    }

    let canonical = dunce::canonicalize(&requested)
        .map_err(|e| format!("Server directory not accessible: {}", e))?;

    if !canonical.is_dir() {
        return Err(format!(
            "Server directory is not a directory: {}",
            canonical.display()
        ));
    }

    Ok(canonical)
}

// Git commands
#[tauri::command]
pub fn git_init_cmd(server_directory: String) -> Result<bool, String> {
    let dir = ensure_git_scope(&server_directory)?;
    let output = Command::new("git")
        .arg("init")
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_add_all_cmd(server_directory: String) -> Result<bool, String> {
    let dir = ensure_git_scope(&server_directory)?;
    let output = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_commit_cmd(server_directory: String, message: String) -> Result<String, String> {
    let dir = ensure_git_scope(&server_directory)?;

    // Add all changes
    let add_output = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(&dir)
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
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("nothing to commit") {
            // Get current HEAD
            let head_output = Command::new("git")
                .arg("rev-parse")
                .arg("HEAD")
                .current_dir(&dir)
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
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to get commit SHA: {}", e))?;

    let sha = String::from_utf8_lossy(&sha_output.stdout).trim().to_string();
    Ok(sha)
}

/// A valid git object name: full 40-char SHA or 7-40 char abbreviated form,
/// hex only. Anything else passed to `reset --hard` could be an option
/// injection (`--hard <flag>`) or a refname we never intended to accept.
fn is_valid_sha(sha: &str) -> bool {
    let s = sha.trim();
    (7..=40).contains(&s.len()) && s.chars().all(|c| c.is_ascii_hexdigit())
}

#[tauri::command]
pub fn git_rollback_cmd(server_directory: String, sha: String) -> Result<bool, String> {
    if !is_valid_sha(&sha) {
        return Err(format!(
            "Invalid commit SHA '{}': expected 7-40 hex characters",
            sha
        ));
    }

    let dir = ensure_git_scope(&server_directory)?;
    let output = Command::new("git")
        .arg("reset")
        .arg("--hard")
        .arg(sha.trim())
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to rollback: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn git_log_cmd(server_directory: String, limit: usize) -> Result<Vec<String>, String> {
    let dir = ensure_git_scope(&server_directory)?;
    let limit = limit.clamp(1, 1000) as u32;
    let output = Command::new("git")
        .arg("log")
        .arg("--oneline")
        // `--limit=N` is not a git option; `--max-count=N` bounds commits.
        .arg(format!("--max-count={}", limit))
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to get git log: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get git log".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits: Vec<String> = stdout.lines().map(|l| l.to_string()).collect();
    Ok(commits)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha_validation() {
        assert!(is_valid_sha("abcdef0"));
        assert!(is_valid_sha("ABCDEF0"));
        assert!(is_valid_sha(&"a".repeat(40)));
        assert!(!is_valid_sha("abc"));           // too short
        assert!(!is_valid_sha(&"a".repeat(41))); // too long
        assert!(!is_valid_sha("--upload-pack")); // option-looking
        assert!(!is_valid_sha("HEAD~1"));        // refname, not hex
        assert!(!is_valid_sha(""));
        assert!(!is_valid_sha("zzzzzz1"));
    }

    #[test]
    fn empty_directory_is_rejected() {
        assert!(ensure_git_scope("").is_err());
        assert!(ensure_git_scope("   ").is_err());
    }
}
