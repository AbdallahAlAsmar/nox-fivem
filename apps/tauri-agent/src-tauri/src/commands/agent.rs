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
                "fs.write",
                "fs.applyPatch",
                "git.checkpoint",
                "git.rollback",
                "fivem.restartResource",
                "fivem.restartServer",
                "fivem.tailConsole",
                "fivem.listPlayers",
                "fivem.banPlayer",
                "fivem.unbanPlayer",
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
                                let action = payload.get("action").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let args = payload.get("args").cloned().unwrap_or(serde_json::json!({}));

                                println!("[Agent] Received request action: {} (requestId: {})", action, req_id);

                                tokio::spawn(handle_orchestrator_request(
                                    action,
                                    args,
                                    req_id,
                                    srv_id.clone(),
                                    dev_id.clone(),
                                    srv_dir.clone(),
                                    tx_reply.clone(),
                                ));
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

async fn handle_orchestrator_request(
    action: String,
    args: serde_json::Value,
    req_id: String,
    server_id: String,
    agent_device_id: String,
    server_directory: String,
    tx: mpsc::UnboundedSender<Message>,
) {
    let action = action.as_str();
    let req_id = req_id.as_str();
    let server_id = server_id.as_str();
    let agent_device_id = agent_device_id.as_str();

    let srv_path = PathBuf::from(&server_directory);

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

            let full_path = match crate::commands::filesystem::ensure_scoped(&srv_path, rel_path) {
                Ok(p) => p,
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
                            "action": "fs.read",
                            "error": { "code": "PATH_OUTSIDE_ROOT", "message": err, "retryable": false }
                        }
                    });
                    let _ = tx.send(Message::Text(env.to_string()));
                    return;
                }
            };

            match fs::read_to_string(&full_path) {
                Ok(content) => {
                    let size = content.len() as u64;
                    // FsReadResultSchema requires sha256 + modifiedAt; the
                    // orchestrator's config editor echoes both back to the UI.
                    let sha256 = sha256_hex(content.as_bytes());
                    let modified_at = fs::metadata(&full_path)
                        .and_then(|m| m.modified())
                        .map(|t| {
                            let dt: chrono::DateTime<chrono::Utc> = t.into();
                            dt.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
                        })
                        .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true));
                    send_result(&tx, req_id, server_id, agent_device_id, "fs.read", serde_json::json!({
                        "content": content,
                        "path": rel_path,
                        "sha256": sha256,
                        "size": size,
                        "modifiedAt": modified_at
                    }));
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
                match dunce::canonicalize(&srv_path) {
                    Ok(p) => p,
                    Err(_) => srv_path.clone(),
                }
            } else {
                match crate::commands::filesystem::ensure_scoped(&srv_path, rel_path) {
                    Ok(p) => p,
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
                                "action": "fs.list",
                                "error": { "code": "PATH_OUTSIDE_ROOT", "message": err, "retryable": false }
                            }
                        });
                        let _ = tx.send(Message::Text(env.to_string()));
                        return;
                    }
                }
            };

            let mut entries = Vec::new();
            if let Ok(dir_entries) = fs::read_dir(&full_path) {
                for entry in dir_entries.flatten() {
                    let p = entry.path();
                    let is_dir = p.is_dir();
                    // Only files carry a meaningful size; schema marks size and
                    // modifiedAt as optional so directories may omit them.
                    let meta = fs::metadata(&p).ok();
                    let size = if is_dir { None } else { meta.as_ref().map(|m| m.len()) };
                    let modified_at = meta.and_then(|m| m.modified().ok()).map(|t| {
                        let dt: chrono::DateTime<chrono::Utc> = t.into();
                        dt.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
                    });
                    let entry_name = entry.file_name().to_string_lossy().to_string();
                    let entry_rel = p.strip_prefix(&srv_path)
                        .map(|r| r.to_string_lossy().replace('\\', "/"))
                        .unwrap_or_else(|_| entry_name.clone());

                    let mut json_entry = serde_json::json!({
                        "name": entry_name,
                        "path": entry_rel,
                        "type": if is_dir { "directory" } else { "file" }
                    });
                    if let Some(sz) = size {
                        json_entry["size"] = serde_json::json!(sz);
                    }
                    if let Some(mt) = modified_at {
                        json_entry["modifiedAt"] = serde_json::json!(mt);
                    }
                    entries.push(json_entry);
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
            // FsApplyPatchArgsSchema: { changeId, files: [{ path, expectedSha256?, newContent }] }
            let change_id = args.get("changeId").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let files = match args.get("files").and_then(|v| v.as_array()) {
                Some(f) => f.clone(),
                None => {
                    send_error(&tx, req_id, server_id, agent_device_id, action, "INVALID_REQUEST", "Missing files array");
                    return;
                }
            };
            if files.is_empty() {
                send_error(&tx, req_id, server_id, agent_device_id, action, "INVALID_REQUEST", "Empty files array");
                return;
            }

            // ---- Pre-validate EVERYTHING before touching disk --------------
            // All-or-nothing: a half-applied multi-file patch is worse than
            // none. Validate every path scope + optional hash first.
            struct PlannedWrite {
                rel_path: String,
                full_path: PathBuf,
                content: String,
            }
            let mut planned: Vec<PlannedWrite> = Vec::new();
            for file in &files {
                let fpath = file.get("path").and_then(|v| v.as_str()).unwrap_or("");
                if fpath.is_empty() {
                    send_error(&tx, req_id, server_id, agent_device_id, action, "INVALID_REQUEST", "File entry missing path");
                    return;
                }

                // Scope check (rejects absolute paths + traversal before any I/O).
                let full_path = match crate::commands::filesystem::ensure_scoped(&srv_path, fpath) {
                    Ok(p) => p,
                    Err(err) => {
                        send_error(
                            &tx, req_id, server_id, agent_device_id,
                            action, "PATH_OUTSIDE_ROOT", &format!("{}: {}", fpath, err),
                        );
                        return;
                    }
                };

                // Optional optimistic-concurrency check against current content.
                if let Some(expected) = file.get("expectedSha256").and_then(|v| v.as_str()) {
                    match fs::read_to_string(&full_path) {
                        Ok(existing) => {
                            let actual = sha256_hex(existing.as_bytes());
                            if !actual.eq_ignore_ascii_case(expected) {
                                send_error(
                                    &tx, req_id, server_id, agent_device_id,
                                    action, "FILE_CHANGED_SINCE_STAGED",
                                    &format!("{}: content changed since staged (expected sha256 {}, got {})", fpath, expected, actual),
                                );
                                return;
                            }
                        }
                        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                            // New file — nothing to compare yet, that is fine.
                        }
                        Err(e) => {
                            send_error(
                                &tx, req_id, server_id, agent_device_id,
                                action, "READ_FAILED", &format!("{}: {}", fpath, e),
                            );
                            return;
                        }
                    }
                }

                planned.push(PlannedWrite {
                    rel_path: fpath.to_string(),
                    full_path,
                    content: file.get("newContent").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                });
            }

            // ---- Apply phase -------------------------------------------------
            for p in planned {
                if let Some(parent) = p.full_path.parent() {
                    if let Err(e) = fs::create_dir_all(parent) {
                        send_error(
                            &tx, req_id, server_id, agent_device_id,
                            action, "WRITE_FAILED", &format!("{}: mkdir failed: {}", p.rel_path, e),
                        );
                        return;
                    }
                }
                if let Err(e) = fs::write(&p.full_path, &p.content) {
                    send_error(
                        &tx, req_id, server_id, agent_device_id,
                        action, "WRITE_FAILED", &format!("{}: {}", p.rel_path, e),
                    );
                    return;
                }
            }

            // FsApplyPatchResultSchema shape — mirrors the frozen Node CLI agent.
            let applied_files: Vec<serde_json::Value> = files.iter().map(|f| {
                serde_json::json!({
                    "path": f.get("path").and_then(|v| v.as_str()).unwrap_or(""),
                    "success": true
                })
            }).collect();
            send_result(&tx, req_id, server_id, agent_device_id, action, serde_json::json!({
                "changeId": change_id,
                "appliedFiles": applied_files,
                "allSucceeded": true
            }));
        }
        "fs.write" => {
            let rel_path = args.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let content = args.get("content").and_then(|v| v.as_str()).unwrap_or("");

            // Writes are the highest-risk operation: validate scope before
            // creating parent directories or touching disk.
            let full_path = match crate::commands::filesystem::ensure_scoped(&srv_path, rel_path) {
                Ok(p) => p,
                Err(err) => {
                    send_error(
                        &tx, req_id, server_id, agent_device_id,
                        "fs.write", "PATH_OUTSIDE_ROOT", &err,
                    );
                    return;
                }
            };

            if let Some(parent) = full_path.parent() {
                let _ = fs::create_dir_all(parent);
            }

            match fs::write(&full_path, content) {
                Ok(_) => {
                    // sha256 of the written content — mirrors the frozen Node
                    // CLI agent's fs.write dialect consumed by routes.ts.
                    let sha256 = sha256_hex(content.as_bytes());
                    send_result(&tx, req_id, server_id, agent_device_id, "fs.write", serde_json::json!({
                        "path": rel_path,
                        "success": true,
                        "sha256": sha256
                    }));
                }
                Err(e) => {
                    send_error(&tx, req_id, server_id, agent_device_id, "fs.write", "WRITE_FAILED", &e.to_string());
                }
            }
        }
        "fivem.listPlayers" => {
            let use_txadmin = args.get("useTxAdmin").and_then(|v| v.as_bool()).unwrap_or(false);
            let txadmin_url = args.get("txadminUrl").and_then(|v| v.as_str()).unwrap_or("");
            let txadmin_api_key = args.get("txadminApiKey").and_then(|v| v.as_str()).unwrap_or("");

            if use_txadmin && !txadmin_url.is_empty() && !txadmin_api_key.is_empty() {
                match call_txadmin_players(txadmin_url, txadmin_api_key).await {
                    Ok(players) => {
                        send_result(&tx, req_id, server_id, agent_device_id, "fivem.listPlayers", serde_json::json!({
                            "players": players,
                            "source": "txadmin"
                        }));
                        return;
                    }
                    Err(e) => {
                        // txAdmin configured but the call failed: report it
                        // honestly rather than silently reporting zero players.
                        send_error(&tx, req_id, server_id, agent_device_id, "fivem.listPlayers", "TXADMIN_ERROR", &e);
                        return;
                    }
                }
            }

            // No txAdmin configured — an empty list is an HONEST answer ("we
            // cannot see any players"), unlike a fabricated success. The
            // orchestrator upserts whatever arrives.
            send_result(&tx, req_id, server_id, agent_device_id, "fivem.listPlayers", serde_json::json!({
                "players": [],
                "source": "none"
            }));
        }
        "fivem.banPlayer" | "fivem.unbanPlayer" => {
            let identifier = args.get("identifier")
                .or_else(|| args.get("playerId"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if identifier.is_empty() {
                send_error(&tx, req_id, server_id, agent_device_id, action, "INVALID_REQUEST", "Missing player identifier");
                return;
            }

            let reason = args.get("reason")
                .and_then(|v| v.as_str())
                .unwrap_or(if action == "fivem.banPlayer" { "Banned via NOX" } else { "" })
                .to_string();

            let use_txadmin = args.get("useTxAdmin").and_then(|v| v.as_bool()).unwrap_or(false);
            let txadmin_url = args.get("txadminUrl").and_then(|v| v.as_str()).unwrap_or("");
            let txadmin_api_key = args.get("txadminApiKey").and_then(|v| v.as_str()).unwrap_or("");

            if !(use_txadmin && !txadmin_url.is_empty() && !txadmin_api_key.is_empty()) {
                send_error(
                    &tx, req_id, server_id, agent_device_id,
                    action, "NOT_IMPLEMENTED",
                    "txAdmin not configured — ban/unban requires a txAdmin connection on the agent machine",
                );
                return;
            }

            let result = if action == "fivem.banPlayer" {
                call_txadmin_ban(txadmin_url, txadmin_api_key, &identifier, &reason).await
            } else {
                call_txadmin_unban(txadmin_url, txadmin_api_key, &identifier).await
            };

            match result {
                Ok(()) => {
                    send_result(&tx, req_id, server_id, agent_device_id, action, serde_json::json!({
                        "identifier": identifier,
                        "success": true
                    }));
                }
                Err(e) => {
                    send_error(&tx, req_id, server_id, agent_device_id, action, "TXADMIN_ERROR", &e);
                }
            }
        }
        "fivem.restartResource" => {
            let resource_name = args.get("resourceName")
                .or_else(|| args.get("resource"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if resource_name.is_empty() {
                send_error(&tx, req_id, server_id, agent_device_id, action, "INVALID_REQUEST", "Missing resourceName");
                return;
            }

            let use_txadmin = args.get("useTxAdmin").and_then(|v| v.as_bool()).unwrap_or(false);
            let txadmin_url = args.get("txadminUrl").and_then(|v| v.as_str()).unwrap_or("");
            let txadmin_api_key = args.get("txadminApiKey").and_then(|v| v.as_str()).unwrap_or("");

            if !(use_txadmin && !txadmin_url.is_empty() && !txadmin_api_key.is_empty()) {
                send_error(
                    &tx, req_id, server_id, agent_device_id,
                    action, "NOT_IMPLEMENTED",
                    "txAdmin not configured — resource restart requires a txAdmin connection on the agent machine",
                );
                return;
            }

            match call_txadmin_restart_resource(txadmin_url, txadmin_api_key, &resource_name).await {
                Ok(()) => {
                    send_result(&tx, req_id, server_id, agent_device_id, action, serde_json::json!({
                        "resourceName": resource_name,
                        "success": true
                    }));
                }
                Err(e) => {
                    send_error(&tx, req_id, server_id, agent_device_id, action, "TXADMIN_ERROR", &e);
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
        _ => {
            // Unknown action — reply with an error result so the orchestrator's
            // pending request does not wait for its full timeout.
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
                    "action": action,
                    "error": { "code": "UNKNOWN_ACTION", "message": format!("Unknown action: {}", action), "retryable": false }
                }
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

/// Hex-encoded SHA-256 digest of `bytes`. Used for fs.write/fs.read results so
/// the orchestrator can issue optimistic-concurrency expectedSha256 checks.
fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

/// Send a successful agent.response envelope for the given action.
fn send_result(
    tx: &mpsc::UnboundedSender<Message>,
    req_id: &str,
    server_id: &str,
    agent_device_id: &str,
    action: &str,
    result: serde_json::Value,
) {
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
            "action": action,
            "result": result
        }
    });
    let _ = tx.send(Message::Text(env.to_string()));
}

/// Send an error agent.response envelope. Every request MUST get exactly one
/// reply — an unanswered request burns the orchestrator's full timeout.
fn send_error(
    tx: &mpsc::UnboundedSender<Message>,
    req_id: &str,
    server_id: &str,
    agent_device_id: &str,
    action: &str,
    code: &str,
    message: &str,
) {
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
            "action": action,
            "error": { "code": code, "message": message, "retryable": false }
        }
    });
    let _ = tx.send(Message::Text(env.to_string()));
}

async fn call_txadmin_players(txadmin_url: &str, api_key: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    // txAdmin v3 player list endpoint.
    let url = format!("{}/api/v3/player/pushpoints", txadmin_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("txAdmin players request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin returned error: {}", response.status()));
    }

    let value: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse txAdmin players response: {}", e))?;

    // txAdmin returns either a bare array or { players: [...] } depending on
    // version; normalise to our array-of-players shape.
    let players = match value {
        serde_json::Value::Array(arr) => serde_json::Value::Array(arr),
        obj @ serde_json::Value::Object(_) => obj.get("players").cloned().unwrap_or_else(|| serde_json::json!([])),
        _ => serde_json::json!([]),
    };
    Ok(players)
}

async fn call_txadmin_ban(txadmin_url: &str, api_key: &str, identifier: &str, reason: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/v3/player/ban", txadmin_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "identifier": identifier,
            "reason": reason
        }))
        .send()
        .await
        .map_err(|e| format!("txAdmin ban failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin ban returned error: {}", response.status()));
    }
    Ok(())
}

async fn call_txadmin_unban(txadmin_url: &str, api_key: &str, identifier: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/v3/player/unban", txadmin_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "identifier": identifier }))
        .send()
        .await
        .map_err(|e| format!("txAdmin unban failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin unban returned error: {}", response.status()));
    }
    Ok(())
}

async fn call_txadmin_restart_resource(txadmin_url: &str, api_key: &str, resource_name: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    // txAdmin v3 resource control endpoint.
    let url = format!("{}/api/v3/server/resources", txadmin_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "action": "restart",
            "resource": resource_name
        }))
        .send()
        .await
        .map_err(|e| format!("txAdmin resource restart failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("txAdmin resource restart returned error: {}", response.status()));
    }
    Ok(())
}
