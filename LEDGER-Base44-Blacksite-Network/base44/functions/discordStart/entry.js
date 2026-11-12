import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Discord OAuth is initiated only by an authenticated Base44 user. State is single-use,
// randomly generated, stored as a hash, and expires after ten minutes.
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function digest(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
Deno.serve(async req => {
  if (req.method !== 'POST') return Response.json({error:'POST required'}, {status:405});
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({error:'Sign in to Base44 before connecting Discord.'}, {status:401});
    const clientId = Deno.env.get('DISCORD_CLIENT_ID');
    const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');
    if (!clientId || !redirectUri || !redirectUri.startsWith('https://'))
      return Response.json({error:'Discord OAuth has not been configured by the site owner.'}, {status:503});
    const nonce = hex(crypto.getRandomValues(new Uint8Array(32)));
    await base44.asServiceRole.entities.DiscordOAuthState.create({
      stateHash:await digest(nonce), userId:String(user.id),
      expiresAt:new Date(Date.now()+10*60_000).toISOString(), usedAt:''
    });
    const url = new URL('https://discord.com/oauth2/authorize');
    url.search = new URLSearchParams({client_id:clientId, response_type:'code', redirect_uri:redirectUri, scope:'identify', state:nonce}).toString();
    return Response.json({url:url.toString()}, {headers:{'Cache-Control':'no-store'}});
  } catch(e) { return Response.json({error:'Discord connection could not start.'}, {status:500}); }
});
