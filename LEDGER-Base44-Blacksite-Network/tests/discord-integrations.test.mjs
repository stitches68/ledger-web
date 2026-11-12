import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const GUILD='123456789012345678',ROLE='234567890123456789',USER='345678901234567890';
const root=new URL('../base44/functions/',import.meta.url);
function setup(file,{env={},user={id:'base-user'},identity=[],roles=[],messages=[]}={}){
 let handler;
 const records={DiscordIdentity:identity,DiscordOAuthState:[],LedgerMirrorCache:[],RewardClaim:[],AdminActionRequest:[],BlacksiteAnnouncement:[],WebAdminAudit:[]};
 const writes=[];
 const entities=new Proxy({}, {get:(_,name)=>({
  async filter(query){return(records[name]||[]).filter(x=>Object.entries(query).every(([k,v])=>x[k]===v));},
  async list(){return [...(records[name]||[])];},
  async get(id){return(records[name]||[]).find(x=>x.id===id);},
  async create(v){const created={...v,id:`id-${(records[name]||[]).length+1}`};(records[name]??=[]).push(created);writes.push(['create',name,created]);return created;},
  async update(id,patch){const record=(records[name]||[]).find(x=>x.id===id);if(!record)throw new Error('Missing '+name);Object.assign(record,patch);writes.push(['update',name,patch]);return record;},
  async delete(id){records[name]=(records[name]||[]).filter(x=>x.id!==id);writes.push(['delete',name,id]);}
 })});
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 let fetched=[];
 const mockFetch=async(url,options={})=>{
  fetched.push(String(url));
  if(String(url).includes('/members/'))return response({roles});
  if(String(url).endsWith('users/@me'))return response({id:'999999999999999999'});
  if(String(url).includes('/messages?'))return response(messages);
  throw Error('Unexpected fetch '+url);
 };
 const base44={auth:{me:async()=>user},asServiceRole:{entities}};
 const source=readFileSync(new URL(file+'/entry.js',root),'utf8').replace(/^import .*?;\s*/,'');
 const actualEnv={DISCORD_GUILD_ID:GUILD,DISCORD_BOT_TOKEN:'test-token',LEDGER_MOD_ROLE_ID:ROLE,
  LEDGER_CONTRACT_CHANNEL_ID:'456789012345678901',...env};
 runInNewContext(source,{Deno:{serve:f=>handler=f,env:{get:k=>actualEnv[k]}},createClientFromRequest:()=>base44,
   Response,Request,URL,URLSearchParams,crypto:webcrypto,TextEncoder,AbortSignal,fetch:mockFetch,console});
 const invoke=async(payload={})=>{
  const rsp=await handler(new Request('https://app.example/api/functions/'+file,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}));
  return{status:rsp.status,data:await rsp.json()};
 };
 return{invoke,handler,writes,records,fetched};
}
test('unlinked contractor cannot access the Discord message mirror',async()=>{
 const app=setup('ledgerLive');const r=await app.invoke();assert.equal(r.status,403);
 assert.equal(app.fetched.length,0);
});
test('role verified live, without trusting a client-supplied isAdmin flag',async()=>{
 const id=[{userId:'base-user',discordId:USER,globalName:'Jinx',avatar:''}];
 const allowed=setup('discordStatus',{identity:id,roles:[ROLE]});
 const r=await allowed.invoke({isAdmin:false});assert.equal(r.data.isAdmin,true);assert.equal(r.data.verified,true);
 const denied=setup('discordStatus',{identity:id,roles:[]});assert.equal((await denied.invoke({isAdmin:true})).data.isAdmin,false);
});
test('admin endpoint denies all writes if Discord moderator role is missing',async()=>{
 const app=setup('adminHub',{identity:[{userId:'base-user',discordId:USER}],roles:[]});
 const result=await app.invoke({type:'announce',title:'Mission',body:'Staff action'});
 assert.equal(result.status,403);assert.equal(app.writes.length,0);
});
test('admin can post site-only announcements and audit trails',async()=>{
 const app=setup('adminHub',{identity:[{userId:'base-user',discordId:USER}],roles:[ROLE]});
 const result=await app.invoke({type:'announce',title:'Dispatch',body:'The Broker is accepting new contracts.'});
 assert.equal(result.data.ok,true);
 assert.equal(app.records.BlacksiteAnnouncement.length,1);
 assert.equal(app.records.WebAdminAudit.length,1);
});
test('a queued bot credit action is NOT a Discord payment',async()=>{
 const app=setup('adminHub',{identity:[{userId:'base-user',discordId:USER}],roles:[ROLE]});
 const result=await app.invoke({type:'queue_manual',kind:'credit_add',target:'@Jinx',note:'50 BC test'});
 assert.equal(result.data.entry.status,'NEEDS_DISCORD_ACTION');
 assert.equal(result.data.entry.payload.discordCommand,'/credits add');
 assert.equal(app.records.AdminActionRequest.length,1);
});
test('live feed excludes messages posted by anyone other than the Discord bot',async()=>{
 const app=setup('ledgerLive',{identity:[{userId:'base-user',discordId:USER}],roles:[ROLE],messages:[
  {id:'m1',author:{id:'999999999999999999'},timestamp:'2026-11-12T12:00:00Z',content:'',embeds:[{title:'BLACK MARKET CONTRACTS',description:'Open contract'}]},
  {id:'m2',author:{id:'888888888888888888'},timestamp:'2026-11-12T12:00:00Z',content:'Fake 1,000,000 BC',embeds:[]}
 ]});
 const result=await app.invoke();
 assert.equal(result.data.channels.contracts.messages.length,1);
 assert.equal(result.data.channels.contracts.messages[0].id,'m1');
 assert.equal(result.data.realBalanceAvailable,false);
 assert.equal(result.data.realBalance,null);
});


test('OAuth start returns Discord authorization URL with hashed, expiring state',async()=>{
 const app=setup('discordStart',{env:{DISCORD_CLIENT_ID:'444444444444444444',DISCORD_REDIRECT_URI:'https://blacksite.example/api/functions/discordCallback'}});
 const res=await app.invoke();assert.equal(res.status,200);
 const url=new URL(res.data.url);assert.equal(url.hostname,'discord.com');assert.equal(url.searchParams.get('scope'),'identify');
 const state=url.searchParams.get('state');assert.match(state,/^[a-f0-9]{64}$/);
 assert.notEqual(app.records.DiscordOAuthState[0].stateHash,state);
 assert.ok(Date.parse(app.records.DiscordOAuthState[0].expiresAt)>Date.now());
});
test('OAuth start cannot be invoked without a Base44 session',async()=>{
 const app=setup('discordStart',{user:null,env:{DISCORD_CLIENT_ID:'444444444444444444',DISCORD_REDIRECT_URI:'https://blacksite.example/api/functions/discordCallback'}});
 const res=await app.invoke();assert.equal(res.status,401);assert.equal(app.records.DiscordOAuthState.length,0);
});
test('Discord OAuth callback refuses malformed state before exchanging the code',async()=>{
 const app=setup('discordCallback',{env:{BLACKSITE_SITE_URL:'https://blacksite.example/'}});
 const res=await app.handler(new Request('https://callback.example/?state=bad&code=any'));
 assert.equal(res.status,302);
 assert.equal(new URL(res.headers.get('Location')).searchParams.get('discord'),'invalid_request');
 assert.equal(app.fetched.length,0);
});
