// Shared, pure battle/economy math for LEDGER galactic operations.
// Mirrored by the web client ONLY to preview projected values; every payout is
// recalculated and persisted server-side in functions/galaxyOps.

export const MISSION_TYPES = {
  STRIKE: { label: 'STRIKE', reward: 1.15, risk: 1.15, supply: 1.1, tag: 'Direct combat action against the occupying force.' },
  ESCORT: { label: 'ESCORT', reward: 1.0, risk: 0.9, supply: 1.0, tag: 'Screen friendly hulls and civilian traffic.' },
  RECOVERY: { label: 'RECOVERY', reward: 1.1, risk: 1.0, supply: 0.95, tag: 'Recover personnel and high-value materiel.' },
  RESUPPLY: { label: 'RESUPPLY', reward: 0.95, risk: 0.7, supply: 1.35, tag: 'Push fuel, ammunition and rations forward.' },
  RECON: { label: 'RECON', reward: 0.85, risk: 0.8, supply: 0.8, tag: 'Map the battlespace without making contact.' },
  MEDEVAC: { label: 'MEDEVAC', reward: 1.05, risk: 0.85, supply: 1.0, tag: 'Extract casualties under fire.' },
};

export const CAPITAL_CATEGORIES = new Set(['CORVETTE', 'CRUISER', 'BATTLESHIP', 'CARRIER', 'STATION']);
export const MEDICAL_CATEGORIES = new Set(['MEDICAL']);
export const LOGISTICS_CATEGORIES = new Set(['CARGO', 'TRANSPORT']);

export function categoryFamily(category) {
  if (MEDICAL_CATEGORIES.has(category)) return 'MEDICAL';
  if (LOGISTICS_CATEGORIES.has(category)) return 'LOGISTICS';
  if (CAPITAL_CATEGORIES.has(category)) return 'CAPITAL';
  if (category === 'STATION') return 'STATION';
  if (category === 'ARMOR' || category === 'MERCENARY') return 'GROUND';
  return 'AIR';
}

export function threatScore(planet, campaign) {
  if (!planet) return 0;
  const enemy = planet.ownerKey && planet.ownerKey !== 'HUMANS';
  const base = enemy ? 52 : 18;
  const contested = campaign ? 18 : 0;
  const event = planet.event ? 12 : 0;
  const population = Math.min(18, (planet.players || 0) / 700);
  return Math.max(8, Math.min(98, Math.round(base + contested + event + population)));
}

export function campaignForPlanet(bundle, planetId) {
  return bundle?.campaigns?.find(c => c.planetId === String(planetId)) || null;
}

export function threatLabel(score) {
  if (score >= 80) return 'EXTREME';
  if (score >= 62) return 'SEVERE';
  if (score >= 44) return 'ELEVATED';
  if (score >= 25) return 'GUARDED';
  return 'LOW';
}

// Deterministic RNG: the same settlement key always produces the same report.
export function seeded(key) {
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

export function travelMinutes(asset, planet) {
  const distance = Math.hypot(planet?.positionX || 0, planet?.positionY || 0);
  const speed = Math.max(18, Number(asset?.speed) || 40);
  return Math.max(2, Math.min(30, Math.round(3 + distance * 12 - speed / 28)));
}

export function missionRisk(asset, planet, campaign, missionType) {
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

export function projectedReward(asset, planet, campaign, missionType, config = {}) {
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

export function maintenanceCost(asset, config = {}) {
  const rate = Math.max(0.05, Math.min(0.5, Number(config.maintenanceRate) || 0.14));
  return Math.max(1, Math.round((Number(asset?.income) || 3) * 18 * rate));
}

export function resolveCycle({ asset, planet, campaign, missionType, config, randKey, tick, supplies }) {
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

export function levelFor(xp) {
  return Math.max(1, Math.min(20, 1 + Math.floor((Number(xp) || 0) / 60)));
}
