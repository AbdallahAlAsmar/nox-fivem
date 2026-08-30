pub mod config;
pub mod commands;

use tauri::Emitter;
use tauri::Manager;

// Re-export commands
use commands::{
    config::{get_config_cmd, update_config_cmd, set_theme, set_ai_mode},
    server::{create_server_cmd, get_servers_cmd, remove_server_cmd, scan_resources_cmd, open_folder_cmd, inspect_server_dir},
    filesystem::{list_files_cmd, read_file_cmd, find_server_data_cmd},
    git::{git_init_cmd, git_add_all_cmd, git_commit_cmd, git_rollback_cmd, git_log_cmd, git_checkpoint_cmd},
    agent::{connect_agent_cmd, disconnect_agent_cmd, send_chat_message_cmd, get_agent_state_cmd, set_session_token_cmd, scan_server_resources_cmd},
    oauth::{start_oauth_server_cmd, stop_oauth_server_cmd},
};
use config::AgentState;

/// Auto-connect the agent to the first paired server when the app launches
#[tauri::command]
async fn auto_connect_agent() -> Result<AgentState, String> {
    use crate::config::get_config;

    // Check if already connected
    if commands::agent::is_connected() {
        return Ok(get_agent_state_cmd());
    }

    // Get config
    let config = get_config();
    let server_id = config.server_id.clone().ok_or("No server configured")?;
    let agent_device_id = config.agent_device_id.clone();
    let server_directory = config.server_directory.clone();

    if agent_device_id.is_empty() {
        return Err("No agent device ID configured".to_string());
    }

    println!("[AutoConnect] Connecting to server {}...", server_id);
    connect_agent_cmd(server_id, agent_device_id, server_directory).await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            println!("App data directory: {}", app_dir.display());

            // Persisted config lives next to the app data dir; load it before
            // anything reads connection settings.
            config::set_config_path(app_dir.join("config.json"));
            config::load_config_from_disk();

            // Global handle for event emissions from non-command code paths
            // (WS reader tasks, reconnect loop).
            commands::agent::set_app_handle(app.handle().clone());

            // Auto-connect agent on startup if a server is configured.
            // Honors the persisted auto_start preference (Settings toggle).
            {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if !config::get_config().auto_start {
                        println!("[AutoConnect] Disabled in settings — skipping");
                        return;
                    }
                    // Small delay to let the app fully initialize
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    match auto_connect_agent().await {
                        Ok(state) => {
                            println!("[AutoConnect] Agent state: {:?}", state);
                            if state.connected {
                                app_handle.emit("agent:connected", true).unwrap_or_default();
                            }
                        }
                        Err(e) => {
                            eprintln!("[AutoConnect] Failed to auto-connect: {}", e);
                            app_handle.emit("agent:connected", false).unwrap_or_default();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config_cmd,
            update_config_cmd,
            set_theme,
            set_ai_mode,
            auto_connect_agent,
            create_server_cmd,
            inspect_server_dir,
            get_servers_cmd,
            remove_server_cmd,
            scan_resources_cmd,
            scan_server_resources_cmd,
            open_folder_cmd,
            list_files_cmd,
            read_file_cmd,
            find_server_data_cmd,
            git_init_cmd,
            git_add_all_cmd,
            git_commit_cmd,
            git_rollback_cmd,
            git_log_cmd,
            git_checkpoint_cmd,
            connect_agent_cmd,
            disconnect_agent_cmd,
            set_session_token_cmd,
            send_chat_message_cmd,
            get_agent_state_cmd,
            start_oauth_server_cmd,
            stop_oauth_server_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
