use tauri::State;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::config::{AgentState, AgentConnectionStatus, update_agent_state, get_config, get_agent_state};
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

// Protocol message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentMessage {
    #[serde(rename = "agent.hello")]
    Hello {
        payload: HelloPayload,
    },
    #[serde(rename = "agent.request")]
    Request {
        #[serde(rename = "requestId")]
        request_id: String,
        #[serde(rename = "serverId")]
        server_id: String,
        payload: RequestPayload,
    },
    #[serde(rename = "agent.response")]
    Response {
        #[serde(rename = "requestId")]
        request_id: String,
        payload: ResponsePayload,
    },
    #[serde(rename = "agent.heartbeat")]
    Heartbeat {
        payload: HeartbeatPayload,
    },
    #[serde(rename = "agent.authenticated")]
    Authenticated {
        payload: AuthenticatedPayload,
    },
    #[serde(rename = "agent.error")]
    Error {
        payload: ErrorPayload,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelloPayload {
    #[serde(rename = "agentDeviceId")]
    agent_device_id: String,
    #[serde(rename = "serverId")]
    server_id: String,
    #[serde(rename = "agentVersion")]
    agent_version: String,
    pub platform: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestPayload {
    pub action: String,
    pub args: serde_json::Value,
    pub timeout: Option<u64>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatPayload {
    #[serde(rename = "uptimeSeconds")]
    pub uptime_seconds: u64,
    #[serde(rename = "currentRootHash")]
    pub current_root_hash: Option<String>,
    #[serde(rename = "activeFxServer")]
    pub active_fx_server: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticatedPayload {
    #[serde(rename = "serverTime")]
    pub server_time: String,
    #[serde(rename = "heartbeatIntervalMs")]
    pub heartbeat_interval_ms: u64,
    #[serde(rename = "minimumAgentVersion")]
    pub minimum_agent_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub details: Option<serde_json::Value>,
}

// Connection state
#[derive(Debug, Clone)]
struct AgentConnection {
    sender: mpsc::UnboundedSender<Message>,
    server_id: String,
    #[allow(dead_code)]
    agent_device_id: String,
    pending_requests: Arc<Mutex<HashMap<String, mpsc::UnboundedSender<ResponsePayload>>>>,
}

impl AgentConnection {
    fn new(
        sender: mpsc::UnboundedSender<Message>,
        server_id: String,
        agent_device_id: String,
    ) -> Self {
        Self {
            sender,
            server_id,
            agent_device_id,
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// Global connection state
lazy_static::lazy_static! {
    static ref AGENT_CONNECTION: Arc<Mutex<Option<AgentConnection>>> = Arc::new(Mutex::new(None));
}

#[tauri::command]
pub async fn connect_agent_cmd(server_id: String) -> Result<AgentState, String> {
    let config = get_config();
    let orchestrator_url = config.orchestrator_url.replace("http://", "ws://").replace("https://", "wss://");
    let ws_url = format!("{}/ws/agent", orchestrator_url);

    update_agent_state(|state| {
        state.status = AgentConnectionStatus::Connecting;
    });

    // Create a pairing code or use existing agent device
    // For now, we'll generate a mock agent device ID
    let agent_device_id = Uuid::new_v4().to_string();

    // Connect to WebSocket
    let (ws_stream, _) = connect_async(&ws_url).await
        .map_err(|e| format!("Failed to connect to orchestrator: {}", e))?;

    let (mut write, mut read) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Spawn writer task
    let _write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Create connection state
    let connection = AgentConnection::new(tx.clone(), server_id.clone(), agent_device_id.clone());
    
    // Send hello message
    let hello_msg = AgentMessage::Hello {
        payload: HelloPayload {
            agent_device_id: agent_device_id.clone(),
            server_id: server_id.clone(),
            agent_version: "0.1.0".to_string(),
            platform: if cfg!(target_os = "windows") { "windows".to_string() } else { "linux".to_string() },
            capabilities: vec![
                "fs.read".to_string(),
                "fs.list".to_string(),
                "fs.applyPatch".to_string(),
                "git.checkpoint".to_string(),
                "git.rollback".to_string(),
                "fivem.restartResource".to_string(),
                "fivem.tailConsole".to_string(),
                "scan.resources".to_string(),
            ],
        },
    };

    let hello_json = serde_json::to_string(&hello_msg).map_err(|e| e.to_string())?;
    tx.send(Message::Text(hello_json)).map_err(|e| e.to_string())?;

    // Spawn reader task
    let pending_requests = connection.pending_requests.clone();
    let _read_task = tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(msg) = serde_json::from_str::<AgentMessage>(&text) {
                        match msg {
                            AgentMessage::Authenticated { payload } => {
                                println!("Agent authenticated: {}", payload.server_time);
                            }
                            AgentMessage::Response { request_id, payload } => {
                                let mut pending = pending_requests.lock().unwrap();
                                if let Some(sender) = pending.remove(&request_id) {
                                    let _ = sender.send(payload);
                                }
                            }
                            AgentMessage::Error { payload } => {
                                println!("Agent error: {} - {}", payload.code, payload.message);
                            }
                            _ => {}
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("WebSocket closed");
                    break;
                }
                Err(e) => {
                    println!("WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }
    });

    // Store connection
    {
        let mut conn = AGENT_CONNECTION.lock().unwrap();
        *conn = Some(connection);
    }

    update_agent_state(|state| {
        state.connected = true;
        state.server_id = Some(server_id);
        state.status = AgentConnectionStatus::Connected;
        state.last_heartbeat = Some(chrono::Utc::now().timestamp());
    });

    // Start heartbeat now that we have a valid connection
    start_heartbeat();

    Ok(get_agent_state())
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

    // For chat, we use a special action that the orchestrator handles
    // This sends a chat request to the orchestrator which then streams back
    let request_id = Uuid::new_v4().to_string();
    let (tx, mut rx) = mpsc::unbounded_channel::<ResponsePayload>();

    {
        let mut pending = connection.pending_requests.lock().unwrap();
        pending.insert(request_id.clone(), tx);
    }

    let chat_request = AgentMessage::Request {
        request_id: request_id.clone(),
        server_id: server_id.clone(),
        payload: RequestPayload {
            action: "chat".to_string(),
            args: serde_json::json!({
                "message": message,
            }),
            timeout: Some(60000),
        },
    };

    let request_json = serde_json::to_string(&chat_request).map_err(|e| e.to_string())?;
    connection.sender.send(Message::Text(request_json)).map_err(|e| e.to_string())?;

    // Wait for response with timeout
    let response = tokio::time::timeout(Duration::from_secs(60), rx.recv()).await
        .map_err(|_| "Request timed out")?
        .ok_or("Connection closed")?;

    if !response.ok {
        return Err(response.error.map(|e| e.message).unwrap_or_else(|| "Unknown error".to_string()));
    }

    // Parse the response
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

// Heartbeat task — runs on a dedicated OS thread (no Tokio runtime needed)
pub fn start_heartbeat() {
    std::thread::spawn(|| {
        loop {
            std::thread::sleep(Duration::from_secs(30));
            
            let conn = {
                let guard = AGENT_CONNECTION.lock().unwrap();
                guard.clone()
            };
            
            if let Some(connection) = conn {
                let heartbeat = AgentMessage::Heartbeat {
                    payload: HeartbeatPayload {
                        uptime_seconds: 0, // TODO: track actual uptime
                        current_root_hash: None,
                        active_fx_server: Some(true),
                    },
                };
                
                let heartbeat_json = match serde_json::to_string(&heartbeat) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                
                let _ = connection.sender.send(Message::Text(heartbeat_json));
            }
        }
    });
}
