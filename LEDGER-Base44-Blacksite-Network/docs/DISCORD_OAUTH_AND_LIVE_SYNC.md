# LEDGER | Discord OAuth, Live Mirror, and Staff Console

This is a **Base44 web app integration**. It does **not** modify, replace, or restart the existing Railway-hosted LEDGER Discord bot.

## Deployment requirements

1. Publish this website on Base44 and establish its regular Base44 authentication. Users must sign into Base44 first. This package supports **Discord account linking**, not replacing the Base44 session with native Discord-only sign-in. Native Discord-only sign-in requires a supported custom authentication provider/session integration and has **not** been implemented here.
2. Deploy the six Base44 backend functions `discordStart`, `discordCallback`, `discordStatus`, `ledgerLive`, `adminHub`, plus existing `state`, `action`, `galaxy`.
3. Deploy the six new Base44 entities `DiscordOAuthState`, `DiscordIdentity`, `LedgerMirrorCache`, `WebAdminAudit`, `AdminActionRequest`, `BlacksiteAnnouncement`.
4. Open Base44 **Code → Functions → discordCallback** and get its **exact public HTTPS function URL**. Do not guess a function URL; the function URL must be externally reachable via GET.
5. In the Discord Developer Portal, open the existing LEDGER application → **OAuth2 → General**, add that URL as an **exact Redirect**. Get Client ID and Client Secret there. The Discord application must still be installed as a bot in your REAPER server.
6. Add the following Base44 backend **Secrets**. Never add these secrets as `VITE_` variables, in frontend code, in GitHub, or in a public prompt:

| Secret | Value |
|---|---|
| `DISCORD_CLIENT_ID` | Discord application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret |
| `DISCORD_REDIRECT_URI` | Exact public `discordCallback` function URL registered in Discord |
| `BLACKSITE_SITE_URL` | Published Base44 website HTTPS URL (used for safe return redirects) |
| `DISCORD_GUILD_ID` | REAPER Discord server ID |
| `LEDGER_MOD_ROLE_ID` | Existing LEDGER moderator Discord role ID |
| `DISCORD_BOT_TOKEN` | Existing LEDGER bot token, stored only as a secret; used for REST read and guild role checks |
| `LEDGER_CONTRACT_CHANNEL_ID` | Discord channel with LEDGER contract board messages |
| `LEDGER_LEADERBOARD_CHANNEL_ID` | LEDGER top-earners channel |
| `LEDGER_CONTRACTOR_SHOP_CHANNEL_ID` | Individual store channel |
| `LEDGER_UNIT_SHOP_CHANNEL_ID` | Unit store channel |

Optional: `LEDGER_UNIT_ROLE_MAP` as a JSON object of role ID → unit name, e.g. `{"123456789012345678":"ANGEL","234567890123456789":"HELLHOUND"}`. Do **not** put that JSON in the frontend. The `discordStatus` function displays recognized units using the live role list.

The frontend also needs **`VITE_BASE44_APP_ID`** from your connected Base44 app in the frontend environment. The app ID is public; it is **not** a secret.

### Do not confuse these two different paths

`DISCORD_REDIRECT_URI`: **server function URL** that receives Discord's OAuth code.

`BLACKSITE_SITE_URL`: **website home URL** that users return to *after* the server function exchanges that code securely.

### Logging in

- Open the published website.
- Sign in using the supported **Base44 login**.
- Open **Discord Access → Connect Discord Account**.
- Authorize the `identify` scope on Discord. LEDGER checks that account exists in your specified guild via the already-installed Discord bot.
- Return to the website; the link and role clearance are saved on the server. Staff console appears only when the member possesses `LEDGER_MOD_ROLE_ID`.

The Discord account is never chosen by typing a username or entering a Discord ID in the browser. The ID is taken from Discord OAuth `/users/@me` and verified against server membership. User secrets/access tokens are not stored in the frontend.

### Live contracts / markets / leaderboard

- **Live LEDGER** reads the existing bot's **published Discord embeds** via server-side Discord REST (not via its SQLite database).
- Refresh occurs about **every 30 seconds** while the website is open and the Discord user is verified. An application-level cache reduces Discord API traffic.
- Contracts, leaderboards, and both shops are shown as **read-only previews with links back to the original Discord messages**. They may contain embedded text and fields; there is no promise that all messages can be converted into a precise contract/price schema.
- This channel data is **near-live**, not guaranteed real-time. A cached or unavailable label must be visible if API calls fail.
- The website's fleet economy is independent. **WEB BC must never be represented as Discord LEDGER BC**.

### Moderator console

- The staff entry appears only when live Discord role checks confirm `LEDGER_MOD_ROLE_ID`.
- Every call to `adminHub` performs the same **server-side guild role check**, so hiding the menu is not the security boundary.
- Staff can publish **website announcements**, queue manual Discord actions and view/review website redemption claims.
- **Queued manual actions do not execute Discord slash commands**. The site displays the correct command to copy and records who requested it and when. Staff must complete those requests in Discord and then mark them complete in the queue.
- **Real bot administrative writes, contract approvals, balance adjustments, shop stock edits, and mentor payouts cannot be carried out by a separate Base44 app without a supported write API** to the bot's real database. The bot currently runs SQLite on a different Railway volume. Giving the website a Discord bot token does not enable executing slash commands or writing directly to that volume.
- To enable full real-bot parity later, a secure and audited bridge must be deployed **alongside the existing Railway bot process** or LEDGER must adopt a mutually accessible API/database. This requires *some* server-side integration, even if the Discord bot's command code isn't replaced.

### Verification checklist

1. A user without a Base44 session cannot initiate account linking.
2. OAuth state must be random, single-use and expire after 10 minutes.
3. Linking one Discord ID to two different Base44 users must be denied.
4. A server outsider must be denied.
5. A regular member can see the read-only mirror, but cannot access `/adminHub`.
6. If a moderator loses the LEDGER Discord role, next `adminHub` request fails with 403.
7. Real SQLite balances show **Not connected**, never zero or the web-wallet value.
8. Revoke the Discord OAuth app and test re-linking.
9. Confirm contract/shop posts originate from the genuine LEDGER bot author ID.
10. Deploy on a throwaway Base44 app before using your real community.

## Scope and security notes

- The Discord bot token can read member roles and channels; protect it as carefully as the Railway token. Use the minimum Discord permissions; never display it in screenshot/debug logs.
- Avoid showing private proof-review channel content in public mirrors. This implementation only takes the four configured public channels.
- Changing server roles must be enforced by Discord immediately at next request, not trusted from a stored profile flag.
- Backend functions are required; check your Base44 plan for functions/secrets availability.
- This is source code to deploy and verify, **not a claim of a completed live Base44 OAuth launch**.
