import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
// All admin operations re-check the required Discord role on the SERVER, on every request.
const tid = x=>/^\d{16,22}$/.test(String(x||''));
const trim = (v,n=500)=>String(v??'').trim().slice(0,n).replace(/[<>]/g,'');
const allowedQueueKinds = new Set(['credit_add','credit_subtract','contract_create','contract_review',
  'individual_shop','unit_shop','unit_role','mentorship','other']);
const commandExamples = {
  credit_add:'/credits add',credit_subtract:'/credits subtract',contract_create:'/contract post',
  contract_review:'/contract pending',individual_shop:'/shop add',unit_shop:'/unitshop add',
  unit_role:'/unit setup',mentorship:'/mentor queue',other:'/ledger settings'
};
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return Response.json({error:'POST required'},{status:405});
  const app=createClientFromRequest(req),user=await app.auth.me();
  if(!user?.id)return Response.json({error:'Sign in first.'},{status:401});
  const db=app.asServiceRole.entities;
  const identity=(await db.DiscordIdentity.filter({userId:user.id}))[0];
  const roleId=Deno.env.get('LEDGER_MOD_ROLE_ID'), guildId=Deno.env.get('DISCORD_GUILD_ID'),token=Deno.env.get('DISCORD_BOT_TOKEN');
  if(!identity||!tid(roleId)||!tid(guildId)||!token)return Response.json({error:'LEDGER moderator role verification unavailable.'},{status:403});
  const check=await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${identity.discordId}`,{
    headers:{Authorization:`Bot ${token}`},signal:AbortSignal.timeout(8000)
  });
  if(!check.ok)return Response.json({error:'Discord role check failed; access denied.'},{status:403});
  const member=await check.json();
  if(!(member.roles||[]).includes(roleId))return Response.json({error:'LEDGER moderation role required.'},{status:403});
  const payload=await req.json().catch(()=>({})),type=payload.type||'status';
  const audit=async (action,target,details={})=>db.WebAdminAudit.create({actorUserId:String(user.id),actorDiscordId:identity.discordId,
    action,target,details,createdAt:new Date().toISOString()});
  const capabilities={discordRead:true,discordSqliteWrite:false,discordCommandExecution:false,
    websiteAnnouncements:true,redemptionReview:true,manualActionQueue:true};
  if(type==='status'){
    const [claims,requests,announcements,auditLog] = await Promise.all([
      db.RewardClaim.list('-created_date',30),db.AdminActionRequest.list('-created_date',50),
      db.BlacksiteAnnouncement.list('-created_date',30),db.WebAdminAudit.list('-created_date',30)]);
    return Response.json({isAdmin:true,discordId:identity.discordId,roleVerifiedAt:new Date().toISOString(),
      capabilities,claims,requests,announcements,auditLog,commandExamples,
      disclaimer:'Queued Discord actions are NOT executed against the bot SQLite DB. Complete them in Discord until a supported bridge exists.'});
  }
  if(type==='announce'){
    const title=trim(payload.title,110),body=trim(payload.body,1600),severity=['intel','alert','notice'].includes(payload.severity)?payload.severity:'notice';
    if(title.length<4||body.length<5)return Response.json({error:'Title and message required.'},{status:400});
    const record=await db.BlacksiteAnnouncement.create({title,body,severity,authorDiscordId:identity.discordId,active:true,createdAt:new Date().toISOString()});
    await audit('ANNOUNCEMENT_CREATED',record.id,{title});
    return Response.json({ok:true,message:'Website dispatch announcement published.',record});
  }
  if(type==='deactivate_announcement'){
    const entry=await db.BlacksiteAnnouncement.get(String(payload.id||''));
    if(!entry)return Response.json({error:'Announcement missing'},{status:404});
    await db.BlacksiteAnnouncement.update(entry.id,{active:false});
    await audit('ANNOUNCEMENT_DEACTIVATED',entry.id);
    return Response.json({ok:true});
  }
  if(type==='queue_manual'){
    const kind=String(payload.kind||''),target=trim(payload.target,120),note=trim(payload.note,700);
    if(!allowedQueueKinds.has(kind)||(!target&&!note))return Response.json({error:'Choose a supported action and provide instructions.'},{status:400});
    const entry=await db.AdminActionRequest.create({actorUserId:String(user.id),actorDiscordId:identity.discordId,kind,target,
      payload:{note,discordCommand:commandExamples[kind]},status:'NEEDS_DISCORD_ACTION',createdAt:new Date().toISOString(),resolvedAt:'',note:''});
    await audit('MANUAL_DISCORD_ACTION_QUEUED',entry.id,{kind,target});
    return Response.json({ok:true,entry,message:'Saved in staff queue. No Discord bot action was executed.'});
  }
  if(type==='resolve_manual'){
    const entry=await db.AdminActionRequest.get(String(payload.id||''));
    if(!entry)return Response.json({error:'Request not found'},{status:404});
    const status=payload.status==='CANCELLED'?'CANCELLED':'COMPLETED_MANUALLY';
    await db.AdminActionRequest.update(entry.id,{status,resolvedAt:new Date().toISOString(),note:trim(payload.note,500)});
    await audit('MANUAL_REQUEST_UPDATED',entry.id,{status});
    return Response.json({ok:true,message:'Staff queue updated. Discord balance was not changed by this function.'});
  }
  if(type==='review_redemption'){
    const claim=await db.RewardClaim.get(String(payload.id||''));
    if(!claim)return Response.json({error:'Redemption not found'},{status:404});
    if(claim.status!=='PENDING_REVIEW')return Response.json({error:'Already reviewed'},{status:409});
    const status=payload.approved?'APPROVED_PENDING_DISCORD_PAYMENT':'REJECTED_PENDING_WEB_REFUND';
    await db.RewardClaim.update(claim.id,{status,reviewedBy:identity.discordId});
    await audit('REDEMPTION_REVIEWED',claim.id,{status,amount:claim.amount});
    return Response.json({ok:true,status,message:payload.approved?'Approved for MANUAL Discord payment. No credits transferred.':'Rejected; web refund must be handled separately.'});
  }
  return Response.json({error:'Unknown admin action'},{status:400});
 }catch(e){return Response.json({error:'Admin action unavailable; no writes were performed by this response.'},{status:503});}
});
