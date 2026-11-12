# START HERE: connect LEDGER Base44 site to Discord

1. **Keep your Discord LEDGER bot unchanged.** Do not paste secrets into the GitHub repository or the Base44 builder prompt.
2. In Base44, import/build the project and publish a site; use Base44 auth for website sign-in.
3. Deploy Base44 entities and backend functions. These need support for secrets and external HTTPS callbacks.
4. Open Base44's `discordCallback` function settings and copy its exact public HTTPS URL.
5. Discord Developer Portal → LEDGER → OAuth2 → General → Redirects → paste the callback URL exactly.
6. Base44 Secrets → set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `BLACKSITE_SITE_URL`, `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`, `LEDGER_MOD_ROLE_ID` and the four public channel IDs. See `docs/DISCORD_OAUTH_AND_LIVE_SYNC.md` for the full table.
7. Set `VITE_BASE44_APP_ID` in the frontend config. Check `Discord Access → Connect Discord Account` as a normal member, then as someone with the LEDGER role.
8. Open `Live LEDGER` and confirm existing bot embeds appear with original Discord links. Check timestamps and refreshing.
9. Open `Staff Console` with a moderator account. Publish a **site announcement**; verify it appears on the command center. Queue a manual bot action and confirm it is not silently marked paid.
10. Never report the website's simulated Blacksite Credits as the real Discord bot balance.

**Important:** This integrates Discord login **as an account link after Base44 sign-in**, not yet as the exclusive session authentication method. With an unchanged Railway bot, real balance and bot admin writes remain inaccessible; those require the optional bridge design explained in `docs/REAL_BOT_BRIDGE_SPEC.md`.
