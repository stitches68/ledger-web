# Base44 Follow-up prompts — send these ONE AT A TIME

If Base44 completes its first pass but some screens/actions are only decorative, send the prompts below in sequence. Work on a branch or snapshot before large revisions.

## 1 — Make gameplay real
Audit every purchase, asset refit, color selection, deployment and return control. Replace fake frontend values with authenticated Base44 entity writes through protected backend functions. Reject insufficient funds, cross-user asset edits and incompatible gear. Persist every change and show confirmation receipts. WEB credits are simulation funds ONLY; do not alter Discord LEDGER data. Test two accounts.

## 2 — Make the hangar impressive
Build a detailed hangar inspector with category-specific 2D silhouettes: carrier with launch decks, corvette with strike profile, medevac dropship, orbital mobile hospital, tanks and armored mercenary units. Expand shields, weapons, armor, engines, utilities and paint schemes, showing stat deltas, rarity, purchase costs and ship-class compatibility. Add mobile-friendly bottom sheet and make every slot functional.

## 3 — Galactic map and passive simulation
Create a tactical galactic map reading the community HD2 planet feed from protected server functions; cache 10 minutes. Label API freshness. Add autonomous deployment orders and a server workflow every 30 minutes for mission outcomes, damage, web credit earnings and contract progress. Never use client timers for currency or label simulated battles as part of real HD2.

## 4 — Real contracts and staff control
Build admin-only create/edit/publish/close contract flows. Allow 1–25 required patrols, repeatable flag, target conditions and smaller sub-objective bonuses. Progress must be stored per user/per contract/per cycle. Use server-side payout validation and idempotency. Create a live contract dispatch board that updates from accepted simulator results and separately displays optional read-only Discord contract announcements when integrated.

## 5 — Better dossiers and rankings
Create attractive editable contractor cards with callsign, insignia, motto, unit, biography, battle honors, asset collection, career stats and web wallet. Add multiple leaderboard tabs with clearly labeled data source. Add an optional secured Discord OAuth identity link without assuming that Discord user authentication grants SQLite database access.

## 6 — Broker tone and visual polish
Replace generic app language with concise original clandestine broker copy. Apply dark green #080D0B + #91F71F palette, Barlow Condensed titles, IBM Plex Mono metadata, clean borders, subtle glows and scanline accents. Add 8 original lore drops, optional easter eggs, 2 polished empty states per page, accessibility for keyboard and screen readers, and responsive layouts. No copyrighted S.C.O.U.T. art or branding.

## 7 — Security and launch readiness
Run Base44 security scan and tests. Verify user-owned entity RLS, server-only wallet mutations, admin-only settings, purchasing concurrency/idempotency, no exposed secrets, input sanitization, proper API rate limits, disconnected Discord labels, transaction audit logs, and no unsupported claims about integration. Fix all red findings and test with two ordinary users plus one staff account.
