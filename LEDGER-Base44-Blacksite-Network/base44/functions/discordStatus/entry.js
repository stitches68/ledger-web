import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
Deno.serve(async req => {
 try {
   if(req.method!=='POST') return Response.json({error:'POST required'},{status:405});
   const client=createClientFromRequest(req), user=await client.auth.me();
   if(!user?.id) return Response.json({linked:false,isAdmin:false,authenticated:false},{status:401});
   const db=client.asServiceRole.entities;
   const identity=(await db.DiscordIdentity.filter({userId:user.id}))[0];
   const body=await req.json().catch(()=>({}));
   if(body.action==='unlink'){
     if(identity)await db.DiscordIdentity.delete(identity.id);
     return Response.json({linked:false,isAdmin:false,authenticated:true});
   }
   if(!identity)return Response.json({linked:false,isAdmin:false,authenticated:true,reason:'Discord not connected'});
   const botToken=Deno.env.get('DISCORD_BOT_TOKEN')||'';
   const guildId=Deno.env.get('DISCORD_GUILD_ID')||'';
   const modRole=Deno.env.get('LEDGER_MOD_ROLE_ID')||'';
   if(!botToken||!guildId) return Response.json({linked:true,isAdmin:false,verified:false,username:identity.globalName,reason:'Discord role checking not configured'});
   const resp=await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${identity.discordId}`,{
     headers:{Authorization:`Bot ${botToken}`},signal:AbortSignal.timeout(8000)
   });
   if(!resp.ok) return Response.json({linked:true,isAdmin:false,verified:false,reason:resp.status===404?'Not in the configured server':'Discord verification temporarily unavailable'});
   const member=await resp.json();
   let unitRoleMap={};
   try {const parsed=JSON.parse(Deno.env.get('LEDGER_UNIT_ROLE_MAP')||'{}');
     if(parsed && typeof parsed==='object' && !Array.isArray(parsed))unitRoleMap=parsed;
   } catch (_) {unitRoleMap={};}
   const units=[...new Set((member.roles||[]).filter(id=>Object.hasOwn(unitRoleMap,id)).map(id=>String(unitRoleMap[id]).slice(0,48)))];
   return Response.json({linked:true,authenticated:true,verified:true,isAdmin:Boolean(modRole&&(member.roles||[]).includes(modRole)),
     discordId:identity.discordId,username:member.nick||identity.globalName||identity.username,
     avatar:identity.avatar,units,moderatorRoleConfigured:Boolean(modRole)},
     {headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:'Discord account check unavailable',isAdmin:false},{status:503});}
});
