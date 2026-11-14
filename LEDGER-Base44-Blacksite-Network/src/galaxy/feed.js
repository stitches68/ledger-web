// Client-side galactic feed loader.
// Deployed builds call the Base44 `galaxy` function (shared server cache).
// The local preview has no Base44 session, so it reads the same community API
// directly with the required identifying headers. Requests are parallel and
// time-boxed, and the last bundle is cached so the chart can degrade honestly.
import { campaignForPlanet, threatScore } from '../../base44/shared/galacticMath.js';

const DIRECT_TTL = 90_000;
const STALE_TTL = 30 * 60_000;
const KEY = 'ledger.hd2.bundle.v3';
const API = 'https://api.helldivers2.dev';
const HEADERS = {
  'X-Super-Client': 'LEDGER-Blacksite-Network',
  'X-Super-Contact': 'https://ledger-blacksite.network',
  Accept: 'application/json',
};

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ownerKey = owner => {
  const value = String(owner || '').toLowerCase();
  if (value.startsWith('human')) return 'HUMANS';
  if (value.startsWith('terminid')) return 'TERMINIDS';
  if (value.startsWith('automaton')) return 'AUTOMATON';
  if (value.startsWith('illuminate')) return 'ILLUMINATE';
  return 'UNKNOWN';
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

function planet(p) {
  const max = n(p.maxHealth) || 1;
  const health = Math.min(max, n(p.health));
  const owner = p.currentOwner || 'Unknown';
  const humans = ownerKey(owner) === 'HUMANS';
  return {
    planetId: String(p.index),
    hash: n(p.hash),
    name: typeof p.name === 'string' ? p.name : 'UNKNOWN',
    sector: p.sector || 'Unknown',
    owner,
    ownerKey: ownerKey(owner),
    humans,
    liberation: Math.round((humans ? health / max : 1 - health / max) * 1000) / 10,
    maxHealth: max,
    health,
    players: n(p.statistics?.playerCount),
    positionX: n(p.position?.x),
    positionY: n(p.position?.y),
    waypoints: (p.waypoints || []).map(String).slice(0, 12),
    hazards: (p.hazards || []).slice(0, 4).map(h => ({ name: h.name, description: h.description })),
    biome: { name: p.biome?.name || '', description: p.biome?.description || '' },
    event: p.event ? { faction: p.event.faction, health: n(p.event.health), maxHealth: n(p.event.maxHealth) } : null,
    regions: (p.regions || []).slice(0, 4).map(r => ({ id: r.id, name: r.name, health: n(r.health), maxHealth: n(r.maxHealth), players: n(r.players), available: !!r.isAvailable })),
  };
}

async function get(path, attempt = 0) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(9000) });
  if (res.status === 429 && attempt < 1) {
    await sleep(Math.max(2, Number(res.headers.get('retry-after')) || 3) * 1000);
    return get(path, attempt + 1);
  }
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function fetchDirect() {
  const [planetsRes, campaignsRes, assignmentsRes, stationRes] = await Promise.allSettled([
    get('/api/v1/planets'),
    get('/api/v1/campaigns'),
    get('/api/v1/assignments'),
    get('/api/v2/space-stations'),
  ]);
  if (planetsRes.status !== 'fulfilled') throw new Error(planetsRes.reason?.message || 'Planetary feed unavailable');
  const planets = (Array.isArray(planetsRes.value) ? planetsRes.value : []).map(planet);
  if (!planets.length) throw new Error('Community feed returned no readable planet records');

  let campaigns = [];
  if (campaignsRes.status === 'fulfilled') {
    campaigns = (campaignsRes.value || []).map(c => ({
      id: String(c.id),
      planetId: String(c.planet?.index),
      faction: c.faction || c.planet?.currentOwner,
      type: c.type,
      count: n(c.count),
    }));
  }

  let majorOrder = null;
  if (assignmentsRes.status === 'fulfilled') {
    const a = (assignmentsRes.value || [])[0];
    if (a) {
      majorOrder = {
        id: String(a.id),
        title: a.title || 'MAJOR ORDER',
        briefing: a.briefing || '',
        expiresAt: a.expiration || '',
        reward: a.reward ? { type: a.reward.type, amount: n(a.reward.amount) } : null,
        tasks: (a.tasks || []).map(t => ({
          planetIds: (t.values || []).filter((_, i) => (t.valueTypes || [])[i] === 12).map(String),
        })),
      };
    }
  }

  let station = null;
  if (stationRes.status === 'fulfilled') {
    const s = (stationRes.value || [])[0];
    if (s) {
      station = {
        planetId: String(s.planet?.index),
        planetName: s.planet?.name || '',
        sector: s.planet?.sector || '',
        electionEnd: s.electionEnd || '',
        flags: n(s.flags),
        tacticalActions: (s.tacticalActions || []).slice(0, 6).map(t => ({ name: t.name, description: t.description })),
      };
    }
  }

  return {
    schema: 3,
    source: 'COMMUNITY_HD2_API',
    capturedAt: new Date().toISOString(),
    planets,
    campaigns,
    majorOrder,
    station,
    globalPlayers: planets.reduce((sum, p) => sum + p.players, 0),
    factionCounts: planets.reduce((acc, p) => {
      acc[p.ownerKey] = (acc[p.ownerKey] || 0) + 1;
      return acc;
    }, {}),
    warnings: [
      campaignsRes.status === 'rejected' ? 'campaign layer unavailable' : '',
      assignmentsRes.status === 'rejected' ? 'major order unavailable' : '',
      stationRes.status === 'rejected' ? 'space station telemetry unavailable' : '',
    ].filter(Boolean),
    transport: 'DIRECT_COMMUNITY_READ',
    attribution: 'Community Helldivers 2 API. Not affiliated with Arrowhead Game Studios.',
  };
}

function readCache() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const parsed = JSON.parse(store.getItem(KEY) || 'null');
      if (parsed?.payload?.planets?.length) return parsed;
    } catch { /* storage unavailable */ }
  }
  return null;
}

export async function loadGalaxyFeed(invoke, { force = false } = {}) {
  if (force) {
    try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }
  if (invoke) {
    try {
      const raw = await invoke('galaxy', {});
      const data = raw?.data ?? raw;
      if (data?.error) throw new Error(data.error);
      if (data?.planets?.length) return { ...data, transport: 'BASE44_SERVER_CACHE' };
    } catch { /* fall through to the direct read */ }
  }
  const cached = readCache();
  if (cached && Date.now() - cached.at < DIRECT_TTL) {
    return { ...cached.payload, freshness: 'CACHED', ageSeconds: Math.round((Date.now() - cached.at) / 1000) };
  }
  try {
    const bundle = await fetchDirect();
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), payload: bundle }));
    } catch { /* storage unavailable */ }
    return { ...bundle, freshness: 'LIVE', ageSeconds: 0 };
  } catch (error) {
    if (cached && Date.now() - cached.at < STALE_TTL) {
      return {
        ...cached.payload,
        freshness: 'UNAVAILABLE',
        stale: true,
        ageSeconds: Math.round((Date.now() - cached.at) / 1000),
        warning: `Community war feed unavailable. Showing last known telemetry from ${new Date(cached.at).toISOString().slice(11, 19)} UTC. ${error.message}`,
      };
    }
    return {
      schema: 3,
      source: 'COMMUNITY_HD2_API',
      transport: 'DIRECT_COMMUNITY_READ',
      freshness: 'UNAVAILABLE',
      capturedAt: null,
      planets: [],
      campaigns: [],
      majorOrder: null,
      station: null,
      globalPlayers: 0,
      warning: String(error?.message || error),
      attribution: 'Community Helldivers 2 API',
    };
  }
}

export function planetContext(bundle, planetId, deployments = []) {
  if (!bundle?.planets?.length) return null;
  const target = bundle.planets.find(p => p.planetId === String(planetId));
  if (!target) return null;
  const campaign = campaignForPlanet(bundle, target.planetId);
  return {
    ...target,
    campaign,
    contested: !!campaign,
    threat: threatScore(target, campaign),
    friendly: deployments.filter(d => d.planetId === target.planetId && ['ACTIVE', 'IN_TRANSIT'].includes(d.status)),
  };
}
