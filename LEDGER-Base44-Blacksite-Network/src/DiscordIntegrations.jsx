import React,{useCallback,useEffect,useState} from 'react';
import {ShieldCheck,ShieldAlert,Link2,Link2Off,RefreshCw,ExternalLink,LockKeyhole,RadioTower,ScrollText,Coins,ShoppingBag,Trophy,ClipboardList,CheckCircle2,AlertCircle,UserRound,TerminalSquare,Send,Copy,Settings,Clock3,Shield,Info} from 'lucide-react';

const empty={linked:false,verified:false,isAdmin:false};
const iconMap={contracts:ScrollText,leaderboard:Trophy,contractorShop:ShoppingBag,unitShop:ShoppingBag};
const labels={contracts:'BLACK MARKET CONTRACTS',leaderboard:'TOP EARNERS',contractorShop:'CONTRACTOR MARKET',unitShop:'UNIT SUPPLY EXCHANGE'};
const commands={credit_add:'/credits add',credit_subtract:'/credits subtract',contract_create:'/contract post',contract_review:'/contract pending',individual_shop:'/shop add',unit_shop:'/unitshop add',unit_role:'/unit setup',mentorship:'/mentor queue',other:'/ledger settings'};
const stamp=time=>time?new Date(time).toLocaleString(): 'NOT YET SYNCHRONIZED';
const unwrap=r=>{const data=r?.data??r;if(data?.error)throw new Error(data.error);return data;};

export function useDiscordNetwork(client){
 const [identity,setIdentity]=useState(empty),[mirror,setMirror]=useState(null),[admin,setAdmin]=useState(null),
 [loading,setLoading]=useState(false),[mirrorLoading,setMirrorLoading]=useState(false),[issue,setIssue]=useState('');
 const refreshIdentity=useCallback(async()=>{
  if(!client)return;
  try{const data=unwrap(await client.functions.invoke('discordStatus',{}));setIdentity(data);setIssue('');return data;}
  catch(e){setIdentity(empty);setIssue(String(e?.message||e));return empty;}
 },[client]);
 const refreshMirror=useCallback(async()=>{
  if(!client)return;
  setMirrorLoading(true);
  try{setMirror(unwrap(await client.functions.invoke('ledgerLive',{})));}
  catch(e){setMirror({error:String(e?.message||e),freshness:'OFFLINE',channels:{}});}
  finally{setMirrorLoading(false)}
 },[client]);
 const refreshAdmin=useCallback(async()=>{
  if(!client)return;
  try{const data=unwrap(await client.functions.invoke('adminHub',{type:'status'}));setAdmin(data);return data;}
  catch(e){setAdmin({error:String(e?.message||e),isAdmin:false});return null;}
 },[client]);
 const connect=useCallback(async()=>{
  if(!client)throw new Error('Base44 app has not been connected yet.');
  setLoading(true);
  try{const res=unwrap(await client.functions.invoke('discordStart',{}));if(!res.url?.startsWith('https://discord.com/oauth2/authorize'))throw new Error('Invalid Discord OAuth redirect');window.location.assign(res.url);}
  finally{setLoading(false)}
 },[client]);
 const unlink=useCallback(async()=>{
  if(!client)return;
  unwrap(await client.functions.invoke('discordStatus',{action:'unlink'}));setIdentity(empty);setMirror(null);setAdmin(null);
 },[client]);
 const adminAction=useCallback(async input=>{
  if(!client)throw new Error('Base44 app unavailable');
  const result=unwrap(await client.functions.invoke('adminHub',input));await refreshAdmin();return result;
 },[client,refreshAdmin]);
 useEffect(()=>{refreshIdentity();},[refreshIdentity]);
 useEffect(()=>{
  if(!identity.linked||!identity.verified)return;
  refreshMirror();const interval=setInterval(refreshMirror,30_000);
  return()=>clearInterval(interval);
 },[identity.linked,identity.verified,refreshMirror]);
 useEffect(()=>{
  const interval=setInterval(refreshIdentity,60_000);return()=>clearInterval(interval);
 },[refreshIdentity]);
 useEffect(()=>{
  const url=new URL(window.location.href);if(!url.searchParams.has('discord'))return;
  const result=url.searchParams.get('discord');url.searchParams.delete('discord');window.history.replaceState(null,'',url);
  if(result==='connected')refreshIdentity();else setIssue('Discord connection: '+result.replaceAll('_',' '));
 },[refreshIdentity]);
 return {identity,mirror,admin,loading,mirrorLoading,issue,connect,unlink,refreshIdentity,refreshMirror,refreshAdmin,adminAction};
}

function StateTag({state}){return <span className={`discord-state ${state==='LIVE'||state==='CACHED'?'ok':'warn'}`}>{state||'UNAVAILABLE'}</span>}
function IconButton({children,onClick,disabled=false}){return <button className="discord-btn" onClick={onClick} disabled={disabled}>{children}</button>}

export function DiscordAccess({network,onBase44Login}){
 const {identity,connect,unlink,refreshIdentity,loading,issue}=network;
 const [localError,setLocalError]=useState('');
 return <section className="discord-pane">
   <div className="discord-title"><Shield size={20}/><div><span className="discord-kicker">IDENTITY // DISCORD AUTHORIZATION</span><h2>SECURE CONTRACTOR ACCESS</h2></div></div>
   <div className="discord-identity">
     <div className="discord-pfp">{identity.avatar?<img src={identity.avatar} alt="Discord avatar"/>:<UserRound size={30}/>}</div>
     <div><b>{identity.linked?identity.username||'Discord contractor':'UNREGISTERED OPERATOR'}</b><p>{identity.verified?'Verified member of the configured Discord server':identity.linked?'Discord linked; server verification unavailable':'Connect the Discord account used in the R.E.A.P.E.R. server.'}</p></div>
     {identity.isAdmin?<span className="discord-state ok">LEDGER STAFF</span>:<span className="discord-state">{identity.linked?'CONTRACTOR':'UNLINKED'}</span>}
   </div>
   {identity.verified&&<p className="discord-muted">Recognized unit roles: {identity.units?.length?identity.units.join(' · '):'No unit roles configured or assigned'}</p>}
   <div className="discord-actions">
     {identity.linked?<><IconButton onClick={()=>refreshIdentity()}><RefreshCw size={15}/> RECHECK ROLES</IconButton><IconButton onClick={()=>unlink().catch(e=>setLocalError(e.message))}><Link2Off size={15}/> UNLINK DISCORD</IconButton></>:
     <><IconButton onClick={()=>connect().catch(e=>setLocalError(e.message))} disabled={loading}><Link2 size={15}/> {loading?'CONNECTING…':'CONNECT DISCORD ACCOUNT'}</IconButton><button className="discord-btn secondary" onClick={onBase44Login}>BASE44 SIGN IN</button></>}
   </div>
   <div className="discord-note"><LockKeyhole size={17}/> Discord connection is an OAuth account link tied to your Base44 session. Base44 sign-in is still required; Discord-only session login depends on a separately supported Base44 custom auth provider.</div>
   {(issue||localError)&&<div className="discord-error">{issue||localError}</div>}
 </section>;
}

function EmbedCard({message}){
 const embeds=message.embeds?.length?message.embeds:[{title:'DISPATCH TRANSMISSION',description:message.text,fields:[]}];
 return <article className="discord-embed" key={message.id}>
  <div className="discord-embed-meta"><span>LEDGER // DISCORD</span><span>{stamp(message.postedAt)}</span></div>
  {embeds.map((e,i)=><div className="discord-embed-body" key={i}>
   {e.title&&<h3>{e.title}</h3>}{e.description&&<p className="discord-embed-desc">{e.description}</p>}
   {!!e.fields?.length&&<div className="discord-fields">{e.fields.map((field,j)=><div key={j}><b>{field.name}</b><p>{field.value}</p></div>)}</div>}
   {e.footer&&<small>{e.footer}</small>}
  </div>)}
  <a href={message.link} target="_blank" rel="noreferrer">OPEN ORIGINAL IN DISCORD <ExternalLink size={13}/></a>
 </article>;
}

export function LiveMirror({network,compact=false,category=null,onNavigate}){
 const {mirror,mirrorLoading,refreshMirror,identity}=network;
 const [active,setActive]=useState(category||'contracts');
 const current=category||active;
 if(!identity.linked)return <div className="discord-note"><ShieldAlert size={17}/> Connect your Discord account to view published LEDGER bot messages. <button onClick={()=>onNavigate?.('discord')}>CONNECT ACCOUNT →</button></div>;
 const block=mirror?.channels?.[current];
 return <section className="discord-pane">
    <div className="discord-title"><RadioTower size={19}/><div><span className="discord-kicker">LEDGER DISCORD MIRROR // READ ONLY</span><h2>{compact?labels[current]:'LIVE BLACKSITE TRANSMISSIONS'}</h2></div><StateTag state={mirror?.freshness}/></div>
    {!category&&<div className="discord-tabs">{Object.keys(labels).map(key=><button key={key} className={current===key?'on':''} onClick={()=>setActive(key)}>{labels[key]}</button>)}</div>}
    <div className="discord-meta"><span>{mirror?.fetchedAt?'Last checked '+stamp(mirror.fetchedAt):'Not synchronized yet'}</span><button onClick={refreshMirror} disabled={mirrorLoading}><RefreshCw size={14}/> {mirrorLoading?'CHECKING…':'REFRESH'}</button></div>
    {mirror?.error&&<div className="discord-error">{mirror.error}</div>}
    {block?.status==='NOT_CONFIGURED'&&<div className="discord-note">Configure this channel ID in Base44 secrets to enable the read-only mirror.</div>}
    {block?.status==='ERROR'&&<div className="discord-error">Channel unavailable: {block.reason}</div>}
    {block?.messages?.length?block.messages.slice(0,compact?2:16).map(m=><EmbedCard key={m.id} message={m}/>):<div className="discord-empty">{mirrorLoading?'CONTACTING DISCORD…':'NO PUBLISHED LEDGER TRANSMISSIONS FOUND.'}</div>}
    <div className="discord-footnote">This displays published messages, not direct SQLite records. Discord wallet balances and real administrative mutations are unavailable without a secure backend bridge.</div>
    {compact&&<button className="discord-btn secondary" onClick={()=>onNavigate?.('live')}>OPEN FULL LEDGER FEED →</button>}
  </section>;
}

function Line({label,value}){return <div className="discord-pair"><span>{label}</span><b>{value}</b></div>}

export function ModeratorConsole({network}){
 const {identity,admin,refreshAdmin,adminAction}=network;
 const [request,setRequest]=useState({kind:'credit_add',target:'',note:''});
 const [announcement,setAnnouncement]=useState({title:'',body:'',severity:'notice'});
 const [sending,setSending]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{if(identity.isAdmin)refreshAdmin();},[identity.isAdmin,refreshAdmin]);
 async function submit(action){setSending(true);setNotice('');try{const result=await adminAction(action);setNotice(result.message||'Action saved.');if(action.type==='queue_manual')setRequest({kind:'credit_add',target:'',note:''});if(action.type==='announce')setAnnouncement({title:'',body:'',severity:'notice'});}catch(e){setNotice(e?.message||'Action failed.')}finally{setSending(false)}}
 if(!identity.isAdmin)return <div className="discord-pane"><div className="discord-error"><ShieldAlert/> LEDGER moderation role required. This page does not grant privileges.</div></div>;
 return <div className="discord-console">
  <section className="discord-pane"><div className="discord-title"><ShieldCheck size={22}/><div><span className="discord-kicker">LIVE DISCORD ROLE VERIFIED</span><h2>BLACKSITE // STAFF CONTROL</h2></div></div>
   <p className="discord-muted">The site checks your moderator role with Discord before each staff action. Removing your LEDGER role removes access on the next check.</p>
   <div className="discord-admin-grid"><Line label="DISCORD CONTRACTS / MARKET" value="READ-ONLY MIRROR"/><Line label="REAL BOT BALANCE CHANGES" value="REQUIRES BRIDGE"/><Line label="BLACKSITE SITE ANNOUNCEMENTS" value="ENABLED"/><Line label="MANUAL DISCORD REQUEST QUEUE" value="ENABLED"/></div>
   <div className="discord-warning"><AlertCircle size={18}/> The current Discord bot has no remote write API. Queueing a request here does NOT execute a slash command, pay credits, or update its SQLite records.</div>
  </section>
  <div className="discord-admin-columns">
   <section className="discord-pane"><div className="discord-title"><Send size={18}/><div><span className="discord-kicker">NETWORK BROADCAST</span><h2>PUBLISH SITE DISPATCH</h2></div></div>
    <label className="discord-field">TITLE<input value={announcement.title} maxLength={110} onChange={e=>setAnnouncement({...announcement,title:e.target.value})} placeholder="The Broker has new inventory…"/></label>
    <label className="discord-field">MESSAGE<textarea rows={4} maxLength={1600} value={announcement.body} onChange={e=>setAnnouncement({...announcement,body:e.target.value})}/></label>
    <label className="discord-field">PRIORITY<select value={announcement.severity} onChange={e=>setAnnouncement({...announcement,severity:e.target.value})}><option value="notice">NOTICE</option><option value="intel">INTEL</option><option value="alert">ALERT</option></select></label>
    <IconButton disabled={sending||!announcement.title.trim()||!announcement.body.trim()} onClick={()=>submit({type:'announce',...announcement})}>PUBLISH TO WEBSITE</IconButton>
   </section>
   <section className="discord-pane"><div className="discord-title"><ClipboardList size={18}/><div><span className="discord-kicker">MANUAL BRIDGE WORKFLOW</span><h2>QUEUE DISCORD ACTION</h2></div></div>
    <label className="discord-field">ACTION<select value={request.kind} onChange={e=>setRequest({...request,kind:e.target.value})}>{Object.keys(commands).map(k=><option key={k} value={k}>{k.replaceAll('_',' ').toUpperCase()}</option>)}</select></label>
    <label className="discord-field">TARGET<input value={request.target} onChange={e=>setRequest({...request,target:e.target.value})} placeholder="@Contractor, item, contract ID…"/></label>
    <label className="discord-field">INSTRUCTIONS<textarea rows={3} value={request.note} onChange={e=>setRequest({...request,note:e.target.value})} placeholder="Exact amount, reason, item stock, etc."/></label>
    <div className="discord-command"><code>{commands[request.kind]}</code><button onClick={()=>navigator.clipboard?.writeText(commands[request.kind])}><Copy size={14}/> COPY</button></div>
    <IconButton disabled={sending||(!request.target.trim()&&!request.note.trim())} onClick={()=>submit({type:'queue_manual',...request})}>QUEUE FOR DISCORD STAFF</IconButton>
   </section>
  </div>
  {notice&&<div className="discord-note">{notice}</div>}
  <section className="discord-pane"><div className="discord-title"><Clock3 size={18}/><div><span className="discord-kicker">REQUIRES DISCORD EXECUTION</span><h2>STAFF QUEUE</h2></div><button className="discord-refresh" onClick={refreshAdmin}><RefreshCw size={16}/></button></div>
   {!admin||admin?.error?<div className="discord-error">{admin?.error||'Loading staff records…'}</div>:<>
    {admin.requests?.length?admin.requests.slice(0,30).map(r=><div className="discord-staff-row" key={r.id}><div><b>{r.kind.replaceAll('_',' ').toUpperCase()}</b><p>{r.target||r.payload?.note||'—'} · {r.status}</p><small>{stamp(r.createdAt)} · {r.payload?.discordCommand}</small></div>{r.status==='NEEDS_DISCORD_ACTION'&&<IconButton disabled={sending} onClick={()=>submit({type:'resolve_manual',id:r.id,status:'COMPLETED_MANUALLY'})}>MARK DONE</IconButton>}</div>):<div className="discord-empty">QUEUE EMPTY.</div>}
    <div className="discord-title spacer"><Coins size={18}/><div><span className="discord-kicker">WEBSITE SIMULATION ONLY</span><h2>PENDING REDEMPTIONS</h2></div></div>
    {admin.claims?.filter(c=>c.status==='PENDING_REVIEW').length?admin.claims.filter(c=>c.status==='PENDING_REVIEW').map(c=><div className="discord-staff-row" key={c.id}><div><b>{Number(c.amount).toLocaleString()} WEB BC</b><p>Owner: {c.ownerId}</p></div><IconButton disabled={sending} onClick={()=>submit({type:'review_redemption',id:c.id,approved:true})}>APPROVE FOR MANUAL PAYMENT</IconButton></div>):<div className="discord-empty">NO PENDING WEB REDEMPTIONS.</div>}
   </>}
  </section>
 </div>;
}
