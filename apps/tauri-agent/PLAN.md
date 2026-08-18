# FiveM AI Developer - Tauri Desktop App Plan

## App Overview

A modern desktop application for managing FiveM servers, chatting with AI, and safely applying changes. Built with Tauri (Rust + React) for native performance and small bundle size.

---

## Core Features

### 1. Server Management
- Add/remove servers
- Set server directory path
- Connection status indicator
- Framework detection (QBCore/vRP/ESX)
- Resource scan status
- Agent status (online/offline/paused)

### 2. Chat Interface
- Real-time chat with AI
- Streaming responses
- Tool call visualization
- Conversation history
- Thread management
- Markdown rendering

### 3. Change Management
- Auto-detect file changes
- Diff viewer with syntax highlighting
- Apply/Cancel buttons
- One-click rollback
- Change history

### 4. Settings Panel
- Server directory configuration
- AI/Agent toggle mode
- Show/hide file list
- Show/hide code changes
- Theme (dark/light)
- Agent port configuration
- Auto-start on login

### 5. Theme System
- Dark mode (default)
- Light mode
- System preference detection
- Smooth transitions

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Tauri App                         │
├─────────────────────────────────────────────────────┤
│  React Frontend (Vite + TypeScript)                 │
│  ├── pages/                                          │
│  │   ├── Dashboard.tsx      - Server overview      │
│  │   ├── Chat.tsx           - AI chat interface     │
│  │   ├── Changes.tsx        - Change management     │
│  │   └── Settings.tsx       - App settings          │
│  ├── components/                                     │
│  │   ├── Layout.tsx           - Main layout         │
│  │   ├── Sidebar.tsx          - Navigation          │
│  │   ├── ChatPanel.tsx        - Chat UI             │
│  │   ├── DiffViewer.tsx       - Code diff view      │
│  │   ├── FileTree.tsx         - File browser        │
│  │   ├── SettingsPanel.tsx    - Settings form       │
│  │   ├── ThemeToggle.tsx      - Dark/light switch   │
│  │   └── StatusBadge.tsx      - Connection status   │
│  └── hooks/                                          │
│      ├── useTheme.ts          - Theme management    │
│      ├── useSettings.ts       - Settings storage    │
│      └── useAgent.ts          - Agent connection    │
├─────────────────────────────────────────────────────┤
│  Rust Backend (Tauri Commands)                      │
│  ├── src/                                            │
│  │   ├── main.rs            - App entry point       │
│  │   ├── config.rs          - Settings/config       │
│  │   ├── agent.rs           - WS connection         │
│  │   ├── filesystem.rs      - File operations       │
│  │   ├── git.rs             - Git operations        │
│  │   ├── scanner.rs         - Resource scanner      │
│  │   └── api.rs             - API calls             │
│  ├── tauri.conf.json      - App config            │
│  └── Cargo.toml             - Dependencies          │
└─────────────────────────────────────────────────────┘
```

---

## File Structure

```
apps/tauri-agent/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Chat.tsx
│   │   ├── Changes.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── DiffViewer.tsx
│   │   ├── FileTree.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ChangeCard.tsx
│   └── hooks/
│       ├── useTheme.ts
│       ├── useSettings.ts
│       └── useAgent.ts
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── config.rs
│   │   ├── agent.rs
│   │   ├── filesystem.rs
│   │   ├── git.rs
│   │   ├── scanner.rs
│   │   └── api.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── build.rs
│   └── icons/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## UI/UX Design

### Layout
- **Sidebar** (left): Navigation + server list
- **Main content** (center): Page content
- **Right panel** (optional): File tree / Change preview

### Color Scheme
- **Dark mode**: Slate/gray backgrounds, brand green accents
- **Light mode**: White/gray backgrounds, brand green accents

### Components

#### Dashboard
- Server cards with status
- Quick stats (resources, changes, uptime)
- Recent activity

#### Chat
- Message list with avatars
- Streaming indicator
- Tool call badges
- Input with send button
- Markdown rendered messages

#### Changes
- List of pending/applied/rolled-back changes
- Diff preview (file path, lines changed)
- Code view with syntax highlighting
- Apply/Cancel/Rollback buttons

#### Settings
- Server directory picker
- AI/Agent mode toggle
- Show/hide panels
- Theme selector
- Agent configuration

---

## Rust Backend (Tauri Commands)

### Commands

```rust
// Config
#[tauri::command]
async fn get_config() -> Config { ... }

#[tauri::command]
async fn update_config(new_config: Config) -> Result<(), String> { ... }

// Agent
#[tauri::command]
async fn connect_agent(server_id: String) -> Result<AgentState, String> { ... }

#[tauri::command]
async fn disconnect_agent(server_id: String) -> Result<(), String> { ... }

#[tauri::command]
async fn send_chat_message(server_id: String, message: String) -> Result<ChatResponse, String> { ... }

// Filesystem
#[tauri::command]
async fn list_files(server_id: String, path: String) -> Result<Vec<File>, String> { ... }

#[tauri::command]
async fn read_file(server_id: String, path: String) -> Result<String, String> { ... }

#[tauri::command]
async fn get_file_diff(server_id: String, path: String) -> Result<Diff, String> { ... }

// Git
#[tauri::command]
async fn create_checkpoint(server_id: String, message: String) -> Result<String, String> { ... }

#[tauri::command]
async fn rollback_checkpoint(server_id: String, sha: String) -> Result<bool, String> { ... }

// Scanner
#[tauri::command]
async fn scan_resources(server_id: String) -> Result<Vec<Resource>, String> { ... }
```

---

## State Management

### Settings State
```typescript
interface Settings {
  theme: 'dark' | 'light';
  serverDirectory: string;
  aiMode: 'ai' | 'agent';
  showFileTree: boolean;
  showCodeChanges: boolean;
  autoStart: boolean;
  agentPort: number;
}
```

### Agent State
```typescript
interface AgentState {
  connected: boolean;
  serverId: string | null;
  lastHeartbeat: Date | null;
  status: 'online' | 'offline' | 'error';
}
```

### Chat State
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}
```

---

## Dependencies

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (components)
- react-router-dom (navigation)
- zustand (state management)
- react-markdown (markdown rendering)
- monaco-editor (code editor)
- highlight.js (syntax highlighting)
- clsx + tailwind-merge (class utilities)

### Backend (Rust)
- tauri (framework)
- tokio (async runtime)
- ws (WebSocket)
- serde (serialization)
- serde_json (JSON)
- tokio-util (utilities)
- sha2 (hashing)
- chrono (dates)
- glob (file matching)

---

## Development Steps

### Phase 1: Project Setup
1. Create Tauri project structure
2. Configure Cargo.toml dependencies
3. Set up Vite + TypeScript
4. Configure Tailwind CSS
5. Set up shadcn/ui components

### Phase 2: Core UI
1. Create Layout component (sidebar + main)
2. Implement routing (Dashboard, Chat, Changes, Settings)
3. Create Sidebar with navigation
4. Implement theme toggle
5. Add dark/light mode CSS variables

### Phase 3: Chat Interface
1. Create ChatPanel component
2. Implement message list
3. Add streaming response UI
4. Create input component
5. Add markdown rendering

### Phase 4: Rust Backend
1. Create config management
2. Implement agent connection
3. Add filesystem commands
4. Implement git commands
5. Add scanner commands

### Phase 5: Integration
1. Connect frontend to backend commands
2. Implement file tree
3. Add diff viewer
4. Create change management UI
5. Add settings persistence

### Phase 6: Polish
1. Add loading states
2. Implement error handling
3. Add animations/transitions
4. Test on Windows/Linux
5. Create installer

---

## UX Details

### Smooth Transitions
- Page transitions (fade)
- Theme switch (smooth color change)
- Chat message appear (slide up)
- Settings panel (slide in)

### Feedback
- Connection status indicator
- Loading spinners
- Success/error toasts
- Progress bars for scans

### Accessibility
- Keyboard navigation
- Focus indicators
- ARIA labels
- Color contrast

### Performance
- Virtualized file lists
- Lazy loaded components
- Debounced inputs
- Cached responses

---

## Next Steps

1. **Create project structure**
2. **Set up Tauri + Vite + React**
3. **Build core UI components**
4. **Implement Rust backend**
5. **Connect frontend to backend**
6. **Test and polish**

Ready to start building?
