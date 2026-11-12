# LEDGER // Base44 Blacksite Network — START HERE

This is a **Base44-native starter source project**, PLUS a full Base44 AI Builder instruction pack. It is not a Railway app and does not require changing your existing Discord bot.

## Fastest no-code route: Base44 AI Builder
1. Go to https://app.base44.com and create a **new app**. Do not edit the currently running Railway Discord bot.
2. Open `docs/BASE44_MASTER_PROMPT.md` and paste its entire contents into Base44's new-app build prompt. You can use Plan mode first.
3. Optionally attach `public/ledger_logo.png`, `public/blacksite_credits.png`, `data/assets.csv`, `data/mods.csv`, and `data/weapons.csv` as reference files.
4. Let Base44 generate the app, test all pages, and use `docs/FOLLOWUP_PROMPTS.md` one section at a time to finish functions. Check the Security/Data permissions screen before publishing.
5. Publish through Base44. The generated site will not automatically have access to your Discord bot's SQLite database. See `docs/INTEGRATION_TRUTH.md`.

## Developer route: run this native source in Base44
This repository already contains `base44/config.jsonc`, entity schemas, three Base44 server functions, a React/Vite frontend, and original catalog data. It has **not** been linked to your Base44 account.

Requires Node.js 20.19+ and a Base44 account.
```bash
npm install -g base44@latest
base44 login
# from the root of THIS project, which already has base44/config.jsonc:
base44 link --create --name ledger-blacksite-network
npm install
base44 deploy --build
```
Alternatively, link an existing Base44 app using `base44 link --app-id YOUR_BASE44_APP_ID` and deploy. Do not create a duplicate app when you intend to link an existing one. Base44 creates `base44/.app.jsonc` automatically; never put secrets in that file or commit it.

If your app's settings require privacy configuration or auth provider selection, set **Private/invite-only** during initial testing. The React frontend uses `VITE_BASE44_APP_ID` injected by Base44's build tooling.

### Source structure
```
base44/config.jsonc             Base44 project manifest
base44/entities/*.json          10 managed entity schemas with RLS
base44/functions/state          Authenticated dossier/fleet/catalog snapshot
base44/functions/action         Server-authorized web purchases, paint, deploy, refit, claim/patrol settlement
base44/functions/galaxy         Cached unofficial HD2 community planet feed
base44/shared/catalog.js        34 asset types, 24 equipment modules, 30 fictional weapons
src/App.jsx                     Responsive full site
src/style.css                   Black/green visual system
public/                         LEDGER logo and Blacksite Credits emblem
data/*.csv                       Original fictional catalogs
```

### Functional status
The source contains a complete React page layout and server-side **prototype** mechanics for account creation, web balances, purchases, catalog ownership, asset painting, renaming, equipment installation, repairing, deployment, passive earnings on return, contract progress and optional manual redemption requests. Live HD2 API retrieval is implemented with explicit freshness markers and a cache; it needs testing after Base44 deployment.

**Not implemented / not automatic**: Discord bot database synchronization, true Discord single-sign-on, real screenshot OCR from your Railway bot, live game-wars influenced by your simulated assets, a transactionally locked multi-user economy, scheduled Base44 workflows (configure in Base44), and full 3D ship models. The demo profile/images visible before login are non-persistent preview data.

### After launch
- Verify the website as an ordinary logged-in user, and test with a second account to check permission isolation.
- Check Base44 entity rules, secrets, logs and security scan.
- In Base44 workflows, schedule a 30-minute authorized maintenance process only after implementing an idempotent worker for many users (this package settles elapsed simulated patrols on the server when a user returns).
- Add your own original ship schematic/icon artwork later; the current game uses vector/CSS silhouettes.
- Never upload `DISCORD_TOKEN`, SQLite files, or OAuth client secrets into this React repository or Base44 browser code.

## Discord integration / moderator hub

For the new OAuth link, live published-message feeds and Discord-role-gated staff console, follow `SETUP_DISCORD_INTEGRATION.md`. The real Discord bot remains unchanged. This package does **not** grant the website direct access to Railway SQLite balances or real-bot credit issuance.
