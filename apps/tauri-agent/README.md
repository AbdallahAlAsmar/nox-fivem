# FiveM AI Developer - Tauri Desktop App

## Status

- **Frontend (React + Vite):** ✅ Built successfully
- **Backend (Rust):** ⚠️ Needs Rust installation
- **Build Command:** `pnpm build` works

## What's Built

### Pages
1. **Dashboard** - Server list, stats, quick actions
2. **Chat** - Real-time AI chat with streaming
3. **Changes** - Diff viewer, apply/cancel/rollback
4. **Settings** - Theme, server config, AI mode

### Features
- Dark/Light theme toggle
- Collapsible sidebar navigation
- Server management (add/remove/scan)
- AI chat interface with markdown
- Change history with diff viewer
- Settings persistence

## Installation

### 1. Install Rust (Required)

**Option A: Download Installer**
```
https://win.rustup.rs/x86_64
```
Run the installer and follow the prompts.

**Option B: Using winget**
```powershell
winget install Rustlang.Rustup
```

**Option C: Using Chocolatey**
```powershell
choco install rust
```

### 2. Verify Installation
```bash
rustc --version
cargo --version
```

### 3. Install Windows Build Tools
```powershell
npm install -g windows-build-tools
```

### 4. Run the App
```bash
cd D:/fivem-dev/apps/tauri-agent
pnpm tauri dev
```

### 5. Build for Production
```bash
pnpm tauri build
```

## Project Structure

```
apps/tauri-agent/
├── src/
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   ├── api.ts               # Tauri command wrappers
│   ├── components/
│   │   └── Layout.tsx       # Sidebar + layout
│   └── pages/
│       ├── Dashboard.tsx    # Server management
│       ├── Chat.tsx         # AI chat
│       ├── Changes.tsx      # Change history
│       └── Settings.tsx     # App settings
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Rust entry point
│   │   ├── config.rs        # Settings management
│   │   ├── commands/        # Tauri commands
│   │   │   ├── config.rs
│   │   │   ├── server.rs
│   │   │   ├── filesystem.rs
│   │   │   ├── git.rs
│   │   │   └── agent.rs
│   │   └── commands/mod.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.cjs
```

## Running the Full Project

### Option 1: Web Dashboard (Works Now)
```bash
cd D:/fivem-dev
pnpm dev
# Opens http://localhost:3000
```

### Option 2: Tauri Desktop App (Needs Rust)
```bash
cd D:/fivem-dev/apps/tauri-agent
pnpm tauri dev
```

### Option 3: CLI Agent
```bash
cd D:/fivem-dev/apps/agent
pnpm dev pair   # Pair with orchestrator
pnpm dev start  # Connect to orchestrator
```

## AI Configuration

Uses **OmniRoute** (OpenAI-compatible):
- Endpoint: `http://localhost:20128/v1`
- Model: `auto/best-coding`
- No API key needed for local

## Dependencies

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
- Tauri API

### Backend (Rust)
- Tauri v2
- tokio (async runtime)
- serde (serialization)
- reqwest (HTTP client)
- uuid (IDs)
- chrono (dates)

## Next Steps

1. **Install Rust** (required to build)
2. **Run `pnpm tauri dev`** to test
3. **Connect to orchestrator** for real AI responses
4. **Test all features** (chat, changes, settings)

## Troubleshooting

### Rust not found
```bash
# Install from https://rustup.rs
# Then restart terminal
```

### Tauri CLI not found
```bash
pnpm add -D @tauri-apps/cli
```

### Build fails
```bash
# Clean and reinstall
pnpm install
pnpm tauri dev
```

## Files Created

- `apps/tauri-agent/` - Complete Tauri app structure
- `src/` - React frontend (1520 modules, 170KB JS)
- `src-tauri/` - Rust backend (commands for server, files, git, chat)
- `dist/` - Built frontend assets
