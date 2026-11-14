import React from 'react';
import { ChevronRight, AlertTriangle, Activity, Users, ShieldAlert, ArrowUpRight, Clock3, Coins, ScrollText, Flame, Radar } from 'lucide-react';
import { CONTRACTS } from '../../base44/shared/catalog.js';
import { threatLabel } from '../../base44/shared/galacticMath.js';
import { AssetGlyph, EmptyState, ProgressBar, StatusPill, fmt, ownerOf } from './ui.jsx';

const contractFor = (planet, config, index) => {
  const hash = Number(planet.hash) || Number(planet.planetId) || 1;
  const contract = CONTRACTS[(hash + index * 3) % CONTRACTS.length];
  const scale = 1 + (planet.threat || 30) / 90;
  return {
    ...contract,
    payout: Math.round(contract.baseReward * scale * (Number(config.rewardMultiplier) || 1)),
    duration: 10 + ((hash + index * 7) % 16),
  };
};

export default function TargetPanel({ planet, ops, onDeploy, onRecall, onOpenFleet, config, demo }) {
  if (!planet) {
    return (
      <div className="gx-panel-body">
        <EmptyState title="NO TARGET SELECTED">Choose a world on the chart to inspect its live war state, hazards and LEDGER contract options.</EmptyState>
      </div>
    );
  }
  const owner = ownerOf(planet.ownerKey);
  const friendly = (ops?.deployments || []).filter(d => d.planetId === planet.planetId && ['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(d.status));
  const cells = (ops?.planetActivity || {})[planet.planetId] || 0;
  const contracts = [contractFor(planet, config, 0), contractFor(planet, config, 1)];

  return (
    <div className="gx-panel-body target-panel">
      <div className="target-head">
        <div>
          <div className="gx-eyebrow">TARGET WORLD // {planet.planetId.padStart(3, '0')} · HASH {String(planet.hash || '').slice(0, 6)}</div>
          <h2>{planet.name}</h2>
          <p>{planet.sector} sector · {planet.biome?.name || 'Biome unknown'}</p>
        </div>
        <StatusPill tone={planet.ownerKey === 'HUMANS' ? 'good' : 'danger'}>{owner.label}</StatusPill>
      </div>

      <div className="target-readout">
        <div className="readout-cell">
          <span>{planet.humans ? 'DEFENSE INTEGRITY' : 'LIBERATION'}</span>
          <b>{planet.liberation.toFixed(1)}%</b>
          <ProgressBar value={planet.liberation} tone={planet.humans ? 'green' : 'amber'} label="Planet war progress" />
        </div>
        <div className="readout-cell">
          <span>HELLDIVERS ON WORLD</span>
          <b>{planet.players ? fmt(planet.players) : '—'}</b>
          <small><Users size={11} /> live community telemetry</small>
        </div>
        <div className="readout-cell">
          <span>LEDGER THREAT ASSESSMENT</span>
          <b className={`threat-${threatLabel(planet.threat).toLowerCase()}`}>{threatLabel(planet.threat)} · {planet.threat}</b>
          <ProgressBar value={planet.threat} tone="red" label="Threat assessment" />
        </div>
        <div className="readout-cell">
          <span>LEDGER CELLS ON STATION</span>
          <b>{cells || 0}</b>
          <small><Radar size={11} /> simulated contractor traffic</small>
        </div>
      </div>

      <div className="target-flags">
        {planet.contested && <span className="flag live"><Flame size={12} /> ACTIVE CAMPAIGN</span>}
        {planet.event && <span className="flag danger"><ShieldAlert size={12} /> PLANETARY EVENT</span>}
        {planet.humans && <span className="flag good"><ShieldAlert size={12} /> SUPER EARTH CONTROL</span>}
        {planet.disabled && <span className="flag muted">SECTOR LOCKED</span>}
      </div>

      <section className="target-section">
        <h3><AlertTriangle size={13} /> ENVIRONMENTAL HAZARDS</h3>
        {planet.hazards?.length ? (
          <div className="hazard-list">
            {planet.hazards.map(h => (
              <div key={h.name}>
                <b>{h.name}</b>
                <p>{h.description}</p>
              </div>
            ))}
          </div>
        ) : <p className="muted-line">No environmental modifiers reported by the feed.</p>}
        {planet.biome?.description && <p className="biome-copy">{planet.biome.description}</p>}
      </section>

      <section className="target-section">
        <h3><ScrollText size={13} /> AVAILABLE OPERATIONAL CONTRACTS</h3>
        <div className="contract-offers">
          {contracts.map(c => (
            <div className="contract-offer" key={c.id}>
              <div className="offer-head">
                <b>{c.title}</b>
                <StatusPill tone="warn">{c.type}</StatusPill>
              </div>
              <p>{c.description}</p>
              <div className="offer-meta">
                <span><Clock3 size={11} /> {c.duration} MIN EST.</span>
                <span><Coins size={11} /> {fmt(c.payout)} BC</span>
              </div>
            </div>
          ))}
        </div>
        <p className="gx-fine">Fictional LEDGER contracts generated for this theatre. They do not represent official Helldivers missions or rewards.</p>
      </section>

      <section className="target-section">
        <h3><Activity size={13} /> DEPLOYED CONTRACTOR FORCES</h3>
        {friendly.length ? (
          <div className="friendly-list">
            {friendly.map(dep => (
              <div key={dep.id} className="friendly-row">
                <span className="glyph" style={{ color: '#b8ff86' }}><AssetGlyph category={dep.category} size={16} /></span>
                <div>
                  <b>{dep.assetName}</b>
                  <small>{dep.missionType} · {dep.status === 'IN_TRANSIT' ? 'IN TRANSIT' : `${dep.sorties || 0} sorties · ${Math.round(dep.damage || 0)}% damage`}</small>
                </div>
                <button onClick={() => onRecall(dep.id)}>RECALL</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-line">No LEDGER assets currently assigned to this world.</p>
        )}
      </section>

      <div className="target-cta">
        <div>
          <span>ESTIMATED CYCLE</span>
          <b>{config.cycleMinutes || 15} MIN</b>
          <small>Operations settle autonomously on the server.</small>
        </div>
        <div>
          <span>REWARD MODIFIER</span>
          <b>×{Number(config.rewardMultiplier || 1).toFixed(2)}</b>
          <small>{config.season || 'SEASON 01'}</small>
        </div>
        <button className="gx-btn" onClick={onDeploy}>DEPLOY ASSETS <ArrowUpRight size={15} /></button>
        <button className="gx-btn ghost" onClick={onOpenFleet}>FLEET HANGAR <ChevronRight size={14} /></button>
      </div>

      {demo && <div className="gx-preview-note"><AlertTriangle size={13} /> PREVIEW SIMULATION — deployments and battles are stored in this browser until a Base44 session is available.</div>}
      <p className="gx-fine">LEDGER military activity is a private simulation layered over the real war. It never changes Helldivers 2 planetary control.</p>
    </div>
  );
}
