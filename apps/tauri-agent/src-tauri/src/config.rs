use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::sync::LazyLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub theme: Theme,
    pub server_directory: String,
    pub ai_mode: AiMode,
    pub show_file_tree: bool,
    pub show_code_changes: bool,
    pub auto_start: bool,
    pub agent_port: u16,
    pub orchestrator_url: String,
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
    Mutex::new(Config {
        theme: Theme::Dark,
        server_directory: String::new(),
        ai_mode: AiMode::AI,
        show_file_tree: true,
        show_code_changes: true,
        auto_start: false,
        agent_port: 3001,
        orchestrator_url: "http://localhost:3001".to_string(),
    })
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

pub fn update_config(new_config: Config) {
    let mut config = CONFIG.lock().unwrap();
    *config = new_config;
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
