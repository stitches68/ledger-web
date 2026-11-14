# Galactic Operations — architecture and operational truth

LEDGER's Galactic Operations page is a working tactical chart plus a private fleet
simulation layered over the live Helldivers 2 community war feed.

It is deliberately split into two truths:

| Layer | Source | Affects the game? |
|---|---|---|
| Planetary control, liberation/defense, divers, hazards, events, waypoints, Major Order, DSS presence | `api.helldivers2.dev` community API | No — read-only |
| LEDGER deployments, battles, salvage, task forces, rewards, lore | LEDGER simulation (`base44/functions/galaxyOps`) | No — fictional, web-only |

## Community war feed

`base44/functions/galaxy/entry.js`

- Endpoints: `/api/v1/planets`, `/api/v1/campaigns`, `/api/v1/assignments`,
  `/api/v2/space-stations`.
- Every request sends `X-Super-Client: LEDGER-Blacksite-Network` and an
  `X-Super-Contact` value. Override with `HD2_SUPER_CLIENT` / `HD2_SUPER_CONTACT`
  environment variables if LEDGER's contact URL changes.
- The community API allows **5 requests / 10 seconds**. LEDGER fetches four
  endpoints per refresh and never per user: the bundle is cached in
  `LedgerMirrorCache` (`hd2-galaxy-bundle-v3`) for **90 seconds**.
- A 429 waits for `Retry-After` (max 10s) once. Optional endpoints fail soft:
  campaigns, Major Order or DSS telemetry can be absent without losing planets.
- Freshness is always explicit: `LIVE`, `CACHED`, or `UNAVAILABLE`. A cached
  bundle older than 30 minutes is returned with `UNAVAILABLE` + `stale: true`,
  its original `capturedAt`, and a human-readable warning. No fabricated planets
  are ever substituted.
- Planet identity is the community feed's numeric `index` (`planetId`) plus the
  feed `hash`. Deployments store both, so an operation stays attached to the
  correct world across refreshes.
- Liberation is shown as **LIBERATION** on enemy worlds and **DEFENSE
  INTEGRITY** on Super Earth worlds. Positions and ownership come from the feed;
  the UI states that they are not official Arrowhead data.

### Local/preview feed

Without a Base44 session the browser calls the same four endpoints directly with
the same headers (`src/galaxy/feed.js`). This is labelled `DIRECT READ` on the
chart. Requests run in parallel with a 9-second timeout each, and the last bundle
is cached in `localStorage` for 90 seconds with a 30-minute stale window. This
preview path is not used once the Base44 function answers.

## Simulation engine

`base44/functions/galaxyOps/entry.js` is self-contained (no cross-directory
imports) and validates every intent server-side:

- **Deploy** — asset ids must belong to the caller, be in `HANGAR`, and have
  < 80% damage. Planet data must exist in the cached community bundle. Travel is
  derived from the asset's speed and the planet's distance (2–30 minutes). The
  asset is marked `DEPLOYED`; `action` settlement explicitly skips assets with a
  live galactic deployment so patrol income can never be earned twice.
- **Arrival** — in-transit deployments flip to `ACTIVE` when `arrivesAt` passes
  and emit a dispatch transmission.
- **Settlement** — every 15 minutes (staff-configurable) each active deployment
  resolves a deterministic battle cycle using hull, firepower, shields, damage,
  supplies, crew, faction, threat and mission type. At most four cycles settle per
  call. Settlement acquires a token on the deployment record, re-reads it to
  confirm ownership of the token, derives an idempotency key
  `deployment:fromTick:toTick`, refuses to create a second report for that key,
  then writes the report and credits the web wallet once.
- **Rewards** — gross recovery is capped by `payoutCap` per settlement and
  reduced by maintenance. Everything credited is written to `WalletEvent` as
  `GALACTIC_OPERATION` and is labelled **PENDING_RECONCILIATION**. It is website
  currency only. No Discord LEDGER balance moves and no official Helldivers
  mission result is claimed.
- **Refit** — rename, paint, repair, restock, role, crew and module install all
  re-check ownership. Repair/restock charge the web wallet. Modules must already
  be requisitioned (`OwnedEquipment`).
- **Task forces** — owner-scoped groups (max 8 assets). A contractor can never
  control another contractor's equipment; unit-owned assets stay under their
  owner.
- **Admin** — `admin_*` actions call the configured Discord guild membership and
  require `LEDGER_MOD_ROLE_ID` on every request. Config, events, cancellation and
  economy holds write to `WebAdminAudit`. Event multipliers apply only to their
  target planet and expiry window.

### Data model additions

| Entity | Purpose |
|---|---|
| `GalacticDeployment` | Placement, transit, condition, settled tick, token, projected/earned credits |
| `GalacticBattleReport` | Immutable after-action report with `settlementKey` and reconciliation state |
| `GalacticTaskForce` | Owner-scoped grouping of deployed/available assets |
| `GalacticOpsConfig` | Reward multiplier, cap, maintenance, cycle length, pause, season, events |
| `GalacticTransmission` | Dispatch traffic and lore fragments (owner-scoped + global) |

`OwnedAsset` gains `level`, `crew`, `supplies`, `role`, `taskForceId`,
`galacticSorties` and `lastMaintenanceAt`. `ContractorProfile` gains
`galacticEarned` and `galacticSorties`.

## Autonomy and scheduling

Battles resolve inside the server function; the browser never calculates a
payout. `galaxyOps {type:'state'}` auto-settles up to three due deployments each
time it is read, and `{type:'settle'}` settles on demand. For progress while
nobody is on the site, schedule a server invocation of `galaxyOps` with
`{type:'state'}` (or a small cron wrapper) on Base44. Settlement windows are
based on `Date.now()` on the server, so changing the client clock or opening
multiple tabs cannot farm rewards; the token + idempotency key prevent
double-crediting the same window.

## Admin command center

Only a verified LEDGER moderator sees the command button. The overlay exposes:

- reward multiplier, payout cap, maintenance rate, cycle minutes, season, pause
- fictional special events (title, target planet, multiplier, duration)
- unreconciled totals, pending claims, recent reports, hold-for-review
- active deployments with cancel

A missing bot token, guild id or moderator role id returns a denial; the UI never
treats a hidden button as authorization.

## Verification checklist

1. Chart loads with planet markers, sector hulls, campaigns, Major Order, DSS (when present).
2. Search a planet, select it on the map, confirm the target panel shows live owner/liberation/divers/hazards.
3. Deploy an owned, undamaged asset: confirm transit countdown, dispatch transmission, and asset status.
4. Settle: confirm one after-action report per tick window; refresh and settle again — no duplicate payout.
5. Confirm rewards appear in `WalletEvent` and remain `PENDING_RECONCILIATION`.
6. Refit a recalled asset: rename, paint, role, crew, module; confirm persistence after reload.
7. Mobile 375px: no horizontal scroll; map, tabs and deployment flow usable.
8. Admin: role removal must deny the next privileged call.
