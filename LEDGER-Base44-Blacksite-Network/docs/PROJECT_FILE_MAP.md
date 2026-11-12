# Project file map

- `START_HERE.md` — easiest Base44 builder and native CLI routes
- `docs/BASE44_MASTER_PROMPT.md` — exhaustive Base44 AI-builder prompt
- `docs/FOLLOWUP_PROMPTS.md` — small sequential prompts for polishing after generation
- `docs/INTEGRATION_TRUTH.md` — what works without changing Discord LEDGER, and what requires an API
- `docs/LAUNCH_TESTS.md` — manual acceptance checklist
- `base44/config.jsonc` — Base44 project configuration, **must be linked to app**
- `base44/entities` — ten RLS-protected data models
- `base44/functions/state` — authenticates and returns web dossier, owned equipment, catalog, logs, rankings
- `base44/functions/action` — validates and performs purchases, upgrades, customization, deployment, settlement and redemption requests
- `base44/functions/galaxy` — unofficial HD2 community API caching and freshness labels
- `base44/shared/catalog.js` — original catalog definitions shared by server and UI
- `src` — React responsive interface and styling
- `public` — LEDGER logo and Blacksite Credits symbol
- `data` — CSV / JSON catalog files that can be uploaded to Base44 Builder to guide its generation

This package has no `.env`, bot token, OAuth secret or SQLite database. Never place those in public frontend assets.

## Additional Discord integration files (v0.2)

- `src/DiscordIntegrations.jsx`: identity, published-message feed and staff console UI.
- `base44/functions/discordStart/entry.js`: authenticated Discord OAuth initiation.
- `base44/functions/discordCallback/entry.js`: public OAuth code exchange and guild membership verification.
- `base44/functions/discordStatus/entry.js`: authenticated account/role recheck and unlink.
- `base44/functions/ledgerLive/entry.js`: cached read-only published Discord message mirror.
- `base44/functions/adminHub/entry.js`: server-enforced role-gated site staff actions and manual queue.
- `base44/entities/{DiscordOAuthState,DiscordIdentity,LedgerMirrorCache,WebAdminAudit,AdminActionRequest,BlacksiteAnnouncement}.json`.
- `docs/DISCORD_OAUTH_AND_LIVE_SYNC.md`: deployment secrets, redirect URL setup and validation.
- `docs/REAL_BOT_BRIDGE_SPEC.md`: design for actual wallet/command writes if you later permit a secure bridge.
- `tests/discord-integrations.test.mjs`: security and behavior tests with mocked Discord API.
