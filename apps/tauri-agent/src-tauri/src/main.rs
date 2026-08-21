mod config;
mod commands;

use tauri::Manager;

// Re-export commands
use commands::{
    config::{get_config_cmd, update_config_cmd, set_theme, set_ai_mode},
    server::{create_server_cmd, get_servers_cmd, remove_server_cmd, scan_resources_cmd, open_folder_cmd, inspect_server_dir},
    filesystem::{list_files_cmd, read_file_cmd, find_server_data_cmd},
    git::{git_init_cmd, git_add_all_cmd, git_commit_cmd, git_rollback_cmd, git_log_cmd},
    agent::{connect_agent_cmd, disconnect_agent_cmd, send_chat_message_cmd, get_agent_state_cmd, scan_server_resources_cmd, start_heartbeat},
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            println!("App data directory: {}", app_dir.display());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config_cmd,
            update_config_cmd,
            set_theme,
            set_ai_mode,
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
            connect_agent_cmd,
            disconnect_agent_cmd,
            send_chat_message_cmd,
            get_agent_state_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
