# NOX Features — Implementation Plan

## Features to Build

### 1. Resource Finder (`pages/ResourceFinder.tsx`)
- Curated catalog of 50+ popular FiveM resources
- Categories: HUD, Vehicles, Scripts, Maps, etc.
- Search/filter functionality
- One-click "Ask AI to install" button
- Shows: name, description, framework, download link

### 2. Quick Actions Sidebar (sidebar component)
- Right-side panel with one-click actions
- Actions: Restart Resource, Tail Console, View Players, Scan Resources, Git Status
- Context-aware (only shows relevant actions for selected server)
- Collapsible, keyboard shortcut `Ctrl+Q`

### 3. Change Preview (update `pages/Changes.tsx`)
- Inline diff viewer (like GitHub)
- Side-by-side or unified diff toggle
- File tree navigation
- Approve/Deny all button
- Time-based timeline view option

### 4. Git History Timeline (new page `pages/GitHistory.tsx`)
- Visual timeline of all git commits
- Shows: who, what, when, diff preview
- Click to view full commit
- One-click rollback to any point
- Branch visualization

### 5. Player Management (new page `pages/Players.tsx`)
- List of online players with stats
- Search/filter by name/identifier
- Ban/Unban with reason
- Set permissions/roles
- View player session info

---

## File Changes

| File | Action |
|------|--------|
| `src/pages/ResourceFinder.tsx` | **NEW** |
| `src/pages/GitHistory.tsx` | **NEW** |
| `src/pages/Players.tsx` | **NEW** |
| `src/components/QuickActions.tsx` | **NEW** |
| `src/components/ResourceCatalog.ts` | **NEW** (data) |
| `src/pages/Changes.tsx` | **UPDATE** (add preview modes) |
| `src/components/Layout.tsx` | **UPDATE** (add nav items + sidebar) |
| `src/api.ts` | **UPDATE** (add player endpoints) |

---

## Implementation Order

1. **Resource Catalog** (data file) — 15 min
2. **Resource Finder Page** — 30 min
3. **Quick Actions Sidebar** — 20 min
4. **Update Layout** (nav + sidebar) — 15 min
5. **Change Preview Upgrade** — 25 min
6. **Git History Page** — 30 min
7. **Player Management Page** — 25 min

**Total: ~2.5 hours**

---

## API Endpoints Needed

```
GET    /api/servers/:id/players      — List online players
POST   /api/servers/:id/players/:id/ban     — Ban a player
POST   /api/servers/:id/players/:id/unban   — Unban a player
POST   /api/servers/:id/players/:id/setperm — Set permissions
GET    /api/servers/:id/git/log        — Git commit history
GET    /api/servers/:id/git/status     — Current git status
```

---

## UI Components to Reuse

- `motion` from framer-motion (already imported)
- `lucide-react` icons (already installed)
- Dark theme tokens from `index.css`
- Layout shell from `Layout.tsx`
