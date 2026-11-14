# LEDGER // BLACKSITE NETWORK — Base44 Edition

A native Base44 project starter with a dark, responsive mercenary black-market interface, 34 assets (ships, stations, ground squads), 24 upgrade modules, 30 fictional weapons, private hangar, galactic map, web economy, dossiers, leaderboards, contracts and original lore.

**First step:** Read `START_HERE.md`. Two paths are provided: copy the master prompt into Base44 AI Builder, or link and deploy the native source using the Base44 CLI.

The existing Discord LEDGER bot is **unchanged**. Real Discord credit balances are not synchronized. Web-only Blacksite Credits, simulations, and submitted reward requests are separate and clearly labeled.

This project is a functional implementation starter, not a claim of a published/production-tested Base44 app. You must authenticate, deploy and test on your own Base44 account. See `docs/INTEGRATION_TRUTH.md` for limits and security caveats.

## Galactic Operations

The **Galactic Operations** page is a working tactical war chart built on the community Helldivers 2 API, with LEDGER's own persistent fleet simulation layered over it: deployments, autonomous battles, after-action reports, task forces, refits and web-only rewards. Live war data is cached server-side and always labelled `LIVE`, `CACHED` or `UNAVAILABLE`; fictional LEDGER activity never changes the real war.

Read **`docs/GALACTIC_OPERATIONS.md`** for the feed contract, caching, settlement idempotency, reward/reconciliation rules, admin verification and the verification checklist.

## Discord-linked website update

This build adds **Discord account linking**, live read-only mirrors of LEDGER's contract/leaderboard/shop Discord posts, server-enforced LEDGER moderator role gating, a staff console for website announcements, and a manual Discord action queue. **No change to the existing Discord bot code is required.**

Read **`SETUP_DISCORD_INTEGRATION.md`** for the step-by-step setup and **`docs/DISCORD_OAUTH_AND_LIVE_SYNC.md`** for all required secrets and security rules.

**Explicit limit:** Discord OAuth here links a Discord identity to a Base44-authenticated session. It is not a standalone Discord-only login. Existing Discord SQLite balances and real bot admin commands remain inaccessible unless a secure bridge is later deployed. Staff actions are visibly manual, not fake bot transactions.
