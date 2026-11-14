import { useCallback, useEffect, useState } from 'react';
import { levelFor, resolveCycle, travelMinutes, missionRisk, projectedReward, campaignForPlanet } from '../../base44/shared/galacticMath.js';

// Bridges the Galactic Operations UI to the authenticated Base44 engine.
// With no Base44 session (local preview) it runs the SAME pure math locally and
// persists to this browser only, clearly labelled as a preview simulation.
const DEMO_KEY = 'ledger.galactic.preview.v1';
const BASE_CONFIG = {
  rewardMultiplier: 1,
  payoutCap: 4000,
  maintenanceRate: 0.14,
  cycleMinutes: 15,
  paused: false,
  season: 'SEASON 01 // BLACK VEIL',
  modifiers: [],
};

const readDemo = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
  } catch {
    return null;
  }
};
const writeDemo = value => {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(value));
  } catch { /* private mode */ }
};

function seedDemo(bundle, assets) {
  if (!bundle?.planets?.length || !assets?.length) return null;
  const contested = bundle.planets
    .filter(p => p.ownerKey !== 'HUMANS')
    .sort((a, b) => (b.players || 0) - (a.players || 0))[0];
  const target = contested || bundle.planets[0];
  const ship = assets[0];
  const nowMs = Date.now();
  const deployments = [
    {
      id: 'preview-deployment-1',
      assetId: ship.id,
      assetName: ship.name,
      category: ship.category,
      planetId: target.planetId,
      planetName: target.name,
      sector: target.sector,
      faction: target.owner,
      taskForceId: '',
      missionType: 'STRIKE',
      status: 'ACTIVE',
      departedAt: new Date(nowMs - 55 * 60_000).toISOString(),
      arrivesAt: new Date(nowMs - 45 * 60_000).toISOString(),
      deployedAt: new Date(nowMs - 45 * 60_000).toISOString(),
      settledThrough: 0,
      cycleMinutes: 15,
      risk: 58,
      supplies: 100,
      damage: 12,
      xp: 0,
      level: 1,
      earned: 0,
      sorties: 0,
      rewardProjected: 0,
      createdAt: new Date(nowMs - 55 * 60_000).toISOString(),
    },
  ];
  return {
    config: BASE_CONFIG,
    deployments,
    reports: [],
    taskForces: [],
    transmissions: [
      {
        id: 'preview-transmission-1',
        kind: 'PAYMENT',
        severity: 'success',
        callsign: 'BROKER',
        body: 'Contract fulfilled. Payment authorized. Reconciliation is queued behind the Desk.',
        createdAt: new Date(nowMs - 12 * 60_000).toISOString(),
      },
      {
        id: 'preview-transmission-2',
        kind: 'INTERCEPT',
        severity: 'alert',
        callsign: 'BLACKSITE SIGINT',
        body: 'Unknown vessel detected. Transponder rejected. Fleet is holding at standoff range.',
        createdAt: new Date(nowMs - 26 * 60_000).toISOString(),
      },
      {
        id: 'preview-transmission-3',
        kind: 'SALVAGE',
        severity: 'notice',
        callsign: 'LEDGER LOGISTICS',
        body: 'Salvage recovered from a derelict corridor. Broker commission deducted at source.',
        createdAt: new Date(nowMs - 41 * 60_000).toISOString(),
      },
    ],
    overrides: {},
    credits: 12000,
    seeded: true,
  };
}

export function useGalaxyOps({ connected, invoke, assets, bundle, notify }) {
  const [ops, setOps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const demo = !connected;

  const commitDemo = useCallback(next => {
    setOps(next);
    writeDemo(next);
  }, []);

  const reload = useCallback(async () => {
    if (!connected) {
      let local = readDemo();
      if (!local) local = { config: BASE_CONFIG, deployments: [], reports: [], taskForces: [], transmissions: [], overrides: {}, credits: 12000, seeded: false };
      if (!local.seeded && bundle?.planets?.length) {
        const seeded = seedDemo(bundle, assets);
        if (seeded) local = seeded;
      }
      setOps(local);
      setLoading(false);
      return local;
    }
    try {
      const raw = await invoke('galaxyOps', { type: 'state' });
      const data = raw?.data ?? raw;
      if (data?.error) throw new Error(data.error);
      setOps(data);
      setError('');
      return data;
    } catch (e) {
      setError(String(e?.message || e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [connected, invoke, bundle, assets]);

  useEffect(() => {
    reload();
  }, [reload]);

  const safeNotify = message => {
    if (typeof notify === 'function') notify(message);
  };

  const settleDemo = local => {
    const nowMs = Date.now();
    const reports = [];
    let credits = Number(local.credits) || 0;
    const config = { ...BASE_CONFIG, ...(local.config || {}) };
    const deployments = (local.deployments || []).map(dep => {
      if (dep.status !== 'ACTIVE' || !dep.deployedAt) return dep;
      const cycleMs = Math.max(5, Number(dep.cycleMinutes) || 15) * 60_000;
      const elapsed = Math.floor((nowMs - Date.parse(dep.deployedAt)) / cycleMs);
      const from = Number(dep.settledThrough) || 0;
      const cycles = Math.min(4, elapsed - from);
      if (cycles <= 0) return dep;
      const planet = bundle?.planets?.find(p => p.planetId === String(dep.planetId));
      if (!planet) return dep;
      const campaign = campaignForPlanet(bundle, dep.planetId);
      const asset = assets.find(a => a.id === dep.assetId) || { ...dep, income: 5, firepower: 50, shields: 20, damage: dep.damage };
      let supplies = Number(dep.supplies) || 100;
      let damage = Number(dep.damage) || 0;
      let gross = 0;
      let maintenance = 0;
      let salvage = 0;
      let casualties = 0;
      let xp = 0;
      let last = null;
      const key = `${dep.id}:${from}:${from + cycles}`;
      for (let tick = from; tick < from + cycles; tick++) {
        const result = resolveCycle({
          asset,
          planet,
          campaign,
          missionType: dep.missionType,
          config,
          randKey: key,
          tick,
          supplies,
        });
        gross += result.gross;
        maintenance += result.maintenance;
        salvage += result.salvage;
        casualties += result.casualties;
        xp += result.xp;
        damage = Math.min(100, damage + result.damageGain);
        supplies = Math.max(0, supplies - result.supplyUse);
        last = result;
      }
      const net = Math.max(0, Math.min(config.payoutCap, gross - maintenance));
      credits += net;
      const report = {
        id: `preview-report-${dep.id}-${from}-${from + cycles}`,
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
        toTick: from + cycles,
        cycles,
        outcome: last?.outcome || 'STALEMATE',
        narrative: last?.narrative || 'Operation concluded.',
        reward: gross,
        maintenance,
        net,
        salvage,
        damage: Math.round(damage),
        xp,
        casualties,
        suppliesUsed: Math.max(0, (Number(dep.supplies) || 100) - supplies),
        reconciliationStatus: 'PENDING_RECONCILIATION',
        modifiers: [`MISSION:${dep.missionType}`, `FACTION:${planet.ownerKey}`],
        acknowledged: false,
        createdAt: new Date().toISOString(),
        preview: true,
      };
      reports.push(report);
      return {
        ...dep,
        settledThrough: from + cycles,
        supplies: Math.round(supplies),
        damage: Math.round(damage),
        xp: (Number(dep.xp) || 0) + xp,
        level: levelFor((Number(dep.xp) || 0) + xp),
        earned: (Number(dep.earned) || 0) + net,
        sorties: (Number(dep.sorties) || 0) + cycles,
        status: damage >= 95 ? 'DAMAGED' : 'ACTIVE',
      };
    });
    const transmissions = [...(local.transmissions || [])];
    reports.forEach(report => {
      transmissions.unshift({
        id: `preview-tx-${report.id}`,
        kind: report.damage >= 70 ? 'EMERGENCY' : 'PAYMENT',
        severity: report.damage >= 70 ? 'alert' : 'success',
        callsign: report.assetName,
        body:
          report.damage >= 70
            ? `${report.assetName} reports critical damage over ${report.planetName}. Medical extraction requested.`
            : `Contract fulfilled. ${report.net} web Blacksite Credits authorized for ${report.assetName}.`,
        createdAt: new Date().toISOString(),
      });
    });
    const next = { ...local, deployments, reports: [...reports, ...(local.reports || [])].slice(0, 30), transmissions: transmissions.slice(0, 30), credits };
    commitDemo(next);
    return { reports, next };
  };

  const act = useCallback(
    async (type, payload = {}) => {
      setBusy(true);
      try {
        if (!demo) {
          const raw = await invoke('galaxyOps', { type, ...payload });
          const data = raw?.data ?? raw;
          if (data?.error) throw new Error(data.error);
          if (data?.deployments || data?.reports || data?.config) setOps(prev => ({ ...prev, ...data }));
          safeNotify(data?.message || 'GALACTIC RECORD UPDATED');
          await reload();
          return data;
        }

        const local = readDemo() || ops;
        if (!local) return null;
        if (type === 'settle') {
          const { reports, next } = settleDemo(local);
          safeNotify(
            reports.length
              ? `${reports.reduce((s, r) => s + r.net, 0)} preview credits cleared from ${reports.length} report${reports.length === 1 ? '' : 's'}.`
              : 'No battle cycles are due yet.',
          );
          return { reports, next, demo: true };
        }
        if (type === 'deploy') {
          const planet = bundle?.planets?.find(p => p.planetId === String(payload.planetId));
          if (!planet) throw new Error('Select a planet with live telemetry');
          const ids = payload.assetIds || [];
          if (!ids.length) throw new Error('Select at least one asset');
          const campaign = campaignForPlanet(bundle, planet.planetId);
          const created = [];
          for (const id of ids) {
            const asset = assets.find(a => a.id === id);
            if (!asset) continue;
            const minutes = travelMinutes(asset, planet);
            const risk = missionRisk(asset, planet, campaign, payload.missionType || 'STRIKE');
            created.push({
              id: `preview-dep-${Date.now()}-${id}`,
              assetId: asset.id,
              assetName: asset.name,
              category: asset.category,
              planetId: planet.planetId,
              planetName: planet.name,
              sector: planet.sector,
              faction: planet.owner,
              taskForceId: payload.taskForceId || '',
              missionType: payload.missionType || 'STRIKE',
              status: 'IN_TRANSIT',
              departedAt: new Date().toISOString(),
              arrivesAt: new Date(Date.now() + minutes * 60_000).toISOString(),
              deployedAt: '',
              settledThrough: 0,
              cycleMinutes: 15,
              risk,
              supplies: 100,
              damage: Number(asset.damage) || 0,
              xp: 0,
              level: levelFor(asset.xp),
              earned: 0,
              sorties: 0,
              rewardProjected: projectedReward(asset, planet, campaign, payload.missionType || 'STRIKE', BASE_CONFIG),
              createdAt: new Date().toISOString(),
            });
          }
          const transmissions = [
            ...created.map(dep => ({
              id: `preview-tx-${dep.id}`,
              kind: 'DEPARTURE',
              severity: 'info',
              callsign: dep.assetName,
              body: `${dep.assetName} departed for ${dep.planetName}. Transit window locked.`,
              createdAt: new Date().toISOString(),
            })),
            ...(local.transmissions || []),
          ];
          commitDemo({ ...local, deployments: [...created, ...(local.deployments || [])], transmissions });
          safeNotify(`${created.length} asset${created.length === 1 ? '' : 's'} committed to ${planet.name}. Preview simulation only.`);
          return { deployments: created };
        }
        if (type === 'recall') {
          const deployments = (local.deployments || []).map(d =>
            d.id === payload.deploymentId ? { ...d, status: 'RECALLED', recalledAt: new Date().toISOString() } : d,
          );
          commitDemo({ ...local, deployments });
          safeNotify('Asset recalled to hangar. Preview simulation only.');
          return { deployments };
        }
        if (['rename', 'paint', 'repair', 'restock', 'role', 'crew', 'install'].includes(type)) {
          const overrides = { ...(local.overrides || {}) };
          const current = { ...(assets.find(a => a.id === payload.assetId) || {}), ...(overrides[payload.assetId] || {}) };
          if (type === 'rename') {
            if (String(payload.name || '').trim().length < 2) throw new Error('Designation too short');
            overrides[payload.assetId] = { ...current, name: String(payload.name).trim().slice(0, 36) };
          }
          if (type === 'paint') overrides[payload.assetId] = { ...current, color: payload.color, trimColor: payload.trimColor };
          if (type === 'repair') overrides[payload.assetId] = { ...current, damage: 0, status: 'HANGAR' };
          if (type === 'restock') overrides[payload.assetId] = { ...current, supplies: 100 };
          if (type === 'role') overrides[payload.assetId] = { ...current, role: payload.role };
          if (type === 'crew') overrides[payload.assetId] = { ...current, crew: payload.crew };
          if (type === 'install') {
            const components = { ...(current.components || {}), ...(payload.slot ? { [payload.slot]: payload.itemId } : {}) };
            overrides[payload.assetId] = { ...current, components };
          }
          commitDemo({ ...local, overrides });
          safeNotify('Refit saved locally. PRESS DEPLOY for a live preview operation.');
          return { overrides };
        }
        if (type === 'task_force_save') {
          const name = String(payload.name || '').toUpperCase().slice(0, 28);
          if (name.length < 2) throw new Error('Task force name too short');
          const forces = [...(local.taskForces || [])];
          const existing = payload.id ? forces.findIndex(f => f.id === payload.id) : -1;
          const force = {
            id: payload.id || `preview-force-${Date.now()}`,
            name,
            doctrine: payload.doctrine || 'BALANCED',
            assetIds: payload.assetIds || [],
            active: true,
            updatedAt: new Date().toISOString(),
          };
          if (existing >= 0) forces[existing] = force;
          else forces.unshift(force);
          commitDemo({ ...local, taskForces: forces });
          safeNotify(`${name} mustered. Preview simulation only.`);
          return { force };
        }
        if (type === 'task_force_delete') {
          commitDemo({ ...local, taskForces: (local.taskForces || []).map(f => (f.id === payload.id ? { ...f, active: false } : f)) });
          safeNotify('Task force dissolved.');
          return null;
        }
        if (type === 'ack_report') {
          commitDemo({
            ...local,
            reports: (local.reports || []).map(r => (r.id === payload.reportId ? { ...r, acknowledged: true } : r)),
          });
          return null;
        }
        return null;
      } catch (e) {
        safeNotify(`REQUEST DENIED: ${e?.message || e}`);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [demo, invoke, reload, ops, bundle, assets, commitDemo, notify],
  );

  const liveDeployments = (ops?.deployments || []).filter(d => ['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(d.status));
  const deployedIds = new Set(liveDeployments.map(d => d.assetId));
  const mergedAssets = (assets || []).map(a => {
    const override = ops?.overrides?.[a.id] || {};
    const dep = liveDeployments.find(d => d.assetId === a.id);
    return {
      ...a,
      ...override,
      supplies: Number(override.supplies ?? dep?.supplies ?? a.supplies ?? 100),
      damage: Number(override.damage ?? dep?.damage ?? a.damage ?? 0),
      level: levelFor(a.xp),
      status: dep ? (dep.status === 'DAMAGED' ? 'DAMAGED' : 'DEPLOYED') : (override.status || a.status || 'HANGAR'),
      deployedTo: dep?.planetName || '',
      deploymentId: dep?.id || '',
    };
  });

  return {
    ops,
    loading,
    busy,
    error,
    demo,
    act,
    reload,
    deployments: ops?.deployments || [],
    reports: ops?.reports || [],
    taskForces: (ops?.taskForces || []).filter(f => f.active !== false),
    transmissions: ops?.transmissions || [],
    config: ops?.config || BASE_CONFIG,
    assets: mergedAssets,
    credits: demo ? Number(ops?.credits) || 0 : Number(ops?.profile?.webCredits) || 0,
    deployedIds,
  };
}
