# Auth Transition Runbook — flipping `AUTH_ALLOW_ANON` and `AGENT_LEGACY_OK`

This branch ships the orchestrator's real authentication (Clerk-verified bearer
tokens, per-org tenancy, agent session tokens) behind two transitional flags
that **default to `true`** so existing deploys keep working. This runbook is
the procedure for turning them off, in order, without breaking customers.

## Current posture while both flags are `true`

Be aware of what "true" means before flipping anything:

| Flag | Effect when true |
|---|---|
| `AUTH_ALLOW_ANON=true` | Any request with **no** Authorization header is treated as an anonymous user bound to the legacy `dev-org` tenant. Requests WITH an invalid/expired token are still rejected 401. |
| `AGENT_LEGACY_OK=true` | An agent WS hello with **no** session token is accepted **only if** the device's stored `pairingTokenHash` is NULL (i.e. paired before the token system existed). |

Known consequences while flags are true:

- Anonymous callers can create servers / write settings into the orphaned
  `dev-org` tenant (`POST /api/servers` etc.). No real customer data is
  reachable — every real Clerk-authenticated caller gets their own org — but
  anonymous writes are not blocked.
- `/ws/status` with no token returns an EMPTY list (safe-by-default since the
  fix wave); with a valid dashboard token it returns that org's servers.
- Desktop agents paired through the dashboard auto-pair or a pairing claim
  hold a session token in `%APPDATA%\nox-agent\config.json` and present it at
  every hello.

## Prerequisite checklist (do these BEFORE any flip)

1. **Run the DB migration** (if not already applied):
   `pnpm db:migrate` (or `prisma migrate deploy` on the VPS). The `app_users`
   table must exist or provisioning fails for every authenticated caller.
2. **Deploy the web dashboard from this branch.** It attaches fresh Clerk
   tokens to every orchestrator call (`lib/auth-fetch.ts`) and passes
   `?token=` on the `/ws/status` upgrade URL. Flipping `AUTH_ALLOW_ANON=false`
   against an old web build = silent empty dashboards everywhere.
3. **Verify one end-to-end flow manually**: sign into the dashboard, open the
   Servers page, confirm data loads (proves token → provisioning → org scoping
   works for your account).
4. **Desktop app**: build/deploy the Tauri agent from this branch (per-request
   tokens + config persistence + auto-pair token capture are all required).
   Old desktop builds cache tokens once and will 401 after ~60s.
5. **CLI agents**: decide their fate (see CLI section below).

## Flip 1: `AUTH_ALLOW_ANON=false`

Cuts anonymous access to the orchestrator. Safe once step 2-3 above are done.

```bash
# vps/docker-compose.yml: AUTH_ALLOW_ANON: "false"
docker compose up -d orchestrator
```

Rollback = flip back to `"true"`. Nothing is destroyed by either direction;
the flag only changes how headerless requests are classified.

## Flip 2: `AGENT_LEGACY_OK=false`

Requires that EVERY device expected to connect has a non-null hash AND its
operator holds the matching session token:

- Devices paired via desktop claim/auto-pair AFTER this branch: fine (token in
  config.json).
- Devices paired via dashboard auto-pair BEFORE this branch deployed: hash was
  NULL then; if they re-connected after the deploy of commit `0f4cee3`+ they
  got a minted token on server creation only if created via POST /api/servers.
  Pre-existing NULL-hash devices that never re-paired will be REJECTED once
  the flag flips. Re-pair them (new pairing code → claim) before flipping.
- Frozen Node CLI devices: see below — new pairings are broken regardless of
  this flag; old pairings need the ops script.

### The frozen Node CLI agent (apps/agent)

The CLI is frozen (no further development) and never persists or sends
session tokens:

- **New CLI pairings are dead** as soon as a pairing claim stores a hash —
  which is always, post-remediation. `fivem-agent pair` completes, saves
  serverId/deviceId/wsUrl, sends a tokenless hello, gets INVALID_TOKEN, exits.
  There is no flag that fixes a fresh CLI pairing. **Treat the CLI as EOL for
  new pairings** — direct users to the desktop installer.
- Existing CLI devices (paired pre-remediation, hash NULL): keep working while
  `AGENT_LEGACY_OK=true`. If you must extend their life past a flag flip (not
  recommended), null their hashes first with
  [`scripts/ops-null-legacy-agent-hashes.sql`](ops-null-legacy-agent-hashes.sql)
  (preview query included; narrow by `created_at` cutoff or id list).

## Post-flip verification

1. Dashboard: servers/changes/players/audit all load with real data.
2. `/ws/status` badge shows connected state for a signed-in org.
3. Desktop agent connects, hello accepted, chat + apply work; apply creates a
   checkpoint commit on the customer's repo before patching files.
4. Deliberately Disconnect in the desktop app stays disconnected.
5. Orchestrator logs show no repeated INVALID_TOKEN / ALREADY_CONNECTED churn.

## Related operational notes

- Rotation still owed (secrets were scrubbed from git but remain recoverable
  in history): Supabase password, both Clerk test keys, JWT_SECRET.
- `OMNI_KEY` was renamed to `OMNIROUTE_API_KEY` in vps/docker-compose.yml —
  update any external secret store referencing the old name.
- txAdmin features (ban/unban/restart/listPlayers via txAdmin) require
  `useTxAdmin`, `txadminUrl`, `txadminApiKey` keys inside the server's
  settings JSON; there is no UI yet — set them directly in the DB until a
  settings surface lands.
