import React, { useMemo, useState } from 'react';
import { X, Check, AlertTriangle, ArrowLeft, ArrowRight, Users, Wrench, Clock3, Coins, ShieldAlert, Crosshair } from 'lucide-react';
import { MISSION_TYPES, categoryFamily, maintenanceCost, missionRisk, projectedReward, threatLabel, travelMinutes } from '../../base44/shared/galacticMath.js';
import { AssetGlyph, fmt, ownerOf } from './ui.jsx';

const ORDER = ['STRIKE', 'ESCORT', 'RECOVERY', 'RESUPPLY', 'RECON', 'MEDEVAC'];

export default function DeployPanel({ planet, assets, taskForces, config, busy, onClose, onConfirm, demo }) {
  const [picked, setPicked] = useState([]);
  const [mission, setMission] = useState('STRIKE');
  const [forceId, setForceId] = useState('');
  const [step, setStep] = useState('select');
  const [ack, setAck] = useState(false);

  const available = useMemo(
    () => (assets || []).filter(a => a.status !== 'DEPLOYED' && a.status !== 'DAMAGED' && Number(a.damage || 0) < 80),
    [assets],
  );
  const selectedAssets = available.filter(a => picked.includes(a.id));
  const campaign = planet?.campaign || null;

  const projection = selectedAssets.map(asset => ({
    asset,
    minutes: travelMinutes(asset, planet),
    risk: missionRisk(asset, planet, campaign, mission),
    reward: projectedReward(asset, planet, campaign, mission, config),
    upkeep: maintenanceCost(asset, config),
  }));
  const totalReward = projection.reduce((sum, row) => sum + row.reward, 0);
  const avgRisk = projection.length ? Math.round(projection.reduce((sum, row) => sum + row.risk, 0) / projection.length) : 0;
  const maxTravel = projection.length ? Math.max(...projection.map(row => row.minutes)) : 0;

  const toggle = id => setPicked(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 6)));

  const owner = planet ? ownerOf(planet.ownerKey) : null;

  return (
    <div className="gx-overlay" role="dialog" aria-modal="true" aria-label="Deploy assets">
      <div className="gx-modal deploy-modal">
        <header className="gx-modal-head">
          <div>
            <div className="gx-eyebrow">DEPLOYMENT AUTHORIZATION // {step === 'select' ? 'STAGE 01' : 'STAGE 02'}</div>
            <h2>{step === 'select' ? 'COMMIT ASSETS' : 'CONFIRM OPERATION'}</h2>
          </div>
          <button onClick={onClose} aria-label="Close deployment panel"><X size={18} /></button>
        </header>

        {planet && (
          <div className="deploy-target">
            <span className="dot" style={{ background: owner.color }} />
            <div><b>{planet.name}</b><small>{planet.sector} · {owner.label} · {threatLabel(planet.threat)} THREAT</small></div>
            <span className="deploy-coords">{planet.planetId.padStart(3, '0')}</span>
          </div>
        )}

        {step === 'select' ? (
          <>
            <section className="deploy-block">
              <h3><Crosshair size={13} /> MISSION PROFILE</h3>
              <div className="mission-grid">
                {ORDER.map(key => {
                  const type = MISSION_TYPES[key];
                  return (
                    <button key={key} className={mission === key ? 'on' : ''} onClick={() => setMission(key)}>
                      <b>{type.label}</b>
                      <small>{type.tag}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="deploy-block">
              <h3><Users size={13} /> AVAILABLE ASSETS <em>{picked.length}/6 SELECTED</em></h3>
              {available.length ? (
                <div className="deploy-assets">
                  {available.map(asset => {
                    const isPicked = picked.includes(asset.id);
                    return (
                      <button key={asset.id} className={`deploy-asset ${isPicked ? 'on' : ''}`} onClick={() => toggle(asset.id)}>
                        <span className="glyph" style={{ color: '#b8ff86', borderColor: asset.trimColor || '#35543a' }}><AssetGlyph category={asset.category} size={17} /></span>
                        <span className="deploy-asset-main">
                          <b>{asset.name}</b>
                          <small>{asset.category} · {categoryFamily(asset.category)} · LVL {asset.level || 1}</small>
                        </span>
                        <span className="deploy-asset-stats">
                          <span>HULL <b>{Math.max(0, Math.round(100 - (asset.damage || 0)))}%</b></span>
                          <span>SUP <b>{Math.round(asset.supplies ?? 100)}%</b></span>
                        </span>
                        <span className={`pickbox ${isPicked ? 'on' : ''}`}>{isPicked && <Check size={12} />}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="muted-line">No operational assets are available. Repair, restock or recall a hull in the Fleet panel first.</p>
              )}
            </section>

            <section className="deploy-block compact">
              <h3><Wrench size={13} /> TASK FORCE</h3>
              <select value={forceId} onChange={e => setForceId(e.target.value)}>
                <option value="">UNASSIGNED // SOLO CONTRACT</option>
                {(taskForces || []).map(force => <option key={force.id} value={force.id}>{force.name} · {force.doctrine}</option>)}
              </select>
            </section>

            <div className={`deploy-projection ${avgRisk >= 70 ? 'danger' : avgRisk >= 50 ? 'warn' : ''}`}>
              <div><span><Clock3 size={12} /> TRANSIT WINDOW</span><b>{maxTravel || '—'} MIN</b></div>
              <div><span><ShieldAlert size={12} /> PROJECTED RISK</span><b>{avgRisk || '—'}%</b></div>
              <div><span><Coins size={12} /> PROJECTED GROSS</span><b>{fmt(totalReward)} BC</b></div>
              <div><span><Wrench size={12} /> MAINTENANCE</span><b>{fmt(projection.reduce((s, r) => s + r.upkeep, 0))} BC</b></div>
            </div>

            <footer className="gx-modal-foot">
              <span className="gx-fine">Only owned, operational assets are committed. Rewards are web Blacksite Credits awaiting reconciliation.</span>
              <button className="gx-btn" disabled={!selectedAssets.length || busy} onClick={() => setStep('review')}>REVIEW ORDERS <ArrowRight size={15} /></button>
            </footer>
          </>
        ) : (
          <>
            <section className="deploy-block">
              <h3>OPERATION MANIFEST</h3>
              <div className="manifest">
                {projection.map(row => (
                  <div key={row.asset.id} className="manifest-row">
                    <span className="glyph"><AssetGlyph category={row.asset.category} size={16} /></span>
                    <div><b>{row.asset.name}</b><small>{row.asset.category} · {mission}</small></div>
                    <div className="manifest-facts">
                      <span>RISK <b>{row.risk}%</b></span>
                      <span>ETA <b>{row.minutes}m</b></span>
                      <span>REWARD <b>{fmt(row.reward)} BC</b></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="manifest-summary">
                <div><span>THEATRE</span><b>{planet?.name}</b></div>
                <div><span>MISSION</span><b>{mission}</b></div>
                <div><span>GROSS</span><b>{fmt(totalReward)} BC</b></div>
                <div><span>UPKEEP</span><b>{fmt(projection.reduce((s, r) => s + r.upkeep, 0))} BC</b></div>
              </div>
            </section>

            <div className="deploy-warning">
              <AlertTriangle size={16} />
              <div>
                <b>FICTIONAL LEDGER OPERATION</b>
                <p>This deployment fights LEDGER's own simulation. It does not alter the official Helldivers 2 galactic war, and no payout is an official mission reward.</p>
              </div>
            </div>

            <label className="ack-row">
              <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
              <span>I authorize this blacksite operation and understand the rewards are web-only.</span>
            </label>

            <footer className="gx-modal-foot">
              <button className="gx-btn ghost" onClick={() => setStep('select')}><ArrowLeft size={14} /> ADJUST FORCES</button>
              <button
                className="gx-btn"
                disabled={!ack || busy || !selectedAssets.length}
                onClick={() => onConfirm({ assetIds: picked, missionType: mission, taskForceId: forceId })}
              >
                {busy ? 'TRANSMITTING…' : 'CONFIRM DEPLOYMENT'} <Check size={15} />
              </button>
            </footer>
            {demo && <p className="gx-fine">Preview mode: this operation is stored in this browser only.</p>}
          </>
        )}
      </div>
    </div>
  );
}
