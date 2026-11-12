import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const nameOf=p=>typeof p.name==='string'?p.name:(p.name?.en||p.name?.name||p.name?.message||`Planet ${p.index}`);
const n=v=>Number.isFinite(Number(v))?Number(v):0;
Deno.serve(async function(req){
 try{
  const b=createClientFromRequest(req);if(!await b.auth.me())return Response.json({error:'Unauthorized'},{status:401});
  const db=b.asServiceRole.entities;
  const old=await db.PlanetSnapshot.list('-capturedAt',150);
  const last=old.find(p=>p.capturedAt)?.capturedAt;
  if(old.length&&last&&Date.now()-Date.parse(last)<10*60*1000)return Response.json({source:'COMMUNITY_HD2_API',freshness:'CACHED',capturedAt:last,planets:old});
  try{
   const res=await fetch('https://api.helldivers2.dev/api/v1/planets',{headers:{'X-Super-Client':'LEDGER-Blacksite-Network','Accept':'application/json'},signal:AbortSignal.timeout(9000)});
   if(!res.ok)throw new Error('Feed HTTP '+res.status);
   const raw=await res.json();const arr=Array.isArray(raw)?raw:(raw.planets||raw.data||[]);
   const capturedAt=new Date().toISOString();
   const rows=arr.slice(0,400).filter(p=>p && p.index!==undefined).map(p=>({planetId:String(p.index),name:String(nameOf(p)).slice(0,100),sector:String(p.sector||'Unknown'),owner:String(p.currentOwner||p.owner||'Unknown'),players:n(p.statistics?.playerCount??p.players),liberation:p.maxHealth?n(100*(1-n(p.health)/n(p.maxHealth))):0,positionX:n(p.position?.x),positionY:n(p.position?.y),capturedAt,source:'COMMUNITY_HD2_API'}));
   if(!rows.length)throw new Error('No readable planet records');
   // Cache across users so the public community API is never polled for each page view.
   for(let start=0;start<rows.length;start+=100){await db.PlanetSnapshot.upsert(rows.slice(start,start+100),{key:'planetId'});}
   return Response.json({source:'COMMUNITY_HD2_API',freshness:'LIVE_FEED',capturedAt,planets:rows});
  }catch(apiErr){return Response.json({source:old.length?'STALE_COMMUNITY_CACHE':'NO_LIVE_FEED',freshness:'UNAVAILABLE',capturedAt:last||null,warning:String(apiErr.message),planets:old});}
 }catch(err){return Response.json({error:String(err?.message||err)},{status:500});}
});
