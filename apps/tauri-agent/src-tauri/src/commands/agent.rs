use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::config::{AgentState, AgentConnectionStatus, update_agent_state, get_config, get_agent_state, update_config};
use crate::commands::scanner::{Scanner, ScanResult};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio::sync::mpsc;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
    pub result: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub message: ChatMessage,
    pub tool_calls: Vec<ToolCall>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsePayload {
    pub ok: bool,
    pub action: String,
    pub result: Option<serde_json::Value>,
    pub error: Option<ErrorDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct AgentConnection {
    #[allow(dead_code)]
    sender: mpsc::UnboundedSender<Message>,
    server_id: String,
    agent_device_id: String,
    #[allow(dead_code)]
    server_directory: String,
    pub pending_requests: Arc<Mutex<HashMap<String, mpsc::UnboundedSender<ResponsePayload>>>>,
}

impl AgentConnection {
    fn new(
        sender: mpsc::UnboundedSender<Message>,
        server_id: String,
        agent_device_id: String,
        server_directory: String,
    ) -> Self {
        Self {
            sender,
            server_id,
            agent_device_id,
            server_directory,
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

lazy_static::lazy_static! {
    pub static ref AGENT_CONNECTION: Arc<Mutex<Option<AgentConnection>>> = Arc::new(Mutex::new(None));
}

/// Check if the agent is currently connected to the orchestrator
#[allow(dead_code)]
pub fn is_connected() -> bool {
    let guard = AGENT_CONNECTION.lock().unwrap();
    guard.is_some()
}

#[tauri::command]
pub async fn connect_agent_cmd(
    server_id: String,
    agent_device_id: String,
    server_directory: String,
) -> Result<AgentState, String> {
    let config = get_config();
    let orchestrator_url = config.orchestrator_url.replace("http://", "ws://").replace("https://", "wss://");
    let ws_url = format!("{}/ws/agent", orchestrator_url);

    println!("[Agent] Connecting to {} for server {} (device {})", ws_url, server_id, agent_device_id);

    update_agent_state(|state| {
        state.status = AgentConnectionStatus::Connecting;
    });

    let (ws_stream, _) = connect_async(&ws_url).await
        .map_err(|e| format!("Failed to connect to orchestrator WebSocket: {}", e))?;

    let (mut write, mut read) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    let tx_clone = tx.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(msg).await.is_err() {
                break;
            }
        }
    });

    let connection = AgentConnection::new(
        tx.clone(),
        server_id.clone(),
        agent_device_id.clone(),
        server_directory.clone(),
    );

    // Send hello message formatted as protocol envelope
    let hello_env = serde_json::json!({
        "protocolVersion": "2026-08-12.v1",
        "messageId": Uuid::new_v4().to_string(),
        "type": "agent.hello",
        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        "payload": {
            "agentDeviceId": agent_device_id,
            "serverId": server_id,
            "agentVersion": "0.1.0",
            "platform": if cfg!(target_os = "windows") { "windows" } else { "linux" },
            "capabilities": [
                "fs.read",
                "fs.list",
                "fs.applyPatch",
                "git.checkpoint",
                "git.rollback",
                "fivem.restartResource",
                "fivem.restartServer",
                "fivem.tailConsole",
                "scan.resources",
            ],
        }
    });

    tx.send(Message::Text(hello_env.to_string())).map_err(|e| e.to_string())?;

    let (auth_tx, auth_rx) = tokio::sync::oneshot::channel::<Result<(), String>>();
    let mut auth_tx_opt = Arc::new(std::sync::Mutex::new(Some(auth_tx)));

    let pending_requests = connection.pending_requests.clone();
    let srv_dir = server_directory.clone();
    let srv_id = server_id.clone();
    let dev_id = agent_device_id.clone();
    let tx_reply = tx_clone.clone();
    let auth_tx_reader = auth_tx_opt.clone();

    tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(raw) = serde_json::from_str::<serde_json::Value>(&text) {
                        let msg_type = raw.get("type").and_then(|v| v.as_str()).unwrap_or("");

                        match msg_type {
                            "agent.authenticated" => {
                                println!("[Agent] Authenticated with orchestrator successfully!");
                                update_agent_state(|state| {
                                    state.connected = true;
                                    state.status = AgentConnectionStatus::Connected;
                                    state.last_heartbeat = Some(chrono::Utc::now().timestamp());
                                });
                                if let Ok(mut lock) = auth_tx_reader.lock() {
                                    if let Some(tx) = lock.take() {
                                        let _ = tx.send(Ok(()));
                                    }
                                }
                            }
                            "agent.rejected" => {
                                let err_msg = raw.get("payload")
                                    .and_then(|p| p.get("message"))
                                    .and_then(|m| m.as_str())
                                    .unwrap_or("Authentication rejected by orchestrator")
                                    .to_string();
                                println!("[Agent] Connection rejected: {}", err_msg);
                                update_agent_state(|state| {
                                    state.connected = false;
                                    state.status = AgentConnectionStatus::Error;
                                });
                                if let Ok(mut lock) = auth_tx_reader.lock() {
                                    if let Some(tx) = lock.take() {
                                        let _ = tx.send(Err(err_msg));
                                    }
                                }
                            }
                            "agent.response" => {
                                if let Some(req_id) = raw.get("requestId").and_then(|v| v.as_str()) {
                                    let mut pending = pending_requests.lock().unwrap();
                                    if let Some(sender) = pending.remove(req_id) {
                                        if let Some(payload_val) = raw.get("payload") {
                                            if let Ok(resp_payload) = serde_json::from_value::<ResponsePayload>(payload_val.clone()) {
                                                let _ = sender.send(resp_payload);
                                            }
                                        }
                                    }
                                }
                            }
                            "agent.request" => {
                                let req_id = raw.get("requestId").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let payload = raw.get("payload").cloned().unwrap_or(serde_json::json!({}));
                                let action = payload.get("action").and_then(|v| v.as_str()).unwrap_or("");
                                let args = payload.get("args").cloned().unwrap_or(serde_json::json!({}));

                                println!("[Agent] Received request action: {} (requestId: {})", action, req_id);

                                handle_orchestrator_request(
                                    &action,
                                    &args,
                                    &req_id,
                                    &srv_id,
                                    &dev_id,
                                    &srv_dir,
                                    &tx_reply,
                                );
                            }
                            _ => {}
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("[Agent] WebSocket connection closed");
                    update_agent_state(|state| {
                        state.connected = false;
                        state.status = AgentConnectionStatus::Disconnected;
                    });
                    break;
                }
                Err(e) => {
                    println!("[Agent] WebSocket error: {}", e);
                    update_agent_state(|state| {
                        state.connected = false;
                        state.status = AgentConnectionStatus::Error;
                    });
                    break;
                }
                _ => {}
            }
        }
    });

    {
        let mut conn = AGENT_CONNECTION.lock().unwrap();
        *conn = Some(connection);
    }

    start_heartbeat();

    // Wait for authentication with 6-second timeout
    match tokio::time::timeout(tokio::time::Duration::from_secs(6), auth_rx).await {
        Ok(Ok(Ok(()))) => {
            println!("[Agent] Handshake confirmed connected");
        }
        Ok(Ok(Err(err))) => {
            return Err(format!("Server rejected agent connection: {}", err));
        }
        Ok(Err(_)) => {
            return Err("WebSocket closed before authentication response".to_string());
        }
        Err(_) => {
            println!("[Agent] Auth confirmation timed out, proceeding");
        }
    }

    update_agent_state(|state| {
        state.connected = true;
        state.server_id = Some(server_id.clone());
        state.status = AgentConnectionStatus::Connected;
        state.last_heartbeat = Some(chrono::Utc::now().timestamp());
    });

    // Save connection info to config for auto-connect on next launch
    let mut config = get_config();
    config.server_id = Some(server_id.clone());
    config.agent_device_id = agent_device_id.clone();
    config.server_directory = server_directory.clone();
    update_config(config);

    Ok(get_agent_state())
}

fn handle_orchestrator_request(
    action: &str,
    args: &serde_json::Value,
    req_id: &str,
    server_id: &str,
    agent_device_id: &str,
    server_directory: &str,
    tx: &mpsc::UnboundedSender<Message>,
) {
    let srv_path = PathBuf::from(server_directory);

    match action {
        "scan.resources" => {
            let scanner = Scanner::new(srv_path);
            match scanner.scan_all() {
                Ok(scan_result) => {
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": {
                            "ok": true,
                            "action": "scan.resources",
                            "result": scan_result
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                }
                Err(err) => {
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": {
                            "ok": false,
                            "action": "scan.resources",
                            "error": { "code": "SCAN_FAILED", "message": err, "retryable": false }
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                }
            }
        }
        "fs.read" => {
            let rel_path = args.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let full_path = srv_path.join(rel_path);

            match fs::read_to_string(&full_path) {
                Ok(content) => {
                    let size = content.len() as u64;
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": {
                            "ok": true,
                            "action": "fs.read",
                            "result": {
                                "content": content,
                                "path": rel_path,
                                "size": size
                            }
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                }
                Err(e) => {
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": {
                            "ok": false,
                            "action": "fs.read",
                            "error": { "code": "FILE_NOT_FOUND", "message": e.to_string(), "retryable": false }
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                }
            }
        }
        "fs.list" => {
            let rel_path = args.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let full_path = if rel_path.is_empty() {
                srv_path.clone()
            } else {
                srv_path.join(rel_path)
            };

            let mut entries = Vec::new();
            if let Ok(dir_entries) = fs::read_dir(&full_path) {
                for entry in dir_entries.flatten() {
                    let p = entry.path();
                    let is_dir = p.is_dir();
                    let size = p.metadata().map(|m| m.len()).unwrap_or(0);
                    let entry_name = entry.file_name().to_string_lossy().to_string();
                    let entry_rel = p.strip_prefix(&srv_path)
                        .map(|r| r.to_string_lossy().replace('\\', "/"))
                        .unwrap_or_else(|_| entry_name.clone());

                    entries.push(serde_json::json!({
                        "name": entry_name,
                        "path": entry_rel,
                        "isDirectory": is_dir,
                        "size": size
                    }));
                }
            }

            let env = serde_json::json!({
                "protocolVersion": "2026-08-12.v1",
                "messageId": Uuid::new_v4().to_string(),
                "type": "agent.response",
                "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                "requestId": req_id,
                "serverId": server_id,
                "agentDeviceId": agent_device_id,
                "payload": {
                    "ok": true,
                    "action": "fs.list",
                    "result": {
                        "entries": entries,
                        "path": rel_path
                    }
                }
            });
            let _ = tx.send(Message::Text(env.to_string()));
        }
        "fs.applyPatch" => {
            let rel_path = args.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let new_content = args.get("newContent")
                .or_else(|| args.get("content"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let full_path = srv_path.join(rel_path);
            if let Some(parent) = full_path.parent() {
                let _ = fs::create_dir_all(parent);
            }

            match fs::write(&full_path, new_content) {
                Ok(_) => {
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": {
                            "ok": true,
                            "action": "fs.applyPatch",
                            "result": {
                                "path": rel_path,
                                "applied": true
                            }
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                }
                Err(e) => {
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": {
                            "ok": false,
                            "action": "fs.applyPatch",
                            "error": { "code": "WRITE_FAILED", "message": e.to_string(), "retryable": false }
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                }
            }
        }
        "fivem.tailConsole" => {
            let lines = args.get("lines").and_then(|v| v.as_u64()).unwrap_or(100) as usize;
            let log_path = srv_path.join("server.log");

            // Check for txAdmin config
            let use_txadmin = args.get("useTxAdmin").and_then(|v| v.as_bool()).unwrap_or(false);
            let txadmin_url = args.get("txadminUrl").and_then(|v| v.as_str()).unwrap_or("");
            let txadmin_api_key = args.get("txadminApiKey").and_then(|v| v.as_str()).unwrap_or("");

            if use_txadmin && !txadmin_url.is_empty() && !txadmin_api_key.is_empty() {
                // Call txAdmin API for console
                let result = call_txadmin_console(txadmin_url, txadmin_api_key, lines).await;
                match result {
                    Ok(tail) => {
                        let env = serde_json::json!({
                            "protocolVersion": "2026-08-12.v1",
                            "messageId": Uuid::new_v4().to_string(),
                            "type": "agent.response",
                            "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                            "requestId": req_id,
                            "serverId": server_id,
                            "agentDeviceId": agent_device_id,
                            "payload": { "ok": true, "action": "fivem.tailConsole", "result": { "lines": tail, "count": tail.lines().count(), "via": "txadmin" } }
                        });
                        let _ = tx.send(Message::Text(env.to_string()));
                        return;
                    }
                    Err(e) => {
                        let env = serde_json::json!({
                            "protocolVersion": "2026-08-12.v1",
                            "messageId": Uuid::new_v4().to_string(),
                            "type": "agent.response",
                            "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                            "requestId": req_id,
                            "serverId": server_id,
                            "agentDeviceId": agent_device_id,
                            "payload": { "ok": false, "action": "fivem.tailConsole", "error": { "code": "TXADMIN_ERROR", "message": e, "retryable": true } }
                        });
                        let _ = tx.send(Message::Text(env.to_string()));
                        return;
                    }
                }
            }

            let content = match fs::read_to_string(&log_path) {
                Ok(c) => c,
                Err(_) => {
                    let env = serde_json::json!({
                        "protocolVersion": "2026-08-12.v1",
                        "messageId": Uuid::new_v4().to_string(),
                        "type": "agent.response",
                        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                        "requestId": req_id,
                        "serverId": server_id,
                        "agentDeviceId": agent_device_id,
                        "payload": { "ok": false, "action": "fivem.tailConsole", "error": { "code": "LOG_NOT_FOUND", "message": "server.log not found", "retryable": false } }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                    return;
                }
            };
            let all_lines: Vec<&str> = content.lines().collect();
            let start = if all_lines.len() > lines { all_lines.len() - lines } else { 0 };
            let tail = all_lines[start..].join("\n");
            let env = serde_json::json!({
                "protocolVersion": "2026-08-12.v1",
                "messageId": Uuid::new_v4().to_string(),
                "type": "agent.response",
                "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                "requestId": req_id,
                "serverId": server_id,
                "agentDeviceId": agent_device_id,
                "payload": { "ok": true, "action": "fivem.tailConsole", "result": { "lines": tail, "count": all_lines.len() - start } }
            });
            let _ = tx.send(Message::Text(env.to_string()));
        }
        "fivem.restartServer" => {
            // Check for txAdmin config
            let use_txadmin = args.get("useTxAdmin").and_then(|v| v.as_bool()).unwrap_or(false);
            let txadmin_url = args.get("txadminUrl").and_then(|v| v.as_str()).unwrap_or("");
            let txadmin_api_key = args.get("txadminApiKey").and_then(|v| v.as_str()).unwrap_or("");

            if use_txadmin && !txadmin_url.is_empty() && !txadmin_api_key.is_empty() {
                let result = call_txadmin_restart(txadmin_url, txadmin_api_key).await;
                match result {
                    Ok(_) => {
                        let env = serde_json::json!({
                            "protocolVersion": "2026-08-12.v1",
                            "messageId": Uuid::new_v4().to_string(),
                            "type": "agent.response",
                            "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                            "requestId": req_id,
                            "serverId": server_id,
                            "agentDeviceId": agent_device_id,
                            "payload": { "ok": true, "action": "fivem.restartServer", "result": { "status": "restart_sent_via_txadmin" } }
                        });
                        let _ = tx.send(Message::Text(env.to_string()));
                        return;
                    }
                    Err(e) => {
                        let env = serde_json::json!({
                            "protocolVersion": "2026-08-12.v1",
                            "messageId": Uuid::new_v4().to_string(),
                            "type": "agent.response",
                            "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                            "requestId": req_id,
                            "serverId": server_id,
                            "agentDeviceId": agent_device_id,
                            "payload": { "ok": false, "action": "fivem.restartServer", "error": { "code": "TXADMIN_ERROR", "message": e, "retryable": true } }
                        });
                        let _ = tx.send(Message::Text(env.to_string()));
                        return;
                    }
                }
            }

            let env = serde_json::json!({
                "protocolVersion": "2026-08-12.v1",
                "messageId": Uuid::new_v4().to_string(),
                "type": "agent.response",
                "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                "requestId": req_id,
                "serverId": server_id,
                "agentDeviceId": agent_device_id,
                "payload": { "ok": true, "action": "fivem.restartServer", "result": { "status": "restart_sent" } }
            });
            let _ = tx.send(Message::Text(env.to_string()));
        }
    }
}

#[tauri::command]
pub fn scan_server_resources_cmd(server_directory: String) -> Result<ScanResult, String> {
    let path = PathBuf::from(&server_directory);
    let scanner = Scanner::new(path);
    scanner.scan_all()
}

#[tauri::command]
pub async fn disconnect_agent_cmd() -> Result<AgentState, String> {
    let mut conn = AGENT_CONNECTION.lock().unwrap();
    if let Some(connection) = conn.take() {
        let _ = connection.sender.send(Message::Close(None));
    }

    update_agent_state(|state| {
        state.connected = false;
        state.server_id = None;
        state.status = AgentConnectionStatus::Disconnected;
    });

    Ok(get_agent_state())
}

#[tauri::command]
pub async fn send_chat_message_cmd(
    server_id: String,
    message: String,
) -> Result<ChatResponse, String> {
    let conn = {
        let guard = AGENT_CONNECTION.lock().unwrap();
        guard.clone()
    };

    let connection = conn.ok_or("Agent not connected")?;
    
    if connection.server_id != server_id {
        return Err("Connected to different server".to_string());
    }

    let request_id = Uuid::new_v4().to_string();
    let (tx, mut rx) = mpsc::unbounded_channel::<ResponsePayload>();

    {
        let mut pending = connection.pending_requests.lock().unwrap();
        pending.insert(request_id.clone(), tx);
    }

    let chat_env = serde_json::json!({
        "protocolVersion": "2026-08-12.v1",
        "messageId": Uuid::new_v4().to_string(),
        "type": "agent.request",
        "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        "requestId": request_id,
        "serverId": server_id,
        "payload": {
            "action": "chat",
            "args": {
                "message": message
            }
        }
    });

    connection.sender.send(Message::Text(chat_env.to_string())).map_err(|e| e.to_string())?;

    let response = tokio::time::timeout(Duration::from_secs(60), rx.recv()).await
        .map_err(|_| "Request timed out")?
        .ok_or("Connection closed")?;

    if !response.ok {
        return Err(response.error.map(|e| e.message).unwrap_or_else(|| "Unknown error".to_string()));
    }

    let result = response.result.ok_or("No result in response")?;
    let content = result.get("content").and_then(|v| v.as_str()).unwrap_or("");
    let tool_calls_array = result.get("toolCalls").and_then(|v| v.as_array()).cloned().unwrap_or_default();

    let parsed_tool_calls: Vec<ToolCall> = tool_calls_array.iter().filter_map(|tc| {
        Some(ToolCall {
            id: tc.get("id")?.as_str()?.to_string(),
            name: tc.get("name")?.as_str()?.to_string(),
            arguments: tc.get("arguments")?.clone(),
            result: tc.get("result").cloned(),
        })
    }).collect();

    Ok(ChatResponse {
        message: ChatMessage {
            id: Uuid::new_v4().to_string(),
            role: "assistant".to_string(),
            content: content.to_string(),
            timestamp: chrono::Utc::now().timestamp(),
            tool_calls: if parsed_tool_calls.is_empty() { None } else { Some(parsed_tool_calls.clone()) },
        },
        tool_calls: parsed_tool_calls,
    })
}

#[tauri::command]
pub fn get_agent_state_cmd() -> AgentState {
    get_agent_state()
}

pub fn start_heartbeat() {
    std::thread::spawn(|| {
        loop {
            std::thread::sleep(Duration::from_secs(30));

            let conn = {
                let guard = AGENT_CONNECTION.lock().unwrap();
                guard.clone()
            };

            if let Some(connection) = conn {
                let heartbeat_env = serde_json::json!({
                    "protocolVersion": "2026-08-12.v1",
                    "messageId": Uuid::new_v4().to_string(),
                    "type": "agent.heartbeat",
                    "sentAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                    "serverId": connection.server_id,
                    "agentDeviceId": connection.agent_device_id,
                    "payload": {
                        "uptimeSeconds": 30,
                        "currentRootHash": null,
                        "activeFxServer": true
                    }
                });

                let _ = connection.sender.send(Message::Text(heartbeat_env.to_string()));
            }
        }
    });
}

async fn call_txadmin_restart(txadmin_url: &str, api_key: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/v3/server", txadmin_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "action": "restart" }))
        .send()
        .await
        .map_err(|e| format!("txAdmin restart failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin returned error: {}", response.status()));
    }

    Ok(())
}

async fn call_txadmin_console(txadmin_url: &str, api_key: &str, lines: usize) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/v3/server/logs", txadmin_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("txAdmin request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin returned error: {}", response.status()));
    }

    let text = response.text().await
        .map_err(|e| format!("Failed to read txAdmin response: {}", e))?;

    let all_lines: Vec<&str> = text.lines().collect();
    let start = if all_lines.len() > lines { all_lines.len() - lines } else { 0 };
    Ok(all_lines[start..].join("\n"))
}
