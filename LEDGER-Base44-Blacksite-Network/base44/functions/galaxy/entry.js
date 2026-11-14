import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// LEDGER // GALACTIC OPERATIONS — community Helldivers 2 war feed.
// Server-side cached so every LEDGER client shares one upstream request window.
// The API is community-run and rate limited (5 requests / 10s): fetch 4 endpoints at most,
// persist the bundle, and serve it for 90s before refreshing.
const CACHE_KEY = 'hd2-galaxy-bundle-v3';
const TTL_MS = 90_000;
const STALE_MS = 30 * 60_000;
const SOURCE = 'COMMUNITY_HD2_API';

const headers = () => ({
  'X-Super-Client': Deno.env.get('HD2_SUPER_CLIENT') || 'LEDGER-Blacksite-Network',
  'X-Super-Contact': Deno.env.get('HD2_SUPER_CONTACT') || 'https://ledger-blacksite.network',
  Accept: 'application/json',
});

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round1 = v => Math.round(n(v) * 10) / 10;
const text = (v, max = 240) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const nameOf = p => text(typeof p?.name === 'string' ? p.name : (p?.name?.en || `Planet ${p?.index ?? '?'}`), 100);
const ownerKey = owner => {
  const value = String(owner || 'Unknown').toLowerCase();
  if (value.startsWith('human')) return 'HUMANS';
  if (value.startsWith('terminid')) return 'TERMINIDS';
  if (value.startsWith('automaton')) return 'AUTOMATON';
  if (value.startsWith('illuminate')) return 'ILLUMINATE';
  return 'UNKNOWN';
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(path, attempt = 0) {
  const res = await fetch(`https://api.helldivers2.dev${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(12_000),
  });
  if (res.status === 429 && attempt < 2) {
    const wait = Math.min(10, Math.max(2, Number(res.headers.get('retry-after')) || 4));
    await sleep(wait * 1000);
    return api(path, attempt + 1);
  }
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

function normalizePlanet(p) {
  const max = n(p.maxHealth) || 1;
  const health = Math.min(max, n(p.health));
  const owner = text(p.currentOwner || 'Unknown', 40);
  const humans = ownerKey(owner) === 'HUMANS';
  const liberation = humans ? (health / max) * 100 : (1 - health / max) * 100;
  const hazards = (Array.isArray(p.hazards) ? p.hazards : []).slice(0, 4).map(h => ({
    name: text(h?.name, 60),
    description: text(h?.description, 200),
  }));
  return {
    planetId: String(p.index),
    hash: n(p.hash),
    name: nameOf(p),
    sector: text(p.sector || 'Unknown', 60),
    owner,
    ownerKey: ownerKey(owner),
    biome: {
      name: text(p.biome?.name, 60),
      description: text(p.biome?.description, 320),
    },
    hazards,
    maxHealth: max,
    health,
    liberation: round1(liberation),
    humans,
    players: n(p.statistics?.playerCount),
    missionsWon: n(p.statistics?.missionsWon),
    waypoints: (Array.isArray(p.waypoints) ? p.waypoints : []).map(String).slice(0, 12),
    event: p.event
      ? {
          faction: text(p.event.faction, 40),
          health: n(p.event.health),
          maxHealth: n(p.event.maxHealth),
          type: p.event.type ?? null,
        }
      : null,
    regions: (Array.isArray(p.regions) ? p.regions : [])
      .slice(0, 4)
      .map(r => ({ id: r.id, name: text(r.name, 60), health: n(r.health), maxHealth: n(r.maxHealth), players: n(r.players), available: !!r.isAvailable })),
    positionX: n(p.position?.x),
    positionY: n(p.position?.y),
  };
}

function normalizeCampaign(c) {
  return {
    id: String(c.id ?? ''),
    planetId: String(c.planet?.index ?? ''),
    faction: text(c.faction || c.planet?.currentOwner, 40),
    type: c.type ?? null,
    count: n(c.count),
  };
}

function normalizeAssignment(a) {
  if (!a) return null;
  const tasks = (Array.isArray(a.tasks) ? a.tasks : []).map(t => {
    const values = Array.isArray(t.values) ? t.values : [];
    const types = Array.isArray(t.valueTypes) ? t.valueTypes : [];
    return {
      type: t.type ?? null,
      values,
      valueTypes: types,
      // valueType 12 is a planet index in the community feed.
      planetIds: values.filter((_, i) => types[i] === 12).map(v => String(v)),
    };
  });
  return {
    id: String(a.id ?? ''),
    title: text(a.title || 'MAJOR ORDER', 100),
    briefing: text(a.briefing || a.description, 700),
    expiresAt: a.expiration || '',
    reward: a.reward ? { type: a.reward.type ?? null, amount: n(a.reward.amount) } : null,
    tasks,
  };
}

function normalizeStation(s) {
  if (!s) return null;
  return {
    planetId: String(s.planet?.index ?? ''),
    planetName: nameOf(s.planet),
    sector: text(s.planet?.sector, 60),
    electionEnd: s.electionEnd || '',
    flags: n(s.flags),
    tacticalActions: (Array.isArray(s.tacticalActions) ? s.tacticalActions : [])
      .slice(0, 6)
      .map(t => ({ name: text(t.name, 80), description: text(t.description, 320) })),
  };
}

async function fetchBundle() {
  const capturedAt = new Date().toISOString();
  const warnings = [];
  const rawPlanets = await api('/api/v1/planets');
  const planets = (Array.isArray(rawPlanets) ? rawPlanets : [])
    .filter(p => p && p.index !== undefined)
    .slice(0, 400)
    .map(normalizePlanet);

  await sleep(300);
  let campaigns = [];
  try {
    const raw = await api('/api/v1/campaigns');
    campaigns = (Array.isArray(raw) ? raw : []).map(normalizeCampaign).filter(c => c.planetId);
  } catch (e) {
    warnings.push(`campaigns: ${e.message}`);
  }

  await sleep(300);
  let majorOrder = null;
  try {
    const raw = await api('/api/v1/assignments');
    majorOrder = normalizeAssignment(Array.isArray(raw) ? raw[0] : raw);
  } catch (e) {
    warnings.push(`major order: ${e.message}`);
  }

  await sleep(300);
  let station = null;
  try {
    const raw = await api('/api/v2/space-stations');
    station = normalizeStation(Array.isArray(raw) ? raw[0] : raw);
  } catch (e) {
    warnings.push(`space station: ${e.message}`);
  }

  if (!planets.length) throw new Error('Community feed returned no readable planet records');
  const globalPlayers = planets.reduce((sum, p) => sum + p.players, 0);
  return {
    schema: 3,
    source: SOURCE,
    capturedAt,
    planets,
    campaigns,
    majorOrder,
    station,
    globalPlayers,
    factionCounts: planets.reduce((acc, p) => {
      acc[p.ownerKey] = (acc[p.ownerKey] || 0) + 1;
      return acc;
    }, {}),
    warnings,
    attribution: 'Community Helldivers 2 API (api.helldivers2.dev). Not affiliated with Arrowhead Game Studios.',
  };
}

Deno.serve(async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Sign in to access BLACKSITE galactic telemetry.' }, { status: 401 });
    const db = base44.asServiceRole.entities;

    const cache = (await db.LedgerMirrorCache.filter({ cacheKey: CACHE_KEY }))[0];
    const age = cache?.fetchedAt ? Date.now() - Date.parse(cache.fetchedAt) : Infinity;
    if (cache?.payload?.planets?.length && age >= 0 && age < TTL_MS) {
      return Response.json({ ...cache.payload, freshness: 'CACHED', ageSeconds: Math.round(age / 1000) });
    }

    try {
      const bundle = await fetchBundle();
      await db.LedgerMirrorCache.upsert(
        [{ cacheKey: CACHE_KEY, payload: bundle, fetchedAt: bundle.capturedAt, lastError: '' }],
        { key: 'cacheKey' },
      ).catch(() => {});
      return Response.json({ ...bundle, freshness: 'LIVE', ageSeconds: 0 });
    } catch (upstream) {
      const warning = String(upstream?.message || upstream);
      if (cache?.payload?.planets?.length) {
        const stale = !(age < STALE_MS);
        return Response.json({
          ...cache.payload,
          freshness: 'UNAVAILABLE',
          stale,
          ageSeconds: Number.isFinite(age) ? Math.round(age / 1000) : null,
          warning: stale
            ? `Community war feed unreachable. Last known telemetry is ${Math.round(age / 60000)} minutes old.`
            : `Community war feed unavailable; showing cached telemetry. ${warning}`,
        });
      }
      return Response.json({
        schema: 3,
        source: SOURCE,
        freshness: 'UNAVAILABLE',
        capturedAt: null,
        planets: [],
        campaigns: [],
        majorOrder: null,
        station: null,
        globalPlayers: 0,
        warning,
      });
    }
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});
