-- ops-null-legacy-agent-hashes.sql
--
-- PURPOSE
--   Transitional escape hatch for the AGENT_LEGACY_OK flag flip.
--
--   Since the auth remediation (branch fix/audit-remediation), pairing claims
--   and POST /api/servers always mint a session token and store its sha256 in
--   agent_devices.pairing_token_hash. The WS gateway accepts a tokenless hello
--   only while AGENT_LEGACY_OK=true AND the device's stored hash is NULL.
--
--   The frozen Node CLI agent (apps/agent) never sends session tokens, so any
--   CLI device paired AFTER that deploy has a non-null hash and can no longer
--   connect — regardless of the flag.
--
--   THIS SCRIPT nulls those hashes so legacy CLI devices keep working during
--   the transition window. It does NOT touch devices created through the
--   desktop app or dashboard auto-pair (those receive tokens and must keep
--   their hashes).
--
-- RUNBOOK: see scripts/TRANSITION-RUNBOOK.md
--
-- SAFETY
--   - Read-only preview query included; run it first.
--   - Update targets ONLY rows with a non-null hash AND an old created_at
--     cutoff you control. Adjust @cutoff to "now" if you intend to null every
--     CLI-era row, but prefer narrowing by id list for surgical runs.
--   - Nulling a hash invalidates nothing else: the device keeps its id and
--     server binding. A later re-claim re-mints the hash normally.

-- Preview: which devices will be affected?
SELECT d.id,
       d.device_name,
       d.server_id,
       s.name            AS server_name,
       d.created_at,
       d.pairing_token_hash IS NOT NULL AS has_hash
FROM agent_devices d
JOIN servers s ON s.id = d.server_id
WHERE d.pairing_token_hash IS NOT NULL
  AND d.created_at < :'cutoff'::timestamptz
ORDER BY d.created_at DESC;

-- Apply: null the hashes so AGENT_LEGACY_OK accepts tokenless hellos again.
-- psql -v cutoff='2026-08-25T00:00:00Z' -f scripts/ops-null-legacy-agent-hashes.sql
UPDATE agent_devices d
SET pairing_token_hash = NULL
WHERE d.pairing_token_hash IS NOT NULL
  AND d.created_at < :'cutoff'::timestamptz;
