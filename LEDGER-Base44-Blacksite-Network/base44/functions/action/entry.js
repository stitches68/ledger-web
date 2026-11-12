import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
// Original fictional game catalogs. No real-world weapons purchases.
const ASSETS = [{"id":"ghostknife","name":"Ghostknife","category":"FIGHTER","role":"Light interceptor","cost":1800,"hull":85,"firepower":55,"shields":25,"speed":95,"income":3,"desc":"Fast, cheap, dangerous in numbers."},{"id":"wraith","name":"Wraith-7","category":"FIGHTER","role":"Stealth fighter","cost":3600,"hull":90,"firepower":72,"shields":48,"speed":93,"income":6,"desc":"Cold-running drives and radar-absorbent plating."},{"id":"shrike","name":"Shrike","category":"FIGHTER","role":"Medium fighter","cost":3100,"hull":120,"firepower":80,"shields":48,"speed":80,"income":5,"desc":"Multi-role patrol craft and convoy escort."},{"id":"basilisk","name":"Basilisk","category":"FIGHTER","role":"Heavy fighter","cost":4900,"hull":185,"firepower":113,"shields":67,"speed":61,"income":7,"desc":"Heavy guns; no interest in maneuverability."},{"id":"lancer","name":"Lancer","category":"FIGHTER","role":"Space superiority fighter","cost":6800,"hull":135,"firepower":130,"shields":62,"speed":89,"income":8,"desc":"High-output drive and lance arrays."},{"id":"nightglass","name":"Nightglass","category":"BOMBER","role":"Stealth bomber","cost":8000,"hull":160,"firepower":170,"shields":76,"speed":60,"income":10,"desc":"Disappears until the payload drops."},{"id":"hammerfall","name":"Hammerfall","category":"BOMBER","role":"Strategic bomber","cost":10500,"hull":250,"firepower":220,"shields":86,"speed":42,"income":12,"desc":"Long-range suppression with terrifying payloads."},{"id":"vulture","name":"Vulture","category":"GUNSHIP","role":"Assault gunship","cost":7200,"hull":230,"firepower":152,"shields":68,"speed":65,"income":9,"desc":"Low orbit to ground, then back again."},{"id":"scorpion","name":"Scorpion","category":"GUNSHIP","role":"Anti-armor gunship","cost":9000,"hull":260,"firepower":195,"shields":78,"speed":54,"income":10,"desc":"Built around a rotating siege cannon."},{"id":"skyrend","name":"Skyrend","category":"DROPSHIP","role":"Rapid insertion dropship","cost":5100,"hull":170,"firepower":55,"shields":70,"speed":87,"income":8,"desc":"Drop squads in and bring survivors out."},{"id":"lifeline","name":"Lifeline","category":"MEDICAL","role":"Medevac dropship","cost":6100,"hull":190,"firepower":28,"shields":82,"speed":78,"income":11,"desc":"Armored triage and combat evacuation."},{"id":"aurora","name":"Aurora","category":"MEDICAL","role":"Medical response frigate","cost":16500,"hull":570,"firepower":95,"shields":155,"speed":48,"income":18,"desc":"A surgical ward that fights its way home."},{"id":"mercy","name":"Quiet Mercy","category":"MEDICAL","role":"Hospital ship","cost":27000,"hull":820,"firepower":76,"shields":210,"speed":32,"income":26,"desc":"The only thing more expensive than life is losing it."},{"id":"atlas","name":"Atlas","category":"TRANSPORT","role":"Armored troop transport","cost":7200,"hull":330,"firepower":72,"shields":90,"speed":52,"income":10,"desc":"Carries an entire detachment into contact."},{"id":"wayfarer","name":"Wayfarer","category":"CARGO","role":"Cargo freighter","cost":8500,"hull":420,"firepower":45,"shields":90,"speed":40,"income":13,"desc":"Unregistered holds and inconvenient manifests."},{"id":"mammoth","name":"Mammoth","category":"CARGO","role":"Heavy logistics ship","cost":16000,"hull":760,"firepower":75,"shields":130,"speed":29,"income":18,"desc":"Carries everything the war forgot."},{"id":"strigoi","name":"Strigoi","category":"CORVETTE","role":"Fast strike corvette","cost":12000,"hull":540,"firepower":185,"shields":135,"speed":74,"income":14,"desc":"Silent blockade runner and boarding craft."},{"id":"vaelora","name":"Vaelora","category":"CORVETTE","role":"Blacksite recovery corvette","cost":14500,"hull":640,"firepower":165,"shields":165,"speed":69,"income":17,"desc":"Rescue-bay architecture and heavy escort guns."},{"id":"halberd","name":"Halberd","category":"CRUISER","role":"Patrol cruiser","cost":25500,"hull":1130,"firepower":260,"shields":240,"speed":52,"income":25,"desc":"A border dispute with engines."},{"id":"eclipse","name":"Eclipse","category":"CRUISER","role":"Stealth command cruiser","cost":39000,"hull":1080,"firepower":300,"shields":350,"speed":54,"income":34,"desc":"A command center the radar claims is empty."},{"id":"judicator","name":"Judicator","category":"BATTLESHIP","role":"Siege battleship","cost":62000,"hull":2400,"firepower":550,"shields":500,"speed":24,"income":44,"desc":"Mass, armor and the language of artillery."},{"id":"blackstar","name":"Blackstar","category":"BATTLESHIP","role":"Dreadnought","cost":89000,"hull":3200,"firepower":760,"shields":690,"speed":18,"income":60,"desc":"A moving capital offense."},{"id":"gravewing","name":"Gravewing","category":"CARRIER","role":"Light assault carrier","cost":48000,"hull":1500,"firepower":220,"shields":300,"speed":34,"income":37,"desc":"Launches the fight before anyone sees the ship."},{"id":"hollowstar","name":"Hollowstar","category":"CARRIER","role":"Fleet aircraft carrier","cost":94000,"hull":3100,"firepower":480,"shields":650,"speed":22,"income":67,"desc":"Four decks, several secrets and a private air force."},{"id":"citadel","name":"Citadel Node","category":"STATION","role":"Combat orbital fortress","cost":99000,"hull":3700,"firepower":650,"shields":850,"speed":0,"income":70,"desc":"Static by doctrine, formidable by design."},{"id":"sanctuary","name":"Sanctuary Array","category":"STATION","role":"Orbital medical station","cost":74000,"hull":2900,"firepower":190,"shields":870,"speed":0,"income":55,"desc":"Protected trauma decks and long-range rescue."},{"id":"pilgrim","name":"Pilgrim","category":"STATION","role":"Mobile hospital station","cost":120000,"hull":3500,"firepower":300,"shields":990,"speed":16,"income":75,"desc":"A city-sized hospital built to move."},{"id":"mastiff","name":"Mastiff","category":"ARMOR","role":"Heavy battle tank","cost":4500,"hull":340,"firepower":150,"shields":38,"speed":25,"income":7,"desc":"Steel tracks, full breach, no retreat."},{"id":"razorback","name":"Razorback","category":"ARMOR","role":"Scout tank","cost":2900,"hull":180,"firepower":94,"shields":21,"speed":55,"income":6,"desc":"Fast enough to find trouble first."},{"id":"palisade","name":"Palisade","category":"ARMOR","role":"Siege tank","cost":7700,"hull":490,"firepower":270,"shields":62,"speed":15,"income":12,"desc":"Indirect fire and hard cover breaker."},{"id":"contractors","name":"Blacksite Contractors","category":"MERCENARY","role":"Rifle squad","cost":850,"hull":60,"firepower":42,"shields":5,"speed":63,"income":2,"desc":"Six mercenaries, their kit and a nondisclosure agreement."},{"id":"ghosts","name":"Ghost Team","category":"MERCENARY","role":"Recon squad","cost":1600,"hull":72,"firepower":80,"shields":12,"speed":84,"income":4,"desc":"They collect coordinates and leave no footprints."},{"id":"angels","name":"Angel Trauma Team","category":"MERCENARY","role":"Combat medics","cost":2000,"hull":96,"firepower":45,"shields":20,"speed":63,"income":6,"desc":"Medical care delivered under suppressive fire."},{"id":"breachers","name":"Jackal Breach Team","category":"MERCENARY","role":"Assault squad","cost":2400,"hull":115,"firepower":106,"shields":15,"speed":76,"income":5,"desc":"A specialist solution for locked doors."}];
const MODS = [{"id":"railburst","name":"Railburst Array","slot":"WEAPON","cost":2500,"firepower":28,"hull":0,"shields":0,"speed":0,"income":1,"desc":"Accelerator cannons. +28 firepower."},{"id":"coil","name":"Coilcaster Batteries","slot":"WEAPON","cost":1850,"firepower":19,"hull":0,"shields":0,"speed":0,"income":1,"desc":"Pulse coils with high penetration."},{"id":"flechette","name":"Flechette Cloud","slot":"WEAPON","cost":1350,"firepower":12,"hull":0,"shields":0,"speed":5,"income":1,"desc":"Point defense and proximity denial."},{"id":"longbow","name":"Longbow Missile Rack","slot":"WEAPON","cost":4400,"firepower":41,"hull":0,"shields":0,"speed":-5,"income":2,"desc":"Extended-range guided kinetic salvos."},{"id":"hellion","name":"Hellion Plasma Lance","slot":"WEAPON","cost":6800,"firepower":62,"hull":0,"shields":0,"speed":-8,"income":3,"desc":"A dangerous weapon that asks no questions."},{"id":"cinder","name":"Cinder Flamestorm","slot":"WEAPON","cost":2200,"firepower":25,"hull":0,"shields":0,"speed":-2,"income":2,"desc":"Close combat thermal saturation."},{"id":"bulwark","name":"Bulwark Field","slot":"SHIELD","cost":2900,"firepower":0,"hull":0,"shields":57,"speed":-4,"income":1,"desc":"Layered shield reinforcement."},{"id":"phase","name":"Phase Veil","slot":"SHIELD","cost":4600,"firepower":0,"hull":0,"shields":84,"speed":5,"income":2,"desc":"Probabilistic deflection lattice."},{"id":"citadel_field","name":"Citadel Shield","slot":"SHIELD","cost":7600,"firepower":0,"hull":0,"shields":124,"speed":-9,"income":3,"desc":"Capital-grade field projector."},{"id":"guardian","name":"Guardian Escort Screen","slot":"SHIELD","cost":2400,"firepower":0,"hull":20,"shields":45,"speed":0,"income":2,"desc":"Protects nearby evacuation craft."},{"id":"afterburner","name":"Overburn Drive","slot":"ENGINE","cost":2200,"firepower":0,"hull":-4,"shields":0,"speed":18,"income":1,"desc":"Shorter exposure windows."},{"id":"ghostdrive","name":"Ghostdrive","slot":"ENGINE","cost":4100,"firepower":0,"hull":0,"shields":0,"speed":27,"income":2,"desc":"Cuts the signature before moving."},{"id":"ion","name":"Ion Splitter","slot":"ENGINE","cost":6300,"firepower":0,"hull":0,"shields":10,"speed":31,"income":3,"desc":"High-efficiency full burn."},{"id":"reactor","name":"Blacksite Reactor","slot":"ENGINE","cost":4900,"firepower":10,"hull":0,"shields":20,"speed":12,"income":3,"desc":"Unauthorized reactor modifications."},{"id":"medbay","name":"Trauma Bay","slot":"UTILITY","cost":3200,"firepower":0,"hull":40,"shields":12,"speed":0,"income":3,"desc":"Field surgical equipment and rescue links."},{"id":"smugglers","name":"False Manifest","slot":"UTILITY","cost":1700,"firepower":0,"hull":0,"shields":0,"speed":0,"income":6,"desc":"Revenue from unsigned freight paperwork."},{"id":"salvage","name":"Salvage Drones","slot":"UTILITY","cost":2100,"firepower":0,"hull":14,"shields":0,"speed":2,"income":4,"desc":"Collect useful things from bad outcomes."},{"id":"command","name":"Tactical Uplink","slot":"UTILITY","cost":4200,"firepower":17,"hull":0,"shields":17,"speed":0,"income":4,"desc":"Battlenet routing and command bonuses."},{"id":"reclaimer","name":"Reclaimer Rig","slot":"UTILITY","cost":5500,"firepower":10,"hull":30,"shields":25,"speed":-3,"income":5,"desc":"Extends survivability and salvage yield."},{"id":"blackbox","name":"Blackbox Broker","slot":"UTILITY","cost":8200,"firepower":0,"hull":0,"shields":0,"speed":0,"income":9,"desc":"Extra unofficial mission income."},{"id":"armorplate","name":"Ceramic Plating","slot":"ARMOR","cost":1300,"firepower":0,"hull":47,"shields":0,"speed":-5,"income":1,"desc":"Extra hull resilience."},{"id":"ablative","name":"Ablative Shell","slot":"ARMOR","cost":2800,"firepower":0,"hull":87,"shields":0,"speed":-8,"income":1,"desc":"Absorbs the first volley."},{"id":"adaptive","name":"Adaptive Armor","slot":"ARMOR","cost":5500,"firepower":0,"hull":111,"shields":20,"speed":0,"income":3,"desc":"Reactive panels and smart seams."},{"id":"medarmor","name":"Med-evac Reinforcement","slot":"ARMOR","cost":2400,"firepower":0,"hull":58,"shields":20,"speed":2,"income":3,"desc":"Survivability and cargo-access modifications."}];
const WEAPONS = [{"id":"hush9","name":"HUSH-9","category":"SIDEARM","desc":"Suppressed compact pistol","cost":420,"damage":19,"rate":4,"utility":7},{"id":"blacktalon","name":"BLACKTALON","category":"SIDEARM","desc":"Heavy revolver","cost":750,"damage":33,"rate":2,"utility":4},{"id":"viper","name":"VIPER","category":"SIDEARM","desc":"Burst-fire sidearm","cost":610,"damage":26,"rate":5,"utility":8},{"id":"spark","name":"SPARK","category":"SIDEARM","desc":"Pulse sidearm","cost":840,"damage":29,"rate":4,"utility":5},{"id":"rook","name":"ROOK-17","category":"ASSAULT","desc":"Modular assault rifle","cost":990,"damage":44,"rate":10,"utility":8},{"id":"marauder","name":"MARAUDER","category":"ASSAULT","desc":"Armor piercing carbine","cost":1350,"damage":57,"rate":8,"utility":7},{"id":"jackal","name":"JACKAL-4","category":"ASSAULT","desc":"Close-range battle rifle","cost":1150,"damage":52,"rate":9,"utility":9},{"id":"corvus","name":"CORVUS","category":"ASSAULT","desc":"Heavy battle rifle","cost":1690,"damage":69,"rate":6,"utility":5},{"id":"spectre","name":"SPECTRE-A","category":"ASSAULT","desc":"Low-signature carbine","cost":1950,"damage":63,"rate":8,"utility":11},{"id":"frenzy","name":"FRENZY","category":"ASSAULT","desc":"High-speed auto rifle","cost":1490,"damage":60,"rate":14,"utility":7},{"id":"cobalt","name":"COBALT","category":"SMG","desc":"Compact machine pistol","cost":800,"damage":31,"rate":15,"utility":13},{"id":"swarm","name":"SWARM","category":"SMG","desc":"Twin-feed PDW","cost":1100,"damage":38,"rate":18,"utility":12},{"id":"grin","name":"GRIN","category":"SMG","desc":"Integral suppressor PDW","cost":1400,"damage":35,"rate":17,"utility":15},{"id":"breach","name":"BREACH-12","category":"SHOTGUN","desc":"Semi-auto breaching shotgun","cost":950,"damage":67,"rate":3,"utility":6},{"id":"maw","name":"MAW","category":"SHOTGUN","desc":"Heavy drum shotgun","cost":1950,"damage":92,"rate":4,"utility":3},{"id":"cinder12","name":"CINDER-12","category":"SHOTGUN","desc":"Thermal assault shotgun","cost":2200,"damage":97,"rate":6,"utility":4},{"id":"eye","name":"DEADEYE","category":"MARKSMAN","desc":"Long-range marksman rifle","cost":1320,"damage":87,"rate":3,"utility":5},{"id":"longglass","name":"LONGGLASS","category":"MARKSMAN","desc":"Precision anti-materiel rifle","cost":2600,"damage":145,"rate":2,"utility":2},{"id":"quietus","name":"QUIETUS","category":"MARKSMAN","desc":"Suppressed bolt-action rifle","cost":2200,"damage":116,"rate":2,"utility":6},{"id":"watcher","name":"WATCHER","category":"MARKSMAN","desc":"Designated marksman system","cost":1690,"damage":92,"rate":5,"utility":8},{"id":"hammer","name":"HAMMER","category":"HEAVY","desc":"Belt-fed machine gun","cost":2800,"damage":120,"rate":17,"utility":1},{"id":"sundown","name":"SUNDOWN","category":"HEAVY","desc":"Portable rail cannon","cost":5100,"damage":203,"rate":1,"utility":0},{"id":"ember","name":"EMBER","category":"HEAVY","desc":"Incendiary launcher","cost":2750,"damage":135,"rate":4,"utility":3},{"id":"rampart","name":"RAMPART","category":"HEAVY","desc":"Auto grenade launcher","cost":3100,"damage":160,"rate":3,"utility":1},{"id":"harrow","name":"HARROW","category":"HEAVY","desc":"Anti-armor launcher","cost":4800,"damage":215,"rate":1,"utility":0},{"id":"lifekit","name":"LIFEKIT","category":"SUPPORT","desc":"Field trauma pack","cost":1200,"damage":10,"rate":1,"utility":18},{"id":"nanomed","name":"NANOMED","category":"SUPPORT","desc":"Combat medical dispenser","cost":2550,"damage":8,"rate":2,"utility":30},{"id":"recon","name":"GHOSTLINK","category":"SUPPORT","desc":"Advanced recon scanner","cost":1800,"damage":13,"rate":4,"utility":22},{"id":"drone","name":"WIDOW","category":"SUPPORT","desc":"Portable sentry drone","cost":2200,"damage":71,"rate":7,"utility":7},{"id":"signal","name":"BLACKBOX","category":"SUPPORT","desc":"Encrypted command relay","cost":2750,"damage":18,"rate":3,"utility":26}];
const CONTRACTS = [{"id":"grim-rescue","title":"Graveyard Shift","type":"RESCUE","description":"Extract stranded assets and secure the evacuation corridor.","baseReward":750,"bonus":"Recover two wounded units +250","missionTarget":3,"repeatable":true},{"id":"black-harvest","title":"Black Harvest","type":"SALVAGE","description":"Recover high-value materiel before the planetary frontline shifts.","baseReward":1200,"bonus":"No asset losses +300","missionTarget":5,"repeatable":true},{"id":"fallen-star","title":"Fallen Star","type":"RECON","description":"Confirm the fate of a missing squad and transmit their coordinates.","baseReward":500,"bonus":"Ghost route +150","missionTarget":1,"repeatable":false},{"id":"supply-line","title":"Ghost Convoy","type":"LOGISTICS","description":"Escort the unsigned cargo manifests through contested space.","baseReward":1000,"bonus":"No cargo losses +200","missionTarget":4,"repeatable":true}];


const own = (p,id) => p && p.ownerId === id;
const clean = (x,max=64) => String(x??'').trim().slice(0,max).replace(/[<>]/g,'');
const hex = (v) => /^#[0-9a-fA-F]{6}$/.test(v||'') ? v : '#91f71f';
const now = () => new Date().toISOString();
const getItem = (id,kind) => ({asset:ASSETS,mod:MODS,weapon:WEAPONS}[kind]||[]).find(x=>x.id===id);
function quality() { const r=Math.random();return r<.65?['STANDARD',1]:r<.88?['ENHANCED',1.06]:r<.98?['RARE',1.13]:['BLACKSITE',1.23]; }
async function charge(db,p,amount,kind,ref){
  // Prototype economy: validate on server. Review transaction concurrency before a public, high-traffic launch.
  if(!Number.isFinite(amount)||amount<=0) throw new Error('Invalid price');
  if ((p.webCredits||0)<amount) throw new Error('Insufficient WEB Blacksite Credits');
  const balance=(p.webCredits||0)-amount;
  await db.ContractorProfile.update(p.id,{webCredits:balance});
  await db.WalletEvent.create({ownerId:p.userId,amount:-amount,balanceAfter:balance,kind,reference:ref,createdAt:now()});
  p.webCredits=balance;
}
async function credit(db,p,amount,kind,ref){
  const balance=(p.webCredits||0)+amount;
  await db.ContractorProfile.update(p.id,{webCredits:balance,webEarned:(p.webEarned||0)+amount});
  await db.WalletEvent.create({ownerId:p.userId,amount,balanceAfter:balance,kind,reference:ref,createdAt:now()});
  p.webCredits=balance;p.webEarned=(p.webEarned||0)+amount;
}
Deno.serve(async function(req){
  try {
    const b=createClientFromRequest(req);const u=await b.auth.me();
    if(!u) return Response.json({error:'Authentication required'},{status:401});
    const db=b.asServiceRole.entities;
    const [p]=await db.ContractorProfile.filter({userId:u.id});
    if(!p) return Response.json({error:'Open the terminal first to create your web dossier.'},{status:400});
    const a=await req.json();const type=String(a.type||'');
    if(type==='profile') {
      const patch={callsign:clean(a.callsign,30)||p.callsign,specialty:clean(a.specialty,50),motto:clean(a.motto,100),bio:clean(a.bio,350),accent:hex(a.accent)};
      await db.ContractorProfile.update(p.id,patch);
      return Response.json({ok:true,message:'DOSSIER UPDATED'});
    }
    if(type==='purchase'){
      const item=getItem(a.id,a.kind);
      if(!item) throw new Error('Product not found');
      await charge(db,p,item.cost,'PURCHASE',item.name);
      if(a.kind==='asset'){
        const [grade,m]=quality();const copy={ownerId:u.id,catalogId:item.id,name:item.name,category:item.category,color:'#1d2722',trimColor:'#91f71f',quality:grade,qualityMultiplier:m,hull:item.hull,firepower:item.firepower,shields:item.shields,speed:item.speed,income:item.income,weaponId:'',components:{},status:'HANGAR',planetId:'',lastTickAt:now(),damage:0,xp:0};
        await db.OwnedAsset.create(copy);
      }else{
        const [existing]=await db.OwnedEquipment.filter({ownerId:u.id,catalogId:item.id,kind:a.kind});
        if(existing) await db.OwnedEquipment.update(existing.id,{quantity:(existing.quantity||0)+1});
        else await db.OwnedEquipment.create({ownerId:u.id,catalogId:item.id,kind:a.kind,quantity:1});
      }
      return Response.json({ok:true,message:'REQUISITION APPROVED'});
    }
    if(['paint','equip','deploy','recall','repair','rename'].includes(type)){
      const asset=await db.OwnedAsset.get(String(a.assetId||''));
      if(!own(asset,u.id)) throw new Error('Not your asset');
      if(type==='paint'){
        await db.OwnedAsset.update(asset.id,{color:hex(a.color),trimColor:hex(a.trimColor)});
      }else if(type==='rename'){
        const name=clean(a.name,36);if(name.length<2)throw new Error('Name too short');
        await db.OwnedAsset.update(asset.id,{name});
      }else if(type==='equip'){
        if(asset.status==='DEPLOYED') throw new Error('Recall the asset before refitting');
        const item=getItem(a.itemId,a.kind);
        if(!item)throw new Error('Equipment unknown');
        const owned=await db.OwnedEquipment.filter({ownerId:u.id,catalogId:item.id,kind:a.kind});
        if(!owned.length) throw new Error('Buy or requisition equipment first');
        if(a.kind==='weapon'){
          if(asset.category!=='MERCENARY')throw new Error('These weapons are assigned to mercenary squads');
          await db.OwnedAsset.update(asset.id,{weaponId:item.id});
        } else {
          const components={...(asset.components||{})};components[item.slot]=item.id;
          await db.OwnedAsset.update(asset.id,{components});
        }
      }else if(type==='deploy'){
        if(asset.status==='DEPLOYED')throw new Error('Already deployed');
        if((asset.damage||0)>=80)throw new Error('Repair before deploying');
        const planetId=clean(a.planetId,80);if(!planetId)throw new Error('Select a planet');
        await db.OwnedAsset.update(asset.id,{status:'DEPLOYED',planetId,lastTickAt:now()});
      }else if(type==='recall'){
        await db.OwnedAsset.update(asset.id,{status:'HANGAR',planetId:''});
      }else if(type==='repair'){
        if(asset.status==='DEPLOYED')throw new Error('Recall first');
        const amount=Math.ceil((asset.damage||0)*Math.max(8,asset.hull/100));
        if(amount>0)await charge(db,p,amount,'REPAIR',asset.name);
        await db.OwnedAsset.update(asset.id,{damage:0});
      }
      return Response.json({ok:true,message:'ASSET RECORD UPDATED'});
    }
    if(type==='accept_contract'){
      const c=CONTRACTS.find(x=>x.id===a.contractId);if(!c)throw new Error('Contract unavailable');
      const all=await db.ContractProgress.filter({ownerId:u.id});
      if(all.some(x=>x.status==='ACTIVE'))throw new Error('Complete or abandon your current web contract first');
      const old=all.find(x=>x.contractId===c.id);
      if(old?.status==='COMPLETED'&&!c.repeatable)throw new Error('This contract is one-time only');
      if(old){await db.ContractProgress.update(old.id,{completed:0,cycle:(old.cycle||1)+1,status:'ACTIVE'});}
      else await db.ContractProgress.create({ownerId:u.id,contractId:c.id,completed:0,cycle:1,status:'ACTIVE',earned:0});
      return Response.json({ok:true,message:'BLACKSITE CONTRACT ACCEPTED'});
    }
    if(type==='abandon_contract'){
      const [progress]=await db.ContractProgress.filter({ownerId:u.id,contractId:String(a.contractId)});
      if(!progress||progress.status!=='ACTIVE')throw new Error('No active contract found');
      await db.ContractProgress.update(progress.id,{status:'ABANDONED'});
      return Response.json({ok:true,message:'CONTRACT RETURNED TO THE BROKER'});
    }
    if(type==='settle'){
      const fleet=await db.OwnedAsset.filter({ownerId:u.id,status:'DEPLOYED'});
      let earned=0,missions=0;
      for(const ship of fleet){
        const start=Date.parse(ship.lastTickAt||now());const elapsed=Number.isFinite(start)?Math.max(0,Math.floor((Date.now()-start)/1800000)):0;
        const ticks=Math.min(elapsed,48);
        if(!ticks)continue;
        let damage=(ship.damage||0),xp=(ship.xp||0),reward=0;
        const modIncome=Object.values(ship.components||{}).reduce((acc,id)=>acc+(MODS.find(m=>m.id===id)?.income||0),0);
        for(let i=0;i<ticks;i++){
          if(damage>=95)break;
          const efficiency=Math.max(.15,1-damage/160);
          const base=(ship.income||0)*((ship.qualityMultiplier||1)+(modIncome/100));
          const battle=Math.random()<.72?1.25:.65;
          reward+=Math.max(0,Math.floor(base*efficiency*battle));
          damage=Math.min(100,damage+(Math.random()<.22?Math.floor(Math.random()*7):0));xp+=3;
        }
        earned+=reward;missions+=ticks;
        // Advance from last processed tick, not from now, to avoid losing remaining uptime.
        const nextTime=new Date(start+ticks*1800000).toISOString();
        await db.OwnedAsset.update(ship.id,{lastTickAt:nextTime,damage,xp,status:damage>=95?'DAMAGED':'DEPLOYED'});
        await db.DeploymentLog.create({ownerId:u.id,assetId:ship.id,planetId:ship.planetId||'',outcome:damage>=95?'WITHDRAWN':'PATROL COMPLETE',reward,damage,xp,executedAt:now()});
      }
      if(earned)await credit(db,p,earned,'PASSIVE_OPERATIONS',`${missions} autonomous patrol cycles`);
      if(missions){
        const active=(await db.ContractProgress.filter({ownerId:u.id,status:'ACTIVE'}))[0];
        const c=CONTRACTS.find(x=>x.id===active?.contractId);
        if(active&&c){
          const completed=Math.min(c.missionTarget,(active.completed||0)+missions);
          if(completed>=c.missionTarget){
            // Mark complete before issuing the reward, so retries cannot issue a second payout.
            await db.ContractProgress.update(active.id,{completed,status:'COMPLETED',earned:(active.earned||0)+c.baseReward});
            await credit(db,p,c.baseReward,'WEB_CONTRACT_COMPLETION',`${c.title} cycle ${active.cycle||1}`);
          }else await db.ContractProgress.update(active.id,{completed});
        }
      }
      return Response.json({ok:true,earned,missions,message:earned?`BROKER CLEARED ${earned} WEB CREDITS`:'No new patrol cycles yet.'});
    }
    if(type==='request_payout'){
      const amount=Math.trunc(Number(a.amount));
      if(!Number.isSafeInteger(amount)||amount<100||amount>50000)throw new Error('Request must be 100–50,000');
      await charge(db,p,amount,'REDEMPTION_ESCROW','Pending staff confirmation — no Discord transfer issued');
      await db.ContractorProfile.update(p.id,{pendingCredits:(p.pendingCredits||0)+amount});
      await db.RewardClaim.create({ownerId:u.id,amount,status:'PENDING_REVIEW',source:'WEB_PASSIVE_GAME',reviewedBy:'',createdAt:now()});
      return Response.json({ok:true,message:'REDEMPTION REQUEST QUEUED. No Discord payout has occurred.'});
    }
    return Response.json({error:'Unsupported action'},{status:400});
  }catch(err){return Response.json({error:String(err?.message||err)},{status:400});}
});
