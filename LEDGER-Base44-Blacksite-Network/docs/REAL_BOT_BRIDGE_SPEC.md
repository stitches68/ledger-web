# Connecting the real Discord LEDGER database later

The current website does not have a network-accessible way to update the bot's Railway SQLite volume. It is not possible to obtain this just from the Discord Gateway, a bot token, or a Base44 database schema. A secure server-to-server adapter is required for **true** parity.

## Minimum safe API contract (not deployed)

A co-located Railway bridge, or a future native LEDGER bot API, should expose strictly allowlisted endpoints after mutual TLS, rotating signed service tokens or comparable authorization:

- `GET /v1/users/{discordId}/wallet` → authoritative balance, lifetime earnings, version, fetched time.
- `GET /v1/contracts` → canonical contract details, mission counts, objectives and submission state.
- `GET /v1/shops` → canonical individual and unit shop listings and stocks.
- `GET /v1/leaderboard` → canonical real-bot earnings, kills and stims.
- `POST /v1/admin/contracts` → create/close/reopen with an idempotency key and audit log.
- `POST /v1/admin/payments` → only an explicitly authorized actor, with confirmation, reason and double-payment protection.
- `POST /v1/admin/shop-items` → audited catalog/stock mutations.
- `POST /v1/admin/review` → review a proof submission.
- `POST /v1/admin/units` → role mapping and membership management.
- `POST /v1/admin/mentorships` → assignment, completion review, payout.

Security rules: **never** expose SQLite publicly; authenticate the web service, re-verify Discord moderator roles server-side, rate-limit requests, enforce idempotency keys, use database transactions for all money movement, and log actor IDs and before/after balances. Let the bot and website agree on a single canonical wallet. Do not treat web-game passive rewards as bot credits until a reconciliation policy is formally enabled.

The adapter is intentionally **not enabled** and no fake real-bot payments are made. Your Discord bot's currently published messages remain readable now through `ledgerLive` without a bot code update.
