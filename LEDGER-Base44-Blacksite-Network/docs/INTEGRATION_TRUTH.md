# Integration truth table — LEDGER Base44 + Discord

| Feature | Current code | Live deployment status |
|---|---|---|
| Existing web hangar, ships, simulated credits, dossiers | Base44 implementation retained | Requires Base44 deployment and testing |
| Discord identity | Real OAuth2 authorization-code **account linking** after Base44 login | Requires callback URL and OAuth app secrets |
| Discord-only standalone login | **Not implemented** | Depends on supported Base44 custom auth/session provider |
| Discord guild membership | Verified through the existing bot's REST API | Requires secret bot token and guild ID |
| LEDGER moderator role | Checked live on server before EVERY admin action | Requires real role ID; never trust browser values |
| Published Discord contract embeds | Read-only Discord REST mirror | Configure public contract channel ID |
| Published leaderboard messages | Read-only Discord REST mirror | Configure leaderboard channel ID |
| Individual and unit store embeds | Read-only Discord REST mirror | Configure store channel IDs |
| Refresh frequency | Browser polls every ~30 seconds, shared cache reduces Discord requests | Only while browser is open; may serve stale data |
| Real Discord LEDGER wallet | **Unavailable** | The bot's SQLite DB is in a separate Railway volume |
| Linked Discord balance display | Owner submits a claimed balance; an `AdminActionRequest` queues staff verification | Never reads or moves bot credits; staff must verify in Discord |
| Unit hangar and shared web operations | Server-scoped by the self-declared profile unit label; shared progress from settled patrol cycles | Web simulation only; Discord unit roles verified separately by OAuth |
| Discord bot administrative writes | **Unavailable** | Requires co-located authenticated API bridge or shared database |
| Website staff actions | Publish website announcements, review web claims, queue/copy Discord staff commands | Implemented but needs live tests |
| Discord member role revoked | Admin hub access denied on next role check | Must be tested on deployment |
| Bot source changes | None required for read-only integration | Existing Railway LEDGER remains unchanged |

**Critical:** The staff request queue never applies Blacksite Credits to the Discord bot. A request marked completed means a staff member reports completing it separately using the Discord bot command. This is deliberately not a fake payment confirmation.
