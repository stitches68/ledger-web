import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, AlertTriangle, Activity, Coins, Clock3, ChevronRight, RadioTower } from 'lucide-react';
import { AssetGlyph, EmptyState, ProgressBar, StatusPill, fmt } from './ui.jsx';

const timeAgo = iso => {
  if (!iso) return '—';
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return '—';
  const m = Math.max(0, Math.floor(diff / 60_000));
  if (m < 1) return 'JUST NOW';
  if (m < 60) return `${m}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H AGO`;
  return `${Math.floor(h / 24)}D AGO`;
};
const clock = ms => {
  const safe = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

const outcomeTone = outcome =>
  outcome === 'VICTORY' ? 'good' : outcome === 'SALVAGE_RECOVERY' ? 'good' : ['RETREAT', 'EVACUATION', 'DAMAGE', 'SUPPLY_SHORTAGE'].includes(outcome) ? 'danger' : 'warn';

export default function DispatchPanel({ ops, onOpenReport, onSettle, onSelectPlanet, onRecall, busy, demo, config }) {
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deployments = ops?.deployments || [];
  const reports = ops?.reports || [];
  const transmissions = ops?.transmissions || [];
  const live = deployments.filter(d => ['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(d.status));
  const emergencies = transmissions.filter(t => t.kind === 'EMERGENCY' || t.severity === 'alert').slice(0, 4);
  const lore = ops?.lore || [];

  const due = useMemo(
    () => live.filter(d => {
      if (d.status !== 'ACTIVE' || !d.deployedAt) return false;
      const cycleMs = Math.max(5, Number(d.cycleMinutes) || 15) * 60_000;
      return Math.floor((nowMs - Date.parse(d.deployedAt)) / cycleMs) - (Number(d.settledThrough) || 0) >= 1;
    }).length,
    [live, nowMs],
  );

  return (
    <div className="gx-panel-body dispatch-panel">
      <div className="dispatch-head">
        <div>
          <div className="gx-eyebrow">BLACKSITE DISPATCH // ACTIVE OPERATIONS</div>
          <h2>LIVE TRAFFIC</h2>
        </div>
        <StatusPill tone={live.length ? 'good' : 'muted'}>{live.length} LIVE</StatusPill>
      </div>

      <div className="dispatch-kpis">
        <div><span>ACTIVE OPS</span><b>{live.length}</b></div>
        <div><span>BATTLES DUE</span><b className={due ? 'amber' : ''}>{due}</b></div>
        <div><span>REPORTS</span><b>{reports.length}</b></div>
      </div>

      <section className="dispatch-section">
        <h3><Activity size={13} /> CURRENT DEPLOYMENTS</h3>
        {live.length ? (
          <div className="dispatch-list">
            {live.map(dep => {
              const cycleMs = Math.max(5, Number(dep.cycleMinutes) || 15) * 60_000;
              const transit = dep.status === 'IN_TRANSIT';
              const total = Math.max(1, Date.parse(dep.arrivesAt) - Date.parse(dep.departedAt));
              const transitLeft = Math.max(0, Date.parse(dep.arrivesAt) - nowMs);
              const cycleStart = Date.parse(dep.deployedAt) || nowMs;
              const cycleProgress = ((nowMs - cycleStart) % cycleMs) / cycleMs;
              return (
                <div key={dep.id} className={`dispatch-op ${transit ? 'transit' : ''} ${dep.status === 'DAMAGED' ? 'damaged' : ''}`}>
                  <div className="dispatch-op-head">
                    <span className="glyph"><AssetGlyph category={dep.category} size={16} /></span>
                    <button className="op-target" onClick={() => dep.planetId && onSelectPlanet(dep.planetId)}>
                      <b>{dep.assetName}</b>
                      <small><ChevronRight size={10} /> {dep.planetName} · {dep.missionType}</small>
                    </button>
                    <StatusPill tone={dep.status === 'DAMAGED' ? 'danger' : transit ? 'warn' : 'good'}>{dep.status.replace('_', ' ')}</StatusPill>
                  </div>
                  <div className="op-progress">
                    <ProgressBar
                      value={transit ? 100 - (transitLeft / total) * 100 : cycleProgress * 100}
                      tone={dep.status === 'DAMAGED' ? 'red' : transit ? 'amber' : 'green'}
                      label={transit ? 'Transit progress' : 'Next battle cycle'}
                    />
                    <div className="op-progress-meta">
                      <span>{transit ? `ARRIVAL IN ${clock(transitLeft)}` : `NEXT CYCLE ${clock(cycleMs - ((nowMs - cycleStart) % cycleMs))}`}</span>
                      <span>DMG {Math.round(dep.damage || 0)}% · SUP {Math.round(dep.supplies ?? 100)}%</span>
                    </div>
                  </div>
                  <div className="op-actions">
                    <span>EARNED <b>{fmt(dep.earned || 0)} BC</b></span>
                    <button onClick={() => onRecall(dep.id)} disabled={busy}>RECALL</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="NO ACTIVE OPERATIONS">Select a world on the chart and commit assets to open your first autonomous operation.</EmptyState>
        )}
      </section>

      {emergencies.length > 0 && (
        <section className="dispatch-section emergency">
          <h3><AlertTriangle size={13} /> ASSET EMERGENCIES</h3>
          {emergencies.map(t => (
            <div key={t.id} className="dispatch-transmission alert">
              <span>{timeAgo(t.createdAt)}</span>
              <b>{t.callsign}</b>
              <p>{t.body}</p>
            </div>
          ))}
        </section>
      )}

      <section className="dispatch-section">
        <h3><Coins size={13} /> AFTER-ACTION REPORTS</h3>
        {reports.length ? (
          <div className="report-list">
            {reports.slice(0, 6).map(report => (
              <button key={report.id} className="report-row" onClick={() => onOpenReport(report)}>
                <span className={`outcome-dot ${outcomeTone(report.outcome)}`} />
                <span className="report-main">
                  <b>{report.assetName}</b>
                  <small>{report.outcome.replaceAll('_', ' ')} · {report.planetName} · {report.cycles} cycle{report.cycles === 1 ? '' : 's'}</small>
                </span>
                <span className="report-value">+{fmt(report.net)} <em>BC</em></span>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        ) : <EmptyState title="NO AFTER-ACTION REPORTS">Battles resolve automatically once an operation completes its first cycle.</EmptyState>}
        <div className="settle-row">
          <span>{due ? `${due} operation${due === 1 ? '' : 's'} ready to settle` : 'Operations settle automatically on the server'}</span>
          <button className="gx-btn small" disabled={busy} onClick={onSettle}>{busy ? 'SETTLING…' : 'SETTLE OPERATIONS'}</button>
        </div>
      </section>

      <section className="dispatch-section">
        <h3><RadioTower size={13} /> BLACKSITE TRANSMISSIONS</h3>
        <div className="transmission-feed">
          {transmissions.slice(0, 8).map(t => (
            <div key={t.id} className={`dispatch-transmission ${t.severity || 'info'}`}>
              <div className="tx-head"><span>{timeAgo(t.createdAt)}</span><b>{t.callsign || t.kind}</b><StatusPill tone={t.severity === 'alert' ? 'danger' : t.severity === 'success' ? 'good' : 'muted'}>{t.kind}</StatusPill></div>
              <p>{t.body}</p>
            </div>
          ))}
          {!transmissions.length && lore.slice(0, 3).map(l => (
            <div key={l.code} className="dispatch-transmission info">
              <div className="tx-head"><span>ARCHIVE</span><b>{l.kind}</b><StatusPill tone="muted">{l.code}</StatusPill></div>
              <p>{l.body}</p>
            </div>
          ))}
        </div>
      </section>

      {demo && <div className="gx-preview-note"><AlertTriangle size={13} /> PREVIEW TRAFFIC — this feed is generated in this browser only. Production traffic is written by the server.</div>}
      {config?.paused && <div className="gx-preview-note danger"><AlertTriangle size={13} /> GALACTIC SIMULATION PAUSED BY LEDGER COMMAND. Settlements are held.</div>}
      <div className="gx-fine dispatch-foot"><Clock3 size={11} /> Simulation cycles: {config?.cycleMinutes || 15} minutes · rewards capped at {fmt(config?.payoutCap || 4000)} BC per settlement.</div>
    </div>
  );
}
