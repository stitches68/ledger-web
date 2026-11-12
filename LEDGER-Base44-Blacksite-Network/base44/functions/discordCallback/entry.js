import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function digest(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
const jsonHeaders = {'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer'};
function redirect(status) {
  const site=Deno.env.get('BLACKSITE_SITE_URL');
  if (!site || !site.startsWith('https://')) return Response.json({error:status},{status:500});
  const url=new URL(site);url.searchParams.set('discord',status);
  return new Response(null,{status:302,headers:{...jsonHeaders,Location:url.toString()}});
}
Deno.serve(async req => {
  if (req.method !== 'GET') return Response.json({error:'GET required'},{status:405});
  const query = new URL(req.url).searchParams;
  if (query.get('error')) return redirect('cancelled');
  const state = query.get('state')||'', code=query.get('code')||'';
  if (!/^[a-f0-9]{64}$/.test(state) || !code || code.length>512) return redirect('invalid_request');
  try {
    const base44=createClientFromRequest(req);
    const db=base44.asServiceRole.entities;
    const matches=await db.DiscordOAuthState.filter({stateHash:await digest(state)});
    const record=matches[0];
    if (!record || record.usedAt || Date.parse(record.expiresAt)<Date.now()) return redirect('expired');
    // Invalidate before contacting Discord; rejects double-use even when the API is slow.
    await db.DiscordOAuthState.update(record.id,{usedAt:new Date().toISOString()});
    const clientId=Deno.env.get('DISCORD_CLIENT_ID')||'';
    const clientSecret=Deno.env.get('DISCORD_CLIENT_SECRET')||'';
    const redirectUri=Deno.env.get('DISCORD_REDIRECT_URI')||'';
    const guildId=Deno.env.get('DISCORD_GUILD_ID')||'';
    const botToken=Deno.env.get('DISCORD_BOT_TOKEN')||'';
    if (![clientId,clientSecret,redirectUri,guildId,botToken].every(Boolean)) return redirect('not_configured');
    const token=await fetch('https://discord.com/api/v10/oauth2/token',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({
        grant_type:'authorization_code',code,redirect_uri:redirectUri,client_id:clientId,client_secret:clientSecret
      })
    });
    if (!token.ok) return redirect('token_failed');
    const access=(await token.json()).access_token;
    const response=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:`Bearer ${access}`}});
    if(!response.ok) return redirect('identity_failed');
    const discord=await response.json();
    if (!/^\d{16,22}$/.test(String(discord.id))) return redirect('identity_failed');
    const member=await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discord.id}`,{
      headers:{Authorization:`Bot ${botToken}`}
    });
    if(!member.ok) return redirect('not_in_server');
    const current=await db.DiscordIdentity.filter({userId:record.userId});
    const other=await db.DiscordIdentity.filter({discordId:String(discord.id)});
    if(other.some(x=>x.userId!==record.userId)) return redirect('already_linked');
    const data={userId:record.userId,discordId:String(discord.id),username:String(discord.username||'').slice(0,80),
      globalName:String(discord.global_name||discord.username||'').slice(0,80),
      avatar:discord.avatar?`https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`:null,
      linkedAt:new Date().toISOString(),lastVerifiedAt:new Date().toISOString(),guildId};
    if(current.length) await db.DiscordIdentity.update(current[0].id,data);
    else await db.DiscordIdentity.create(data);
    return redirect('connected');
  } catch(e) { return redirect('link_failed'); }
});
