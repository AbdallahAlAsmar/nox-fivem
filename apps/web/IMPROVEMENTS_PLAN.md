# NOX Web App — Improvement Plan

## Current State

**Pages:**
- `/` — Landing page (hero, features, security, footer)
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/dashboard` — Server list
- `/dashboard/servers/new` — Create server
- `/dashboard/servers/[id]` — Server detail (placeholder)
- `/dashboard/settings` — Settings

**Components:**
- `SidebarNav` — Left sidebar with Servers + Settings
- `ChatPanel` — AI chat with skill picker
- `ParticleCanvas` — 3D particle background
- UI: `badge`, `button`, `card`, `input`, `label`, `sonner`

**Tech Stack:**
- Next.js 14, Clerk auth, SWR, Tailwind, Framer Motion, Three.js (particles)

---

## Improvements (Priority Order)

### Phase 1 — Fill the Gaps (2-3 hours)

#### 1. Server Detail Page (`/dashboard/servers/[id]`)
**Problem:** Clicking a server card goes to a blank page.

**Build:**
- Server header: name, framework, status, last seen
- **Chat tab** — embed ChatPanel with the server's thread
- **Changes tab** — show pending/approved changes for this server
- **Resources tab** — show scanned resources with search
- **Settings tab** — server-specific settings (rename, revoke agent)
- **Console tab** — real-time console output (WebSocket)

**Files:**
- `app/dashboard/servers/[serverId]/page.tsx`

#### 2. Landing Page — Add More Sections
**Current:** Hero → 3 features → Security → Footer (too short)

**Add:**
- **Pricing section** — 3 tiers (Free/Pro/Enterprise) with feature comparison
- **How it works** — 4-step visual flow with screenshots
- **Testimonials** — 3 fake but realistic quotes from FiveM server owners
- **FAQ** — 6 accordion items answering common questions
- **CTA section** — "Ready to get started?" before footer

**Files:**
- `app/page.tsx` — add new sections

#### 3. Server Creation Flow
**Current:** Simple name input → pairing code

**Improve:**
- Framework selector (QBCore, ESX, Other)
- Server directory path input
- Region selector (affects AI model selection)
- Quick-scan on creation
- Show pairing code in a styled modal with copy button

**Files:**
- `app/dashboard/servers/new/page.tsx`

---

### Phase 2 — Dashboard Enhancements (3-4 hours)

#### 4. Dashboard Stats Cards
**Current:** Just server cards

**Add:**
- Total servers / online / offline count
- Total AI messages today
- Pending changes requiring approval
- Last 7 days activity chart (simple bar chart)

**Files:**
- `app/dashboard/page.tsx` — add stats row

#### 5. Server Status Indicators
**Current:** Static status dot

**Improve:**
- Pulse animation for online
- Flash animation when status changes
- Show player count if available
- Show FPS/tick rate if agent connected

**Files:**
- `app/dashboard/page.tsx` + `ServerCard` component

#### 6. Recent Activity Feed
**Add:**
- "AI made 3 changes to config.lua"
- "Player banned: BadActor"
- "Server restarted"
- Time-ordered, last 24 hours

**Files:**
- New component: `components/dashboard/ActivityFeed.tsx`
- Page: `app/dashboard/page.tsx`

---

### Phase 3 — New Pages (4-5 hours)

#### 7. Resources Page (`/dashboard/resources`)
**Mirror the desktop app's Resource Finder**
- 50+ curated FiveM resources
- Search, filter by category
- "Ask AI to install" button
- Download links

**Files:**
- `app/dashboard/resources/page.tsx`
- `components/dashboard/ResourceCatalog.ts`

#### 8. Players Page (`/dashboard/players`)
**Mirror the desktop app's Player Management**
- Online players list
- Search/filter
- Ban/unban with reason
- Player details modal

**Files:**
- `app/dashboard/players/page.tsx`
- `components/dashboard/PlayerList.tsx`

#### 9. Changes Page (`/dashboard/changes`)
**Enhanced version of the desktop Changes tab**
- Timeline view
- Diff preview (split/unified)
- Approve/deny all
- Rollback history

**Files:**
- `app/dashboard/changes/page.tsx`
- `components/dashboard/ChangePreview.tsx`

#### 10. Billing Page (`/dashboard/billing`)
**Current:** Settings has plan selector but no billing UI

**Add:**
- Current plan display
- Usage stats (AI actions used/limit)
- Upgrade/downgrade buttons
- Payment method display
- Invoice history

**Files:**
- `app/dashboard/billing/page.tsx`
- `components/dashboard/BillingCard.tsx`

---

### Phase 4 — Polish (2-3 hours)

#### 11. Loading States Everywhere
**Current:** Some pages have skeletons, some don't

**Add skeletons to:**
- Server detail page
- Chat messages
- Resource list
- Player list
- Changes list

#### 12. Error Boundaries
**Add:**
- Network error banners
- Retry buttons
- Fallback UI for Clerk auth errors

#### 13. Mobile Responsiveness
**Current:** Sidebar doesn't collapse on mobile

**Add:**
- Hamburger menu for mobile
- Collapsible sidebar
- Touch-friendly buttons

#### 14. Dark/Light Mode Toggle
**Current:** Hardcoded dark mode

**Add:**
- Toggle in settings
- Persist preference in localStorage
- Respect `prefers-color-scheme`

---

## File Change Summary

| File | Action |
|------|--------|
| `app/dashboard/servers/[serverId]/page.tsx` | **NEW** |
| `app/dashboard/resources/page.tsx` | **NEW** |
| `app/dashboard/players/page.tsx` | **NEW** |
| `app/dashboard/changes/page.tsx` | **NEW** |
| `app/dashboard/billing/page.tsx` | **NEW** |
| `components/dashboard/ActivityFeed.tsx` | **NEW** |
| `components/dashboard/ResourceCatalog.ts` | **NEW** |
| `components/dashboard/PlayerList.tsx` | **NEW** |
| `components/dashboard/ChangePreview.tsx` | **NEW** |
| `components/dashboard/BillingCard.tsx` | **NEW** |
| `app/page.tsx` | **UPDATE** (add sections) |
| `app/dashboard/page.tsx` | **UPDATE** (stats, activity) |
| `app/dashboard/servers/new/page.tsx` | **UPDATE** (better form) |
| `components/dashboard/SidebarNav.tsx` | **UPDATE** (new nav items) |

---

## Estimated Effort

| Phase | Hours | Priority |
|-------|-------|----------|
| 1 — Fill Gaps | 2-3 | Critical |
| 2 — Dashboard | 3-4 | High |
| 3 — New Pages | 4-5 | Medium |
| 4 — Polish | 2-3 | Low |
| **Total** | **11-15** | |

---

## Quick Wins (do these first)

1. **Server detail page** — 1 hour, biggest UX gap
2. **Pricing section on landing** — 30 min, revenue impact
3. **Stats cards on dashboard** — 30 min, immediate value
