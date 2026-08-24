use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::sync::LazyLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub theme: Theme,
    pub server_directory: String,
    pub server_id: Option<String>,
    pub agent_device_id: String,
    /// One-time session token issued by POST /api/pairing/claim (or the
    /// connect object of POST /api/servers). Sent as `sessionToken` in
    /// agent.hello; only its sha256 is stored server-side.
    #[serde(default)]
    pub session_token: Option<String>,
    pub ai_mode: AiMode,
    pub show_file_tree: bool,
    pub show_code_changes: bool,
    pub auto_start: bool,
    pub agent_port: u16,
    pub orchestrator_url: String,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            theme: Theme::Dark,
            server_directory: String::new(),
            server_id: None,
            agent_device_id: String::new(),
            session_token: None,
            ai_mode: AiMode::AI,
            show_file_tree: true,
            show_code_changes: true,
            auto_start: false,
            agent_port: 3001,
            orchestrator_url: "http://158.101.167.118:3001".to_string(),
        }
    }
}

/// Where the persisted config lives. Set once at app startup (main.rs) from
/// Tauri's app_data_dir; defaults to %APPDATA%/nox-agent when unset (tests).
static CONFIG_PATH: OnceLock<PathBuf> = OnceLock::new();

pub fn set_config_path(path: PathBuf) {
    let _ = CONFIG_PATH.set(path);
}

fn config_path() -> PathBuf {
    CONFIG_PATH
        .get()
        .cloned()
        .unwrap_or_else(default_config_path)
}

fn default_config_path() -> PathBuf {
    // Windows primary target; falls back to a relative dir elsewhere.
    if let Some(app_data) = std::env::var_os("APPDATA") {
        return PathBuf::from(app_data).join("nox-agent").join("config.json");
    }
    PathBuf::from("nox-agent-config.json")
}

fn default_config_json() -> String {
    serde_json::to_string(&Config::default()).unwrap_or_else(|_| "{}".to_string())
}

/// Load the persisted config into the global store. Missing or corrupt files
/// fall back to defaults (a corrupt file is overwritten on next save).
pub fn load_config_from_disk() {
    let path = config_path();
    let loaded = std::fs::read_to_string(&path)
        .ok()
        .and_then(|raw| serde_json::from_str::<Config>(&raw).ok());
    match loaded {
        Some(cfg) => {
            *CONFIG.lock().unwrap() = cfg;
            println!("[Config] Loaded config from {}", path.display());
        }
        None => {
            if path.exists() {
                eprintln!("[Config] Corrupt config at {} — using defaults", path.display());
            }
            *CONFIG.lock().unwrap() = Config::default();
            save_config_to_disk();
        }
    }
}

/// Persist the current global config to disk (best-effort; failures are logged
/// but never panic — losing a settings file must not take the app down).
pub fn save_config_to_disk() {
    let path = config_path();
    if let Some(parent) = path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("[Config] Failed to create config dir {}: {}", parent.display(), e);
            return;
        }
    }
    match serde_json::to_string_pretty(&*CONFIG.lock().unwrap()) {
        Ok(json) => {
            if let Err(e) = std::fs::write(&path, json) {
                eprintln!("[Config] Failed to write {}: {}", path.display(), e);
            }
        }
        Err(e) => eprintln!("[Config] Failed to serialize config: {}", e),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Dark,
    Light,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AiMode {
    AI,      // Use AI to propose changes
    Agent,   // Agent handles everything
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub id: String,
    pub name: String,
    pub directory: PathBuf,
    pub framework: String,
    pub status: ServerStatus,
    pub last_seen: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ServerStatus {
    Offline,
    Online,
    Connecting,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentState {
    pub connected: bool,
    pub server_id: Option<String>,
    pub last_heartbeat: Option<i64>,
    pub status: AgentConnectionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AgentConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Error,
}

static CONFIG: LazyLock<Mutex<Config>> = LazyLock::new(|| {
    Mutex::new(serde_json::from_str::<Config>(&default_config_json())
        .expect("built-in default config must deserialize"))
});

static SERVERS: LazyLock<Mutex<HashMap<String, Server>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
static AGENT_STATE: LazyLock<Mutex<AgentState>> = LazyLock::new(|| Mutex::new(AgentState {
    connected: false,
    server_id: None,
    last_heartbeat: None,
    status: AgentConnectionStatus::Disconnected,
}));

pub fn get_config() -> Config {
    CONFIG.lock().unwrap().clone()
}

/// Replace the whole config in memory AND persist it.
pub fn update_config(new_config: Config) {
    *CONFIG.lock().unwrap() = new_config;
    save_config_to_disk();
}

/// Mutate part of the config in memory AND persist it.
pub fn mutate_config(f: impl FnOnce(&mut Config)) {
    let mut guard = CONFIG.lock().unwrap();
    f(&mut guard);
    drop(guard);
    save_config_to_disk();
}

#[allow(dead_code)]
pub fn get_server(server_id: &str) -> Option<Server> {
    SERVERS.lock().unwrap().get(server_id).cloned()
}

pub fn add_server(server: Server) {
    SERVERS.lock().unwrap().insert(server.id.clone(), server);
}

pub fn remove_server(server_id: &str) {
    SERVERS.lock().unwrap().remove(server_id);
}

pub fn get_all_servers() -> Vec<Server> {
    SERVERS.lock().unwrap().values().cloned().collect()
}

#[allow(dead_code)]
pub fn update_server_status(server_id: &str, status: ServerStatus) {
    if let Some(server) = SERVERS.lock().unwrap().get_mut(server_id) {
        server.status = status;
        server.last_seen = Some(chrono::Utc::now().timestamp());
    }
}

pub fn get_agent_state() -> AgentState {
    AGENT_STATE.lock().unwrap().clone()
}

pub fn update_agent_state(updater: impl FnOnce(&mut AgentState)) {
    let mut state = AGENT_STATE.lock().unwrap();
    updater(&mut state);
}

pub fn is_configured() -> bool {
    let config = get_config();
    !config.agent_device_id.is_empty() && config.server_id.is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_parses_and_serializes_roundtrip() {
        let json = serde_json::to_string(&Config::default()).unwrap();
        let parsed: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.theme, Theme::Dark);
        assert_eq!(parsed.session_token, None);
        assert_eq!(parsed.auto_start, false);
    }

    #[test]
    fn missing_fields_deserialize_with_defaults() {
        // Older config.json files lack session_token etc.; serde defaults keep
        // them loadable instead of failing the whole startup.
        let legacy = r#"{
            "theme": "dark",
            "server_directory": "",
            "server_id": null,
            "agent_device_id": "",
            "ai_mode": "ai",
            "show_file_tree": true,
            "show_code_changes": true,
            "auto_start": false,
            "agent_port": 3001,
            "orchestrator_url": "http://localhost:3001"
        }"#;
        let parsed: Config = serde_json::from_str(legacy).unwrap();
        assert_eq!(parsed.session_token, None);
    }
}
