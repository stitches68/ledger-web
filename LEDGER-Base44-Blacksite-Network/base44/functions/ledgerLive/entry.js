import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Read-only Discord REST mirror. NEVER claims to read the bot's local SQLite database.
const safe = (v,n=600) => String(v??'').slice(0,n);
const channels = [
  ['contracts','LEDGER_CONTRACT_CHANNEL_ID'],['leaderboard','LEDGER_LEADERBOARD_CHANNEL_ID'],
  ['contractorShop','LEDGER_CONTRACTOR_SHOP_CHANNEL_ID'],['unitShop','LEDGER_UNIT_SHOP_CHANNEL_ID']
];
const tid = v => /^\d{16,22}$/.test(String(v||''));
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return Response.json({error:'POST required'},{status:405});
  const app=createClientFromRequest(req),user=await app.auth.me();
  if(!user?.id)return Response.json({error:'Sign in to Base44 first.'},{status:401});
  const db=app.asServiceRole.entities;
  const linked=(await db.DiscordIdentity.filter({userId:user.id}))[0];
  if(!linked)return Response.json({error:'Connect Discord to see live LEDGER messages.',configured:false},{status:403});
  const token=Deno.env.get('DISCORD_BOT_TOKEN')||'';
  const guildId=Deno.env.get('DISCORD_GUILD_ID')||'';
  if(!token||!tid(guildId))return Response.json({error:'Discord mirror is not configured.',configured:false},{status:503});
  const memberResp=await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${linked.discordId}`,{
    headers:{Authorization:`Bot ${token}`},signal:AbortSignal.timeout(7000)
  });
  if(!memberResp.ok)return Response.json({error:'Discord server membership could not be verified.'},{status:403});
  let cache=(await db.LedgerMirrorCache.filter({cacheKey:`guild-${guildId}`}))[0];
  const age=cache?Date.now()-Date.parse(cache.fetchedAt):Infinity;
  if(cache&&age>=0&&age<30_000)return Response.json({...cache.payload,freshness:'CACHED',ageSeconds:Math.round(age/1000)});
  const self=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:`Bot ${token}`},signal:AbortSignal.timeout(7000)});
  if(!self.ok)return Response.json({error:'Discord bot authorization is invalid.'},{status:503});
  const botUserId=String((await self.json()).id||'');
  const payload={configured:true,source:'DISCORD_CHANNEL_MESSAGES',fetchedAt:new Date().toISOString(),
    freshness:'LIVE',channels:{},realBalance:null,realBalanceAvailable:false,
    disclaimer:'Published Discord messages only; real SQLite balance and command execution require a supported bridge.'};
  let success=0;
  for(const [key,env] of channels){
    const channelId=Deno.env.get(env)||'';
    if(!tid(channelId)){payload.channels[key]={status:'NOT_CONFIGURED',messages:[]};continue;}
    try{
      const rsp=await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=30`,{
        headers:{Authorization:`Bot ${token}`},signal:AbortSignal.timeout(8500)
      });
      if(!rsp.ok){payload.channels[key]={status:'ERROR',messages:[],reason:`Discord HTTP ${rsp.status}`};continue;}
      const all=await rsp.json();
      const parsed=all.filter(m=>m.author?.id===botUserId).slice(0,18).map(m=>({
        id:m.id,postedAt:m.timestamp,channelId,
        link:`https://discord.com/channels/${guildId}/${channelId}/${m.id}`,
        text:safe(m.content,900),embeds:(m.embeds||[]).slice(0,5).map(e=>({
          title:safe(e.title,160),description:safe(e.description,1900),color:e.color??null,
          fields:(e.fields||[]).slice(0,20).map(f=>({name:safe(f.name,160),value:safe(f.value,500)})),
          footer:safe(e.footer?.text,150)
        }))
      }));
      payload.channels[key]={status:'LIVE',messages:parsed};success++;
    }catch(e){payload.channels[key]={status:'ERROR',messages:[],reason:'Timeout or network issue'};}
  }
  if(success===0){
    if(cache?.payload)return Response.json({...cache.payload,freshness:'STALE',ageSeconds:Math.max(0,Math.round(age/1000))});
    return Response.json({...payload,freshness:'UNAVAILABLE'});
  }
  if(cache)await db.LedgerMirrorCache.update(cache.id,{payload,fetchedAt:payload.fetchedAt,lastError:''});
  else await db.LedgerMirrorCache.create({cacheKey:`guild-${guildId}`,guildId,payload,fetchedAt:payload.fetchedAt,lastError:''});
  return Response.json({...payload,ageSeconds:0},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:'LEDGER channel mirror unavailable.',realBalanceAvailable:false},{status:503});}
});
