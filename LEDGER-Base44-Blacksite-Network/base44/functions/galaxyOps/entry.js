import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Self-contained battle math (mirrors shared/galacticMath.js) so this function
// deploys without depending on bundler support for cross-directory imports.
const MODS = [{"id":"railburst","name":"Railburst Array","slot":"WEAPON","income":1},{"id":"coil","name":"Coilcaster Batteries","slot":"WEAPON","income":1},{"id":"flechette","name":"Flechette Cloud","slot":"WEAPON","income":1},{"id":"longbow","name":"Longbow Missile Rack","slot":"WEAPON","income":2},{"id":"hellion","name":"Hellion Plasma Lance","slot":"WEAPON","income":3},{"id":"cinder","name":"Cinder Flamestorm","slot":"WEAPON","income":2},{"id":"bulwark","name":"Bulwark Field","slot":"SHIELD","income":1},{"id":"phase","name":"Phase Veil","slot":"SHIELD","income":2},{"id":"citadel_field","name":"Citadel Shield","slot":"SHIELD","income":3},{"id":"guardian","name":"Guardian Escort Screen","slot":"SHIELD","income":2},{"id":"afterburner","name":"Overburn Drive","slot":"ENGINE","income":1},{"id":"ghostdrive","name":"Ghostdrive","slot":"ENGINE","income":2},{"id":"ion","name":"Ion Splitter","slot":"ENGINE","income":3},{"id":"reactor","name":"Blacksite Reactor","slot":"ENGINE","income":3},{"id":"medbay","name":"Trauma Bay","slot":"UTILITY","income":3},{"id":"smugglers","name":"False Manifest","slot":"UTILITY","income":6},{"id":"salvage","name":"Salvage Drones","slot":"UTILITY","income":4},{"id":"command","name":"Tactical Uplink","slot":"UTILITY","income":4},{"id":"reclaimer","name":"Reclaimer Rig","slot":"UTILITY","income":5},{"id":"blackbox","name":"Blackbox Broker","slot":"UTILITY","income":9},{"id":"armorplate","name":"Ceramic Plating","slot":"ARMOR","income":1},{"id":"ablative","name":"Ablative Shell","slot":"ARMOR","income":1},{"id":"adaptive","name":"Adaptive Armor","slot":"ARMOR","income":3},{"id":"medarmor","name":"Med-evac Reinforcement","slot":"ARMOR","income":3}];

// Shared, pure battle/economy math for LEDGER galactic operations.
// Mirrored by the web client ONLY to preview projected values; every payout is
// recalculated and persisted server-side in functions/galaxyOps.

const MISSION_TYPES = {
  STRIKE: { label: 'STRIKE', reward: 1.15, risk: 1.15, supply: 1.1, tag: 'Direct combat action against the occupying force.' },
  ESCORT: { label: 'ESCORT', reward: 1.0, risk: 0.9, supply: 1.0, tag: 'Screen friendly hulls and civilian traffic.' },
  RECOVERY: { label: 'RECOVERY', reward: 1.1, risk: 1.0, supply: 0.95, tag: 'Recover personnel and high-value materiel.' },
  RESUPPLY: { label: 'RESUPPLY', reward: 0.95, risk: 0.7, supply: 1.35, tag: 'Push fuel, ammunition and rations forward.' },
  RECON: { label: 'RECON', reward: 0.85, risk: 0.8, supply: 0.8, tag: 'Map the battlespace without making contact.' },
  MEDEVAC: { label: 'MEDEVAC', reward: 1.05, risk: 0.85, supply: 1.0, tag: 'Extract casualties under fire.' },
};

const CAPITAL_CATEGORIES = new Set(['CORVETTE', 'CRUISER', 'BATTLESHIP', 'CARRIER', 'STATION']);
const MEDICAL_CATEGORIES = new Set(['MEDICAL']);
const LOGISTICS_CATEGORIES = new Set(['CARGO', 'TRANSPORT']);

function categoryFamily(category) {
  if (MEDICAL_CATEGORIES.has(category)) return 'MEDICAL';
  if (LOGISTICS_CATEGORIES.has(category)) return 'LOGISTICS';
  if (CAPITAL_CATEGORIES.has(category)) return 'CAPITAL';
  if (category === 'STATION') return 'STATION';
  if (category === 'ARMOR' || category === 'MERCENARY') return 'GROUND';
  return 'AIR';
}

function threatScore(planet, campaign) {
  if (!planet) return 0;
  const enemy = planet.ownerKey && planet.ownerKey !== 'HUMANS';
  const base = enemy ? 52 : 18;
  const contested = campaign ? 18 : 0;
  const event = planet.event ? 12 : 0;
  const population = Math.min(18, (planet.players || 0) / 700);
  return Math.max(8, Math.min(98, Math.round(base + contested + event + population)));
}

function campaignForPlanet(bundle, planetId) {
  return bundle?.campaigns?.find(c => c.planetId === String(planetId)) || null;
}

function threatLabel(score) {
  if (score >= 80) return 'EXTREME';
  if (score >= 62) return 'SEVERE';
  if (score >= 44) return 'ELEVATED';
  if (score >= 25) return 'GUARDED';
  return 'LOW';
}

// Deterministic RNG: the same settlement key always produces the same report.
function seeded(key) {
  let h = 2166136261 >>> 0;
  const str = String(key);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function rand() {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function travelMinutes(asset, planet) {
  const distance = Math.hypot(planet?.positionX || 0, planet?.positionY || 0);
  const speed = Math.max(18, Number(asset?.speed) || 40);
  return Math.max(2, Math.min(30, Math.round(3 + distance * 12 - speed / 28)));
}

function missionRisk(asset, planet, campaign, missionType) {
  const type = MISSION_TYPES[missionType] || MISSION_TYPES.STRIKE;
  const family = categoryFamily(asset?.category);
  const doctrine =
    (missionType === 'MEDEVAC' && family === 'MEDICAL') ||
    (missionType === 'RESUPPLY' && family === 'LOGISTICS') ||
    (missionType === 'STRIKE' && !['MEDICAL', 'LOGISTICS'].includes(family))
      ? 0.78
      : 1;
  const condition = 1 + (Number(asset?.damage) || 0) / 220;
  const shields = Math.min(0.2, (Number(asset?.shields) || 0) / 4000);
  const score = threatScore(planet, campaign) * type.risk * doctrine * condition - shields * 100;
  return Math.max(6, Math.min(96, Math.round(score)));
}

function projectedReward(asset, planet, campaign, missionType, config = {}) {
  const type = MISSION_TYPES[missionType] || MISSION_TYPES.STRIKE;
  const family = categoryFamily(asset?.category);
  const specialty =
    (missionType === 'MEDEVAC' && family === 'MEDICAL') ||
    (missionType === 'RESUPPLY' && family === 'LOGISTICS') ||
    (missionType === 'RECON' && family === 'AIR')
      ? 1.18
      : 1;
  const hostile = planet?.ownerKey && planet.ownerKey !== 'HUMANS' ? 1.22 : 0.94;
  const base = (Number(asset?.income) || 3) * 18 * type.reward * specialty * hostile;
  const multiplier = Math.max(0.5, Math.min(2.5, Number(config.rewardMultiplier) || 1));
  return Math.max(1, Math.round(base * multiplier));
}

function maintenanceCost(asset, config = {}) {
  const rate = Math.max(0.05, Math.min(0.5, Number(config.maintenanceRate) || 0.14));
  return Math.max(1, Math.round((Number(asset?.income) || 3) * 18 * rate));
}

function resolveCycle({ asset, planet, campaign, missionType, config, randKey, tick, supplies }) {
  const rand = seeded(`${randKey}:${tick}`);
  const type = MISSION_TYPES[missionType] || MISSION_TYPES.STRIKE;
  const family = categoryFamily(asset?.category);
  const threat = threatScore(planet, campaign);
  const damage = Math.max(0, Number(asset?.damage) || 0);
  const condition = Math.max(0.2, 1 - damage / 120);
  const crew = Math.max(0, Number(asset?.crew) || 0);
  const crewEffectiveness = crew > 0 ? 0.85 + Math.min(0.3, crew / 500) : 1;

  const offense =
    ((Number(asset?.firepower) || 10) * (1 + (family === 'CAPITAL' ? 0.35 : 0)) + (Number(asset?.shields) || 0) * 0.18) *
    condition *
    crewEffectiveness *
    (0.78 + rand() * 0.5);
  const defense = threat * (6 + rand() * 5) * type.risk;
  const ratio = offense / Math.max(1, defense);

  let outcome = 'STALEMATE';
  if (supplies <= 0) outcome = 'SUPPLY_SHORTAGE';
  else if (ratio > 1.55) outcome = 'VICTORY';
  else if (ratio > 1.05) outcome = 'SALVAGE_RECOVERY';
  else if (ratio > 0.62) outcome = 'STALEMATE';
  else if (ratio > 0.4) outcome = 'RETREAT';
  else outcome = 'EVACUATION';

  if (damage > 82 && rand() < 0.45) outcome = 'DAMAGE';

  const outcomeMultiplier = {
    VICTORY: 1.9,
    SALVAGE_RECOVERY: 1.45,
    STALEMATE: 0.95,
    RETREAT: 0.6,
    SUPPLY_SHORTAGE: 0.4,
    EVACUATION: 0.35,
    DAMAGE: 0.25,
  }[outcome];

  const base = projectedReward(asset, planet, campaign, missionType, config);
  const gross = Math.max(0, Math.round(base * outcomeMultiplier * (0.9 + rand() * 0.25)));
  const maintenance = maintenanceCost(asset, config);
  const net = Math.max(0, gross - maintenance);
  const salvo = outcome === 'VICTORY' || outcome === 'SALVAGE_RECOVERY' ? Math.round(gross * (0.08 + rand() * 0.12)) : 0;
  const casualties =
    (family === 'GROUND' || family === 'AIR') && ['EVACUATION', 'RETREAT', 'DAMAGE'].includes(outcome)
      ? Math.max(1, Math.round(rand() * (family === 'GROUND' ? 6 : 3)))
      : 0;
  const damageGain =
    outcome === 'VICTORY' ? Math.round(rand() * 4)
    : outcome === 'SALVAGE_RECOVERY' ? Math.round(2 + rand() * 6)
    : outcome === 'STALEMATE' ? Math.round(4 + rand() * 8)
    : outcome === 'RETREAT' ? Math.round(9 + rand() * 10)
    : outcome === 'SUPPLY_SHORTAGE' ? Math.round(6 + rand() * 9)
    : outcome === 'EVACUATION' ? Math.round(12 + rand() * 14)
    : Math.round(15 + rand() * 12);

  const xp = outcome === 'VICTORY' ? 26 : outcome === 'SALVAGE_RECOVERY' ? 19 : 11;
  const supplyUse = Math.max(1, Math.round((family === 'LOGISTICS' ? 1 : 2) * type.supply));

  const narrative = {
    VICTORY: `${asset.name || 'ASSET'} broke the enemy line above ${planet?.name || 'the target'} and held the corridor. Salvage teams moved in behind the guns.`,
    SALVAGE_RECOVERY: `${asset.name || 'ASSET'} recovered a sealed cache from a derelict position. Brokerage split applied; no questions logged.`,
    STALEMATE: `Contact at ${planet?.name || 'the target'} refused to break. ${asset.name || 'ASSET'} withdrew to standoff range and kept the lane open.`,
    RETREAT: `Overwhelming fire from ${planet?.name || 'the target'} forced ${asset.name || 'ASSET'} to disengage. Damage control teams are requesting dock time.`,
    SUPPLY_SHORTAGE: `${asset.name || 'ASSET'} ran dry mid-operation over ${planet?.name || 'the target'}. Crews improvised; efficiency collapsed.`,
    EVACUATION: `Mass casualty event near ${planet?.name || 'the target'}. ${asset.name || 'ASSET'} executed emergency extraction with the hull still venting.`,
    DAMAGE: `Structural failure aboard ${asset.name || 'ASSET'} during a contested pass. The ship made it back; the repair bill will not be small.`,
  }[outcome];

  return { outcome, narrative, gross, maintenance, net, salvage: salvo, casualties, damageGain, xp, supplyUse, threat };
}

function levelFor(xp) {
  return Math.max(1, Math.min(20, 1 + Math.floor((Number(xp) || 0) / 60)));
}


// LEDGER // GALACTIC OPERATIONS ENGINE
// Every deployment, battle, payout and task force is validated and persisted here.
// The browser only ever sends intent: ids, colours, names and mission types.
const CACHE_KEY = 'hd2-galaxy-bundle-v3';
const CONFIG_KEY = 'GALACTIC_OPS';
const DEFAULT_CONFIG = {
  key: CONFIG_KEY,
  rewardMultiplier: 1,
  payoutCap: 4000,
  maintenanceRate: 0.14,
  cycleMinutes: 15,
  paused: false,
  season: 'SEASON 01 // BLACK VEIL',
  modifiers: [],
};
const ROLES = ['PATROL', 'ESCORT', 'STRIKE', 'RECOVERY', 'LOGISTICS', 'MEDICAL', 'RECON', 'RESERVE'];
const DOCTRINES = ['BALANCED', 'SHOCK', 'SCREEN', 'SUPPORT', 'STEALTH'];
const LORE = [
  { code: 'XII', kind: 'BROKER', body: 'Manifest says nine crates. Eight arrived. The ninth was never loaded — or never meant to be.' },
  { code: 'CREEK-01', kind: 'SALVAGE', body: 'An unregistered beacon is broadcasting from a dead orbit. Payment first. Questions never.' },
  { code: 'ANGEL-03', kind: 'MEDICAL', body: 'Medical supplies are not contraband until someone decides who deserves them.' },
  { code: 'REAPER', kind: 'CONTACT', body: 'Unknown vessel detected. Transponder rejected. The Broker is listening on 91.71 MHz.' },
];

const trim = (v, n = 500) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const hex = v => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : '#91f71f');
const clampNum = (v, min, max, fallback) => {
  const num = Number(v);
  return Number.isFinite(num) ? Math.max(min, Math.min(max, num)) : fallback;
};
// Active staff events multiply rewards only on their target theatre.
function eventMultiplier(config, planetId) {
  return (config?.modifiers || [])
    .filter(m => (!m.planetId || String(m.planetId) === String(planetId)) && (!m.endsAt || Date.parse(m.endsAt) > Date.now()))
    .reduce((max, m) => Math.max(max, Number(m.multiplier) || 1), 1);
}
const now = () => new Date().toISOString();
const unwrapPlanet = (p, campaign) => ({
  planetId: p.planetId,
  hash: p.hash,
  name: p.name,
  sector: p.sector,
  owner: p.owner,
  ownerKey: p.ownerKey,
  liberation: p.liberation,
  humans: p.humans,
  players: p.players,
  event: p.event,
  hazards: p.hazards,
  biome: p.biome,
  contested: !!campaign,
  threat: threatScore(p, campaign),
});

async function loadConfig(db) {
  let [config] = await db.GalacticOpsConfig.filter({ key: CONFIG_KEY });
  if (!config) {
    config = await db.GalacticOpsConfig.create({ ...DEFAULT_CONFIG, updatedAt: now(), updatedByDiscordId: '' });
  }
  return { ...DEFAULT_CONFIG, ...config };
}

async function loadBundle(db) {
  const cache = (await db.LedgerMirrorCache.filter({ cacheKey: CACHE_KEY }))[0];
  return cache?.payload?.planets?.length ? cache.payload : null;
}

function campaignFor(bundle, planetId) {
  return bundle.campaigns?.find(c => c.planetId === String(planetId)) || null;
}

async function adjustWallet(db, profile, amount, kind, reference) {
  const [fresh] = await db.ContractorProfile.filter({ userId: profile.userId });
  if (!fresh) throw new Error('Contractor profile unavailable');
  const balance = Number(fresh.webCredits) || 0;
  if (amount < 0 && balance + amount < 0) throw new Error('Insufficient web Blacksite Credits');
  const next = balance + amount;
  const patch = { webCredits: next };
  if (amount > 0) {
    patch.webEarned = (Number(fresh.webEarned) || 0) + amount;
    patch.galacticEarned = (Number(fresh.galacticEarned) || 0) + amount;
  }
  await db.ContractorProfile.update(fresh.id, patch);
  await db.WalletEvent.create({ ownerId: fresh.userId, amount, balanceAfter: next, kind, reference, createdAt: now() });
  return next;
}

async function verifyAdmin(db, user, env) {
  const identity = (await db.DiscordIdentity.filter({ userId: user.id }))[0];
  const roleId = env.get('LEDGER_MOD_ROLE_ID');
  const guildId = env.get('DISCORD_GUILD_ID');
  const token = env.get('DISCORD_BOT_TOKEN');
  const isId = v => /^\d{16,22}$/.test(String(v || ''));
  if (!identity || !isId(roleId) || !isId(guildId) || !token) {
    throw new Error('LEDGER moderator role verification unavailable.');
  }
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${identity.discordId}`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('Discord role check failed; access denied.');
  const member = await res.json();
  if (!(member.roles || []).includes(roleId)) throw new Error('LEDGER moderation role required.');
  return identity;
}

async function autoArrive(db, deployments) {
  const changed = [];
  for (const dep of deployments) {
    if (dep.status === 'IN_TRANSIT' && Date.parse(dep.arrivesAt) <= Date.now()) {
      const cycle = Number(dep.cycleMinutes) || 15;
      await db.GalacticDeployment.update(dep.id, {
        status: 'ACTIVE',
        deployedAt: dep.arrivesAt,
        settledThrough: 0,
        cycleMinutes: cycle,
      });
      await db.GalacticTransmission.create({
        ownerId: dep.ownerId,
        kind: 'ARRIVAL',
        severity: 'info',
        callsign: dep.assetName,
        body: `${dep.assetName} has entered contested orbital space at ${dep.planetName}.`,
        planetId: dep.planetId,
        deploymentId: dep.id,
        createdAt: now(),
      }).catch(() => {});
      changed.push({ ...dep, status: 'ACTIVE', deployedAt: dep.arrivesAt });
    }
  }
  return changed;
}

// Idempotent settlement: acquire a token on the deployment, re-read to confirm ownership
// of the token, create an immutable report keyed by its tick window, then credit once.
async function settleDeployment(db, profile, dep, bundle, config) {
  if (dep.status !== 'ACTIVE' || !dep.deployedAt) return null;
  const cycleMs = Math.max(5, Math.min(180, Number(dep.cycleMinutes) || 15)) * 60_000;
  const elapsed = Math.floor((Date.now() - Date.parse(dep.deployedAt)) / cycleMs);
  const from = Number(dep.settledThrough) || 0;
  const cycles = Math.min(4, elapsed - from);
  if (cycles <= 0) return null;
  const to = from + cycles;
  const key = `${dep.id}:${from}:${to}`;

  const duplicate = await db.GalacticBattleReport.filter({ settlementKey: key });
  if (duplicate.length) {
    await db.GalacticDeployment.update(dep.id, { settledThrough: to, settlementToken: '' });
    return null;
  }

  const token = crypto.randomUUID();
  await db.GalacticDeployment.update(dep.id, { settlementToken: token });
  const check = await db.GalacticDeployment.get(dep.id).catch(() => null);
  if (!check || check.settlementToken !== token) return null;

  const planet = bundle.planets.find(p => p.planetId === String(dep.planetId));
  const campaign = campaignFor(bundle, dep.planetId);
  if (!planet) {
    await db.GalacticDeployment.update(dep.id, { settlementToken: '' });
    throw new Error('Planet telemetry no longer covers this deployment; settlement deferred.');
  }

  const asset = await db.OwnedAsset.get(dep.assetId).catch(() => null);
  if (!asset || String(asset.ownerId) !== String(profile.userId)) {
    await db.GalacticDeployment.update(dep.id, { settlementToken: '' });
    throw new Error('Deployed asset record is unavailable');
  }

  const baseIncome = Number(asset.income) || 3;
  const modIncome = Object.values(asset.components || {}).reduce(
    (sum, id) => sum + (MODS.find(m => m.id === id)?.income || 0),
    0,
  );
  let supplies = Number(dep.supplies) || 100;
  let damage = Number(dep.damage) || Number(asset.damage) || 0;
  let totalGross = 0;
  let totalMaintenance = 0;
  let totalSalvage = 0;
  let totalCasualties = 0;
  let totalXp = 0;
  let last = null;
  const eventMod = eventMultiplier(config, dep.planetId);
  const settlementConfig = { ...config, rewardMultiplier: (Number(config.rewardMultiplier) || 1) * eventMod };
  const modifierSet = new Set([`MISSION:${dep.missionType}`, `FACTION:${planet.ownerKey}`]);
  const activeEvent = (config.modifiers || []).find(m => (!m.planetId || String(m.planetId) === String(dep.planetId)) && Date.parse(m.endsAt || 0) > Date.now());
  if (activeEvent) modifierSet.add(`EVENT:${activeEvent.title} ×${eventMod}`);

  for (let tick = from; tick < to; tick++) {
    const result = resolveCycle({
      asset: { ...asset, income: baseIncome * (1 + modIncome / 100), damage },
      planet,
      campaign,
      missionType: dep.missionType,
      config: settlementConfig,
      randKey: key,
      tick,
      supplies,
    });
    totalGross += result.gross;
    totalMaintenance += result.maintenance;
    totalSalvage += result.salvage;
    totalCasualties += result.casualties;
    totalXp += result.xp;
    damage = Math.min(100, damage + result.damageGain);
    supplies = Math.max(0, supplies - result.supplyUse);
    last = result;
  }

  const cap = clampNum(config.payoutCap, 50, 50_000, 4000);
  const net = Math.max(0, Math.min(cap, totalGross - totalMaintenance));
  const outcome = last?.outcome || 'STALEMATE';
  const report = await db.GalacticBattleReport.create({
    ownerId: profile.userId,
    deploymentId: dep.id,
    assetId: dep.assetId,
    assetName: dep.assetName,
    category: dep.category,
    planetId: dep.planetId,
    planetName: dep.planetName,
    sector: dep.sector,
    faction: planet.owner,
    missionType: dep.missionType,
    settlementKey: key,
    fromTick: from,
    toTick: to,
    cycles,
    outcome,
    narrative: last?.narrative || 'Operation concluded with no clear result.',
    reward: totalGross,
    maintenance: totalMaintenance,
    net,
    salvage: totalSalvage,
    damage: Math.round(damage),
    xp: totalXp,
    casualties: totalCasualties,
    suppliesUsed: Math.max(0, Number(dep.supplies) - supplies),
    reconciliationStatus: 'PENDING_RECONCILIATION',
    modifiers: [...modifierSet],
    acknowledged: false,
    createdAt: now(),
  });

  if (net > 0) {
    await adjustWallet(db, profile, net, 'GALACTIC_OPERATION', `${dep.assetName} // ${dep.planetName} // pending reconciliation`);
  }

  const level = levelFor((Number(asset.xp) || 0) + totalXp);
  await db.OwnedAsset.update(asset.id, {
    damage: Math.round(damage),
    xp: (Number(asset.xp) || 0) + totalXp,
    level,
    supplies: Math.round(supplies),
    galacticSorties: (Number(asset.galacticSorties) || 0) + cycles,
    lastMaintenanceAt: now(),
    status: damage >= 95 ? 'DAMAGED' : 'DEPLOYED',
    ...(damage >= 95 ? { planetId: '' } : {}),
  });

  await db.GalacticDeployment.update(dep.id, {
    settledThrough: to,
    settlementToken: '',
    supplies: Math.round(supplies),
    damage: Math.round(damage),
    xp: (Number(dep.xp) || 0) + totalXp,
    level,
    earned: (Number(dep.earned) || 0) + net,
    sorties: (Number(dep.sorties) || 0) + cycles,
    lastReportId: report.id,
    status: damage >= 95 ? 'DAMAGED' : 'ACTIVE',
  });

  if (damage >= 70) {
    await db.GalacticTransmission.create({
      ownerId: dep.ownerId,
      kind: 'EMERGENCY',
      severity: 'alert',
      callsign: dep.assetName,
      body: `${dep.assetName} reports critical damage over ${dep.planetName}. Medical extraction requested. Priority: ${damage >= 95 ? 'CRITICAL' : 'ELEVATED'}.`,
      planetId: dep.planetId,
      deploymentId: dep.id,
      createdAt: now(),
    }).catch(() => {});
  } else if (net > 0) {
    await db.GalacticTransmission.create({
      ownerId: dep.ownerId,
      kind: 'PAYMENT',
      severity: 'success',
      callsign: dep.assetName,
      body: `Contract fulfilled. ${net} web Blacksite Credits authorized for ${dep.assetName}. Reconciliation pending.`,
      planetId: dep.planetId,
      deploymentId: dep.id,
      createdAt: now(),
    }).catch(() => {});
  }

  // Occasional declassified fragment, deterministic per settlement window.
  if (seeded(`lore:${key}`)() < 0.22) {
    const fragment = LORE[Math.floor(seeded(`lore-pick:${key}`)() * LORE.length)];
    await db.GalacticTransmission.create({
      ownerId: dep.ownerId,
      kind: 'LORE',
      severity: 'notice',
      callsign: `ARCHIVE // ${fragment.code}`,
      body: fragment.body,
      planetId: dep.planetId,
      deploymentId: dep.id,
      createdAt: now(),
    }).catch(() => {});
  }

  return report;
}

async function shapedState(db, profile, config) {
  const bundle = await loadBundle(db);
  const [rawDeployments, reports, taskForces, transmissions, globalTransmissions] = await Promise.all([
    db.GalacticDeployment.filter({ ownerId: profile.userId }, '-created_date', 60),
    db.GalacticBattleReport.filter({ ownerId: profile.userId }, '-created_date', 24),
    db.GalacticTaskForce.filter({ ownerId: profile.userId }, '-created_date', 20),
    db.GalacticTransmission.filter({ ownerId: profile.userId }, '-created_date', 24),
    db.GalacticTransmission.filter({ ownerId: '' }, '-created_date', 8).catch(() => []),
  ]);
  const feed = [...transmissions, ...globalTransmissions]
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
    .slice(0, 24);
  const deployments = rawDeployments.map(dep => {
    const planet = bundle?.planets?.find(p => p.planetId === String(dep.planetId));
    const campaign = bundle ? campaignFor(bundle, dep.planetId) : null;
    return {
      ...dep,
      planet: planet ? unwrapPlanet(planet, campaign) : null,
      timeRemainingMs: dep.status === 'IN_TRANSIT' ? Math.max(0, Date.parse(dep.arrivesAt) - Date.now()) : 0,
    };
  });
  const allActivity = await db.GalacticDeployment.list('-created_date', 200).catch(() => []);
  const planetActivity = allActivity.reduce((acc, dep) => {
    if (!['ACTIVE', 'IN_TRANSIT'].includes(dep.status)) return acc;
    acc[dep.planetId] = (acc[dep.planetId] || 0) + 1;
    return acc;
  }, {});
  return {
    config,
    deployments,
    reports,
    taskForces,
    transmissions: feed,
    planetActivity,
    lore: LORE,
    profile: {
      webCredits: Number(profile.webCredits) || 0,
      galacticEarned: Number(profile.galacticEarned) || 0,
      galacticSorties: Number(profile.galacticSorties) || 0,
    },
    serverNow: now(),
    freshness: bundle ? 'SYNCED' : 'NO_TELEMETRY',
  };
}

Deno.serve(async function (req) {
  try {
    const app = createClientFromRequest(req);
    const user = await app.auth.me();
    if (!user?.id) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const db = app.asServiceRole.entities;
    const [profile] = await db.ContractorProfile.filter({ userId: user.id });
    if (!profile) return Response.json({ error: 'Open the terminal first to create your web dossier.' }, { status: 400 });
    const payload = await req.json().catch(() => ({}));
    const type = String(payload.type || 'state');
    const bundle = await loadBundle(db);
    const config = await loadConfig(db);

    if (type === 'state') {
      const pending = await db.GalacticDeployment.filter({ ownerId: user.id });
      const arrived = await autoArrive(db, pending);
      const due = [];
      if (!config.paused) {
        for (const dep of pending.filter(d => d.status === 'ACTIVE').slice(0, 3)) {
          const cycleMs = Math.max(5, Math.min(180, Number(dep.cycleMinutes) || 15)) * 60_000;
          const elapsed = Math.floor((Date.now() - Date.parse(dep.deployedAt || now())) / cycleMs);
          if (elapsed - (Number(dep.settledThrough) || 0) >= 1 && bundle) {
            const report = await settleDeployment(db, profile, dep, bundle, config).catch(() => null);
            if (report) due.push(report);
          }
        }
      }
      const state = await shapedState(db, profile, config);
      return Response.json({ ok: true, ...state, autoSettled: due.length, arrivals: arrived.length });
    }

    if (type === 'deploy') {
      if (config.paused) throw new Error('Galactic simulation is paused by LEDGER command.');
      if (!bundle) throw new Error('Planetary telemetry unavailable. Refresh the galactic chart first.');
      const planet = bundle.planets.find(p => p.planetId === String(payload.planetId));
      if (!planet) throw new Error('Planet not found in the current community feed');
      const missionType = MISSION_TYPES[payload.missionType] ? payload.missionType : 'STRIKE';
      const ids = [...new Set((Array.isArray(payload.assetIds) ? payload.assetIds : [payload.assetId]).filter(Boolean))].slice(0, 6);
      if (!ids.length) throw new Error('Select at least one asset');
      let taskForceId = '';
      if (payload.taskForceId) {
        const force = await db.GalacticTaskForce.get(String(payload.taskForceId)).catch(() => null);
        if (!force || String(force.ownerId) !== String(user.id)) throw new Error('Task force not found');
        taskForceId = force.id;
      }
      const campaign = campaignFor(bundle, planet.planetId);
      const created = [];
      for (const id of ids) {
        const asset = await db.OwnedAsset.get(String(id)).catch(() => null);
        if (!asset || String(asset.ownerId) !== String(user.id)) throw new Error('Asset not owned by this contractor');
        if (asset.status === 'DEPLOYED') throw new Error(`${asset.name} is already operating in the field. Recall it first.`);
        if ((Number(asset.damage) || 0) >= 80) throw new Error(`${asset.name} requires repair before deployment`);
        const minutes = travelMinutes(asset, planet);
        const risk = missionRisk(asset, planet, campaign, missionType);
        const projected = projectedReward(asset, planet, campaign, missionType, {
          ...config,
          rewardMultiplier: (Number(config.rewardMultiplier) || 1) * eventMultiplier(config, planet.planetId),
        });
        const dep = await db.GalacticDeployment.create({
          ownerId: user.id,
          assetId: asset.id,
          assetName: asset.name,
          category: asset.category,
          planetId: planet.planetId,
          planetHash: planet.hash,
          planetName: planet.name,
          sector: planet.sector,
          faction: planet.owner,
          taskForceId,
          missionType,
          status: 'IN_TRANSIT',
          departedAt: now(),
          arrivesAt: new Date(Date.now() + minutes * 60_000).toISOString(),
          deployedAt: '',
          recalledAt: '',
          settledThrough: 0,
          settlementToken: '',
          cycleMinutes: clampNum(config.cycleMinutes, 5, 180, 15),
          risk,
          supplies: Math.max(0, Math.min(100, Number(asset.supplies ?? 100))),
          damage: Number(asset.damage) || 0,
          xp: 0,
          level: levelFor(asset.xp),
          earned: 0,
          sorties: 0,
          rewardProjected: projected,
          lastReportId: '',
          createdAt: now(),
        });
        await db.OwnedAsset.update(asset.id, {
          status: 'DEPLOYED',
          planetId: planet.planetId,
          supplies: Math.max(0, Math.min(100, Number(asset.supplies ?? 100))),
          taskForceId,
        });
        await db.GalacticTransmission.create({
          ownerId: user.id,
          kind: 'DEPARTURE',
          severity: 'info',
          callsign: asset.name,
          body: `${asset.name} departed for ${planet.name}. Transit window ${minutes} minutes.`,
          planetId: planet.planetId,
          deploymentId: dep.id,
          createdAt: now(),
        }).catch(() => {});
        created.push(dep);
      }
      await db.ContractorProfile.update(profile.id, { galacticSorties: (Number(profile.galacticSorties) || 0) + created.length });
      return Response.json({
        ok: true,
        deployments: created,
        message: `${created.length} asset${created.length === 1 ? '' : 's'} committed to ${planet.name}. Fictional LEDGER operation — the Helldivers war is unaffected.`,
      });
    }

    if (type === 'recall') {
      const dep = await db.GalacticDeployment.get(String(payload.deploymentId || '')).catch(() => null);
      if (!dep || String(dep.ownerId) !== String(user.id)) throw new Error('Deployment not found');
      if (!['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(dep.status)) throw new Error('This deployment is already closed');
      await db.GalacticDeployment.update(dep.id, { status: 'RECALLED', recalledAt: now() });
      const asset = await db.OwnedAsset.get(dep.assetId).catch(() => null);
      if (asset && String(asset.ownerId) === String(user.id)) {
        await db.OwnedAsset.update(asset.id, {
          status: (Number(asset.damage) || 0) >= 80 ? 'DAMAGED' : 'HANGAR',
          planetId: '',
        });
      }
      await db.GalacticTransmission.create({
        ownerId: user.id,
        kind: 'RECALL',
        severity: 'notice',
        callsign: dep.assetName,
        body: `${dep.assetName} recalled from ${dep.planetName}. Recovery corridor cleared.`,
        planetId: dep.planetId,
        deploymentId: dep.id,
        createdAt: now(),
      }).catch(() => {});
      return Response.json({ ok: true, message: 'Asset recalled to hangar.' });
    }

    if (type === 'settle') {
      if (config.paused) throw new Error('Settlements paused by LEDGER command.');
      if (!bundle) throw new Error('Planetary telemetry unavailable; settlement deferred.');
      const pendings = await db.GalacticDeployment.filter({ ownerId: user.id, status: 'ACTIVE' });
      await autoArrive(db, await db.GalacticDeployment.filter({ ownerId: user.id }));
      const reports = [];
      for (const dep of pendings) {
        const report = await settleDeployment(db, profile, dep, bundle, config).catch(() => null);
        if (report) reports.push(report);
      }
      const state = await shapedState(db, profile, config);
      return Response.json({
        ok: true,
        reports,
        settled: reports.length,
        ...state,
        message: reports.length
          ? `${reports.reduce((s, r) => s + r.net, 0)} web credits cleared from ${reports.length} after-action report${reports.length === 1 ? '' : 's'}.`
          : 'No battle cycles are due yet. Operations continue on the server.',
      });
    }

    if (['rename', 'paint', 'repair', 'restock', 'role', 'crew', 'install', 'task_assign'].includes(type)) {
      const asset = await db.OwnedAsset.get(String(payload.assetId || '')).catch(() => null);
      if (!asset || String(asset.ownerId) !== String(user.id)) throw new Error('Asset not owned by this contractor');
      if (asset.status === 'DEPLOYED' && !['paint'].includes(type)) throw new Error('Recall the asset before refitting');
      if (type === 'rename') {
        const name = trim(payload.name, 36);
        if (name.length < 2) throw new Error('Designation too short');
        await db.OwnedAsset.update(asset.id, { name });
        return Response.json({ ok: true, message: 'Hull designation updated' });
      }
      if (type === 'paint') {
        await db.OwnedAsset.update(asset.id, { color: hex(payload.color), trimColor: hex(payload.trimColor) });
        return Response.json({ ok: true, message: 'Livery saved to the registry' });
      }
      if (type === 'repair') {
        const cost = Math.ceil((Number(asset.damage) || 0) * Math.max(8, (Number(asset.hull) || 100) / 100));
        if (cost > 0) await adjustWallet(db, profile, -cost, 'GALACTIC_REPAIR', `${asset.name} hull restoration`);
        await db.OwnedAsset.update(asset.id, { damage: 0, status: 'HANGAR', lastMaintenanceAt: now() });
        return Response.json({ ok: true, message: cost ? `Hull restored for ${cost} web BC` : 'Hull already clean' });
      }
      if (type === 'restock') {
        const missing = Math.max(0, 100 - (Number(asset.supplies) || 0));
        const cost = Math.ceil(missing * Math.max(1, (Number(asset.income) || 3) / 3));
        if (missing && cost) await adjustWallet(db, profile, -cost, 'GALACTIC_RESUPPLY', `${asset.name} supply restock`);
        await db.OwnedAsset.update(asset.id, { supplies: 100 });
        return Response.json({ ok: true, message: cost ? `Supplies replenished for ${cost} web BC` : 'Stores already full' });
      }
      if (type === 'role') {
        const role = String(payload.role || '').toUpperCase();
        if (!ROLES.includes(role)) throw new Error('Unsupported operational role');
        await db.OwnedAsset.update(asset.id, { role });
        return Response.json({ ok: true, message: `Operational role set to ${role}` });
      }
      if (type === 'crew') {
        const max = categoryFamily(asset.category) === 'GROUND' ? 24 : 240;
        const crew = Math.round(clampNum(payload.crew, 0, max, 0));
        await db.OwnedAsset.update(asset.id, { crew });
        return Response.json({ ok: true, message: `Crew manifest set to ${crew}` });
      }
      if (type === 'install') {
        const item = MODS.find(m => m.id === payload.itemId);
        if (!item) throw new Error('Module unknown');
        const owned = await db.OwnedEquipment.filter({ ownerId: user.id, catalogId: item.id, kind: 'mod' });
        if (!owned.length) throw new Error('Requisition the module before installing it');
        const components = { ...(asset.components || {}) };
        components[item.slot] = item.id;
        await db.OwnedAsset.update(asset.id, { components });
        return Response.json({ ok: true, message: `${item.name} installed` });
      }
      if (type === 'task_assign') {
        const forceId = String(payload.taskForceId || '');
        if (forceId) {
          const force = await db.GalacticTaskForce.get(forceId).catch(() => null);
          if (!force || String(force.ownerId) !== String(user.id)) throw new Error('Task force not found');
          if (!(force.assetIds || []).includes(asset.id)) throw new Error('Assign assets to the task force first');
        }
        await db.OwnedAsset.update(asset.id, { taskForceId: forceId });
        return Response.json({ ok: true, message: forceId ? 'Asset assigned to task force' : 'Asset detached from task force' });
      }
    }

    if (type === 'task_force_save') {
      const name = trim(payload.name, 28).toUpperCase();
      if (name.length < 2) throw new Error('Task force name too short');
      const doctrine = DOCTRINES.includes(payload.doctrine) ? payload.doctrine : 'BALANCED';
      const ids = [...new Set((Array.isArray(payload.assetIds) ? payload.assetIds : []).filter(Boolean))].slice(0, 8);
      const assets = [];
      for (const id of ids) {
        const asset = await db.OwnedAsset.get(String(id)).catch(() => null);
        if (!asset || String(asset.ownerId) !== String(user.id)) throw new Error('Task force contains an unowned asset');
        assets.push(asset);
      }
      let force;
      if (payload.id) {
        force = await db.GalacticTaskForce.get(String(payload.id)).catch(() => null);
        if (!force || String(force.ownerId) !== String(user.id)) throw new Error('Task force not found');
        force = await db.GalacticTaskForce.update(force.id, { name, doctrine, assetIds: assets.map(a => a.id), updatedAt: now(), active: true });
      } else {
        force = await db.GalacticTaskForce.create({
          ownerId: user.id,
          name,
          doctrine,
          assetIds: assets.map(a => a.id),
          homePlanetId: trim(payload.homePlanetId, 20),
          active: true,
          createdAt: now(),
          updatedAt: now(),
        });
      }
      for (const asset of assets) await db.OwnedAsset.update(asset.id, { taskForceId: force.id });
      return Response.json({ ok: true, force, message: `${name} mustered. ${assets.length} asset${assets.length === 1 ? '' : 's'} assigned.` });
    }

    if (type === 'task_force_delete') {
      const force = await db.GalacticTaskForce.get(String(payload.id || '')).catch(() => null);
      if (!force || String(force.ownerId) !== String(user.id)) throw new Error('Task force not found');
      await db.GalacticTaskForce.update(force.id, { active: false, updatedAt: now() });
      for (const id of force.assetIds || []) {
        const asset = await db.OwnedAsset.get(id).catch(() => null);
        if (asset && String(asset.ownerId) === String(user.id)) await db.OwnedAsset.update(id, { taskForceId: '' });
      }
      return Response.json({ ok: true, message: 'Task force dissolved' });
    }

    if (type === 'ack_report') {
      const report = await db.GalacticBattleReport.get(String(payload.reportId || '')).catch(() => null);
      if (!report || String(report.ownerId) !== String(user.id)) throw new Error('Report not found');
      await db.GalacticBattleReport.update(report.id, { acknowledged: true });
      return Response.json({ ok: true });
    }

    if (type.startsWith('admin_')) {
      const identity = await verifyAdmin(db, user, Deno.env);
      const audit = (action, target, details) =>
        db.WebAdminAudit.create({
          actorUserId: String(user.id),
          actorDiscordId: identity.discordId,
          action,
          target,
          details,
          createdAt: now(),
        });

      if (type === 'admin_status') {
        const [reports, deployments, claims] = await Promise.all([
          db.GalacticBattleReport.list('-created_date', 25),
          db.GalacticDeployment.list('-created_date', 60),
          db.RewardClaim.filter({ status: 'PENDING_REVIEW' }),
        ]);
        const pending = reports.reduce((sum, r) => sum + (Number(r.net) || 0), 0);
        return Response.json({
          ok: true,
          isAdmin: true,
          config,
          reports,
          deployments,
          pendingReconciliation: pending,
          pendingClaims: claims.length,
          suspicious: reports.filter(r => (Number(r.net) || 0) >= clampNum(config.payoutCap, 50, 50_000, 4000)),
          roleVerifiedAt: now(),
        });
      }

      if (type === 'admin_config') {
        const patch = {
          rewardMultiplier: clampNum(payload.rewardMultiplier, 0.5, 2.5, config.rewardMultiplier),
          payoutCap: Math.round(clampNum(payload.payoutCap, 50, 50_000, config.payoutCap)),
          maintenanceRate: clampNum(payload.maintenanceRate, 0.05, 0.5, config.maintenanceRate),
          cycleMinutes: Math.round(clampNum(payload.cycleMinutes, 5, 180, config.cycleMinutes)),
          paused: typeof payload.paused === 'boolean' ? payload.paused : !!config.paused,
          season: trim(payload.season || config.season, 60),
          updatedAt: now(),
          updatedByDiscordId: identity.discordId,
        };
        await db.GalacticOpsConfig.update(config.id, patch);
        await audit('GALACTIC_CONFIG_UPDATED', config.id, patch);
        return Response.json({ ok: true, config: { ...config, ...patch }, message: 'Galactic economy updated.' });
      }

      if (type === 'admin_event') {
        const title = trim(payload.title, 80);
        if (title.length < 4) throw new Error('Event title required');
        const planetId = trim(payload.planetId, 20);
        const modifier = {
          title,
          planetId,
          multiplier: clampNum(payload.multiplier, 0.5, 3, 1.5),
          endsAt: new Date(Date.now() + clampNum(payload.minutes, 15, 10_080, 720) * 60_000).toISOString(),
          createdBy: identity.discordId,
        };
        const modifiers = [...(config.modifiers || []), modifier].slice(-8);
        await db.GalacticOpsConfig.update(config.id, { modifiers, updatedAt: now(), updatedByDiscordId: identity.discordId });
        await db.GalacticTransmission.create({
          ownerId: '',
          kind: 'SPECIAL_EVENT',
          severity: 'alert',
          callsign: 'BLACKSITE COMMAND',
          body: `${title}. Reward modifier ×${modifier.multiplier} on ${planetId || 'all theatres'} until ${modifier.endsAt}.`,
          planetId,
          deploymentId: '',
          createdAt: now(),
        });
        await audit('GALACTIC_EVENT_CREATED', planetId, modifier);
        return Response.json({ ok: true, modifier, message: 'Fictional event broadcast to the fleet.' });
      }

      if (type === 'admin_cancel') {
        const dep = await db.GalacticDeployment.get(String(payload.deploymentId || '')).catch(() => null);
        if (!dep) throw new Error('Deployment not found');
        await db.GalacticDeployment.update(dep.id, { status: 'CANCELLED', recalledAt: now() });
        const asset = await db.OwnedAsset.get(dep.assetId).catch(() => null);
        if (asset) await db.OwnedAsset.update(asset.id, { status: 'HANGAR', planetId: '' });
        await audit('GALACTIC_DEPLOYMENT_CANCELLED', dep.id, { assetName: dep.assetName, planetName: dep.planetName });
        return Response.json({ ok: true, message: 'Operation cancelled. No reward was issued.' });
      }

      if (type === 'admin_flag_report') {
        const report = await db.GalacticBattleReport.get(String(payload.reportId || '')).catch(() => null);
        if (!report) throw new Error('Report not found');
        await db.GalacticBattleReport.update(report.id, { reconciliationStatus: 'HELD_FOR_REVIEW' });
        await audit('GALACTIC_REPORT_HELD', report.id, { net: report.net });
        return Response.json({ ok: true, message: 'Report held for manual review. No credits were removed.' });
      }
    }

    return Response.json({ error: 'Unsupported galactic operation' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 400 });
  }
});
