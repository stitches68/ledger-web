# Before publishing LEDGER — Base44 Test Matrix

Use **Test Data** in Base44 where available, and at least two ordinary user accounts and one admin.

| Area | Test | Expected |
|---|---|---|
| Account | New account opens app | A separate WEB-wallet dossier is created exactly once |
| Preview | No Base44 login | Site shows clearly identified demo values and disables real purchases |
| Purchasing | Buy a ship within web budget | Server deducts price, creates only buyer-owned asset and wallet event |
| Funds | Try to buy an unaffordable ship | Denied, funds and assets unchanged |
| Ownership | User B tries user A asset ID | Denied; no edit/deploy/repair possible |
| Refit | Buy mod, equip compatible class | Server verifies ownership and updates asset loadout |
| Refit | Equip while deployed | Denied |
| Cosmetic | Rename/repaint ship | Persists across reload; visual inspector updates |
| Patrol | Deploy asset to a listed planet | Only owner's asset status changes |
| Patrol | Settle before 30 minutes | No earnings |
| Patrol | Settle after 30+ minutes | Only actual elapsed server-side ticks pay |
| Patrol | Repeated immediate settle | No duplicate tick payouts |
| Contracts | Accept 1 web contract | Progress one cycle at a time; another active contract denied |
| Contracts | Return after enough patrol ticks | Exactly one base reward and progression marked complete |
| Contracts | Repeatable vs one-time | Repeatable restarts, one-time blocks new cycle |
| Global feed | HD2 API available | Community source, capture timestamp, and current planets displayed |
| Global feed | API offline | Explicit OFFLINE/CACHED label; do not imply simulated war is live |
| Dossier | Edit callsign/motto | Only allowlisted text/cosmetic fields modified |
| Leaderboards | Open web leaderboard | Only sanitized public fields displayed; private email/Discord key hidden |
| Redemption | Request staff review | Web escrow/PENDING status, **no Discord transfer claimed** |
| Data security | Base44 security scan | No public entity writes to wallets, inventory, payout tables |
| Concurrency | Two purchases with one balance | MUST be reviewed for atomicity before public launch |
| Authenticity | Real Discord BOT stats | Show NOT SYNCED until secured read-only integration |

**Current tests run:** Base44 local source entity JSON parse, backend syntax parse, React JSX TS parser, package structure. The actual Base44 deployment, real Discord OAuth, live HD2 API response shape and multi-user race conditions have NOT been tested here. See `docs/INTEGRATION_TRUTH.md`.
