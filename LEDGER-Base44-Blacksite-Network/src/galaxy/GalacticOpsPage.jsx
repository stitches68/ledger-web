import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, ShieldAlert, Coins, LockKeyhole, RadioTower, Users, Orbit, Activity, AlertTriangle, ChevronRight, Wifi, WifiOff, Database,
} from 'lucide-react';
import GalaxyMap from './GalaxyMap.jsx';
import TargetPanel from './TargetPanel.jsx';
import DeployPanel from './DeployPanel.jsx';
import DispatchPanel from './DispatchPanel.jsx';
import FleetPanel from './FleetPanel.jsx';
import ReportOverlay from './ReportOverlay.jsx';
import AdminOverlay from './AdminOverlay.jsx';
import { loadGalaxyFeed, planetContext } from './feed.js';
import { useGalaxyOps } from './useGalaxyOps.js';
import { fmt } from './ui.jsx';
import './galaxy.css';

const RAIL_TABS = [
  ['dispatch', 'DISPATCH', RadioTower],
  ['target', 'TARGET', Orbit],
  ['fleet', 'FLEET', Activity],
];

const stamp = iso => {
  if (!iso) return 'NO SYNC';
  const d = new Date(iso);
  return `${d.toISOString().slice(11, 19)} UTC`;
};

export default function GalacticOpsPage({ data, discord, openPage, notify, invoke, connected, onFeed, onSelectPlanet }) {
  const [feed, setFeed] = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlanetId, setSelectedPlanetId] = useState('');
  const [railTab, setRailTab] = useState('dispatch');
  const [deployOpen, setDeployOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const railRef = useRef(null);

  const ops = useGalaxyOps({ connected, invoke, assets: data?.owned || [], bundle: feed, notify });

  const sync = useCallback(async (force = false) => {
    setSyncing(true);
    try {
      const bundle = await loadGalaxyFeed(invoke, { force });
      setFeed(bundle);
      if (typeof onFeed === 'function' && bundle?.planets?.length) onFeed(bundle);
      if (bundle?.planets?.length) {
        const orderPlanet = bundle.majorOrder?.tasks?.flatMap(t => t.planetIds || [])[0];
        const busiest = [...bundle.planets]
          .filter(p => p.ownerKey !== 'HUMANS')
          .sort((a, b) => (b.players || 0) - (a.players || 0))[0];
        setSelectedPlanetId(prev => prev || orderPlanet || busiest?.planetId || bundle.planets[0].planetId);
      }
    } catch (e) {
      notify?.(`WAR FEED ERROR: ${e?.message || e}`);
    } finally {
      setFeedLoading(false);
      setSyncing(false);
    }
  }, [invoke, notify, onFeed]);

  useEffect(() => {
    sync();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => sync(), 120_000);
    return () => clearInterval(timer);
  }, [sync]);

  const planet = useMemo(
    () => planetContext(feed, selectedPlanetId, ops.deployments),
    [feed, selectedPlanetId, ops.deployments],
  );

  const choosePlanet = useCallback(planetOrId => {
    const id = typeof planetOrId === 'string' ? planetOrId : planetOrId?.planetId;
    if (!id) return;
    setSelectedPlanetId(String(id));
    setRailTab('target');
    if (window.innerWidth < 1100) railRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Keep the shared hangar's deploy target aligned with the chart selection.
  useEffect(() => {
    if (selectedPlanetId && typeof onSelectPlanet === 'function') onSelectPlanet(selectedPlanetId);
  }, [selectedPlanetId, onSelectPlanet]);

  const openReport = useCallback(reportData => setReport(reportData), []);

  const settle = async () => {
    const result = await ops.act('settle');
    const settled = Number(result?.settled ?? result?.reports?.length ?? 0);
    if (settled > 0 && result?.reports?.length) openReport(result.reports[0]);
  };

  const confirmDeploy = async payload => {
    const result = await ops.act('deploy', {
      ...payload,
      planetId: planet?.planetId,
      planetName: planet?.name,
    });
    if (result?.deployments?.length) {
      setDeployOpen(false);
      setRailTab('dispatch');
    }
  };

  const freshness = feed?.freshness || (feedLoading ? 'SYNCING' : 'UNAVAILABLE');
  const freshnessCopy = freshness === 'LIVE' ? 'LIVE COMMUNITY FEED' : freshness === 'CACHED' ? 'CACHED FEED' : freshness === 'SYNCING' ? 'SYNCING FEED' : 'FEED UNAVAILABLE';
  const sectors = feed?.planets ? new Set(feed.planets.map(p => p.sector)).size : 0;
  const liveOps = ops.deployments.filter(d => ['ACTIVE', 'IN_TRANSIT'].includes(d.status)).length;
  const pendingRewards = ops.reports.reduce((sum, r) => sum + (r.reconciliationStatus === 'HELD_FOR_REVIEW' ? 0 : Number(r.net) || 0), 0);
  const due = ops.deployments.filter(d => d.status === 'ACTIVE').length;
  const orderExpiry = feed?.majorOrder?.expiresAt ? Math.max(0, Date.parse(feed.majorOrder.expiresAt) - Date.now()) : null;
  const orderPlanets = (feed?.majorOrder?.tasks || []).flatMap(t => t.planetIds || []);
  const isAdmin = !!discord?.identity?.isAdmin;

  return (
    <div className="galaxy-ops">
      <header className="gx-head">
        <div className="gx-head-copy">
          <div className="gx-eyebrow">BLACKSITE COMMAND NETWORK // GALACTIC THEATRE</div>
          <h1>GALACTIC <em>OPERATIONS.</em></h1>
          <p>Live community war telemetry overlaid with LEDGER's private fleet simulation. The real war sets the conditions. Your contracts, battles and salvage are classified fiction.</p>
        </div>
        <div className="gx-head-actions">
          <div className={`gx-feedpill ${freshness.toLowerCase()}`}>
            {freshness === 'LIVE' ? <Wifi size={14} /> : freshness === 'CACHED' ? <Database size={14} /> : <WifiOff size={14} />}
            <div>
              <b>{freshnessCopy}</b>
              <small>{feed?.capturedAt ? `SYNC ${stamp(feed.capturedAt)}` : 'NO PLANETARY DATA'}</small>
            </div>
          </div>
          <button className="gx-iconbtn" onClick={() => sync(true)} disabled={syncing} aria-label="Refresh war feed">
            <RefreshCw size={16} className={syncing ? 'spin' : ''} />
          </button>
          <div className="gx-wallet"><Coins size={14} /><div><b>{fmt(ops.credits || data?.profile?.webCredits)}</b><small>{ops.demo ? 'PREVIEW BC' : 'WEB BC'}</small></div></div>
          {isAdmin && <button className="gx-iconbtn admin" onClick={() => setAdminOpen(true)} aria-label="Open galactic command"><LockKeyhole size={16} /></button>}
        </div>
      </header>

      <div className="gx-strip">
        <div><span><Users size={12} /> HELLDIVERS ONLINE</span><b>{feed?.globalPlayers ? fmt(feed.globalPlayers) : '—'}</b></div>
        <div><span><Orbit size={12} /> SECTORS TRACKED</span><b>{sectors || '—'}</b></div>
        <div><span><Activity size={12} /> LEDGER OPERATIONS</span><b>{liveOps}</b></div>
        <div><span><Coins size={12} /> AWAITING RECONCILIATION</span><b>{fmt(pendingRewards)} BC</b></div>
        <div><span><RadioTower size={12} /> SEASON</span><b className="season">{ops.config?.season || 'SEASON 01'}</b></div>
      </div>

      {feed?.majorOrder && (
        <div className="gx-order">
          <div className="order-kicker"><ShieldAlert size={14} /> MAJOR ORDER // COMMUNITY WAR</div>
          <div className="order-body">
            <b>{feed.majorOrder.title}</b>
            <p>{feed.majorOrder.briefing || 'Community objective in progress.'}</p>
          </div>
          <div className="order-planets">
            {[...new Set(orderPlanets)].slice(0, 4).map(id => {
              const p = feed.planets.find(x => x.planetId === String(id));
              if (!p) return null;
              return <button key={id} onClick={() => choosePlanet(p)}>{p.name}<ChevronRight size={11} /></button>;
            })}
          </div>
          <div className="order-timer">
            <span>EXPIRES</span>
            <b>{orderExpiry == null ? '—' : `${Math.floor(orderExpiry / 3_600_000)}H ${Math.floor((orderExpiry % 3_600_000) / 60_000)}M`}</b>
          </div>
        </div>
      )}

      {feed?.freshness === 'UNAVAILABLE' && (
        <div className="gx-alert">
          <AlertTriangle size={15} />
          <div>
            <b>COMMUNITY WAR FEED UNAVAILABLE</b>
            <span>{feed?.warning || 'The Helldivers 2 community API did not answer. No placeholder planetary data is shown.'}</span>
          </div>
          <button onClick={() => sync(true)}>RETRY UPLINK</button>
        </div>
      )}

      {ops.error && (
        <div className="gx-alert">
          <AlertTriangle size={15} />
          <div><b>OPERATIONS LEDGER DEGRADED</b><span>{ops.error}</span></div>
          <button onClick={ops.reload}>RETRY</button>
        </div>
      )}

      <div className="gx-layout">
        <div className="gx-map-col">
          <GalaxyMap
            bundle={feed}
            deployments={ops.deployments}
            selectedPlanetId={selectedPlanetId}
            onSelect={choosePlanet}
            paused={paused}
            onTogglePause={() => setPaused(p => !p)}
            planetActivity={ops.ops?.planetActivity}
          />
          {ops.demo && (
            <div className="gx-demo-banner">
              <AlertTriangle size={13} />
              <b>PREVIEW SIMULATION</b>
              <span>Battles and refits are stored in this browser because no Base44 session is active. The live engine persists every action server-side.</span>
            </div>
          )}
        </div>

        <aside className="gx-rail" ref={railRef}>
          <div className="gx-rail-tabs" role="tablist" aria-label="Galactic operations panels">
            {RAIL_TABS.map(([key, label, Icon]) => (
              <button key={key} role="tab" aria-selected={railTab === key} className={railTab === key ? 'on' : ''} onClick={() => setRailTab(key)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          {ops.loading ? (
            <div className="gx-loading"><RefreshCw size={16} className="spin" /><div><b>SYNCING OPERATIONS LEDGER</b><small>Deployments, task forces and after-action reports.</small></div></div>
          ) : railTab === 'dispatch' ? (
            <DispatchPanel
              ops={ops.ops}
              config={ops.config}
              onOpenReport={openReport}
              onSettle={settle}
              onSelectPlanet={choosePlanet}
              onRecall={id => ops.act('recall', { deploymentId: id })}
              busy={ops.busy}
              demo={ops.demo}
            />
          ) : railTab === 'target' ? (
            <TargetPanel
              planet={planet}
              ops={ops.ops}
              config={ops.config}
              onDeploy={() => planet && setDeployOpen(true)}
              onRecall={id => ops.act('recall', { deploymentId: id })}
              onOpenFleet={() => setRailTab('fleet')}
              demo={ops.demo}
            />
          ) : (
            <FleetPanel
              assets={ops.assets}
              deployments={ops.deployments}
              reports={ops.reports}
              taskForces={ops.taskForces}
              equipment={data?.equipment || []}
              onAct={ops.act}
              onRecall={id => ops.act('recall', { deploymentId: id })}
              onSelectPlanet={choosePlanet}
              onOpenReport={openReport}
              onOpenHangar={() => openPage('hangar')}
              busy={ops.busy}
              demo={ops.demo}
            />
          )}
        </aside>
      </div>

      <footer className="gx-foot">
        <span>LEDGER // INDEPENDENT BLACKSITE NETWORK</span>
        <span>COMMUNITY FEED: api.helldivers2.dev · NOT AFFILIATED WITH ARROWHEAD GAME STUDIOS</span>
        <span>SIMULATION REWARDS ARE WEB-ONLY AND AWAIT RECONCILIATION</span>
      </footer>

      {deployOpen && planet && (
        <DeployPanel
          planet={planet}
          assets={ops.assets}
          taskForces={ops.taskForces}
          config={ops.config}
          busy={ops.busy}
          demo={ops.demo}
          onClose={() => setDeployOpen(false)}
          onConfirm={confirmDeploy}
        />
      )}
      {report && <ReportOverlay report={report} onClose={() => setReport(null)} onAck={id => ops.act('ack_report', { reportId: id })} />}
      {adminOpen && (
        <AdminOverlay
          discord={discord}
          invoke={invoke}
          config={ops.config}
          bundle={feed}
          onClose={() => setAdminOpen(false)}
          notify={notify}
        />
      )}
    </div>
  );
}
