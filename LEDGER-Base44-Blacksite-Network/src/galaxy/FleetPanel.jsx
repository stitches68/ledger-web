import React, { useMemo, useState } from 'react';
import { Paintbrush, Wrench, Check, RotateCcw, ArrowUpRight, Shield, Gauge, Users, Package, Sparkles, Crosshair, Layers, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { MODS } from '../../base44/shared/catalog.js';
import { categoryFamily } from '../../base44/shared/galacticMath.js';
import { AssetGlyph, EmptyState, ProgressBar, StatusPill, fmt } from './ui.jsx';

const SLOTS = ['WEAPON', 'SHIELD', 'ARMOR', 'ENGINE', 'UTILITY'];
const ROLES = ['PATROL', 'ESCORT', 'STRIKE', 'RECOVERY', 'LOGISTICS', 'MEDICAL', 'RECON', 'RESERVE'];
const FILTERS = [['ALL', 'ALL ASSETS'], ['SHIPS', 'VESSELS'], ['GROUND', 'GROUND'], ['SUPPORT', 'SUPPORT']];

export default function FleetPanel({ assets, deployments, reports, taskForces, equipment, onAct, onRecall, onSelectPlanet, onOpenReport, onOpenHangar, busy, demo }) {
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(assets?.[0]?.id || '');
  const [rename, setRename] = useState('');
  const [livery, setLivery] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [forceName, setForceName] = useState('');
  const [forceDoctrine, setForceDoctrine] = useState('BALANCED');
  const [forceAssets, setForceAssets] = useState([]);

  const filtered = useMemo(() => (assets || []).filter(asset => {
    if (filter === 'ALL') return true;
    const fam = categoryFamily(asset.category);
    if (filter === 'SHIPS') return ['AIR', 'CAPITAL'].includes(fam);
    if (filter === 'GROUND') return fam === 'GROUND';
    return ['SUPPORT', 'MEDICAL', 'LOGISTICS'].includes(fam) || fam === 'MEDICAL' || fam === 'LOGISTICS';
  }), [assets, filter]);

  const selected = (assets || []).find(a => a.id === selectedId) || filtered[0] || assets?.[0] || null;
  const dep = deployments?.find(d => d.assetId === selected?.id && ['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(d.status));
  const history = (reports || []).filter(r => r.assetId === selected?.id).slice(0, 4);
  const mods = (equipment || []).filter(e => e.kind === 'mod');

  const repairCost = selected ? Math.ceil((Number(selected.damage) || 0) * Math.max(8, (Number(selected.hull) || 100) / 100)) : 0;
  const restockCost = selected ? Math.ceil(Math.max(0, 100 - (Number(selected.supplies) || 0)) * Math.max(1, (Number(selected.income) || 3) / 3)) : 0;

  const act = (type, payload) => {
    onAct(type, { assetId: selected?.id, ...payload });
  };

  if (!assets?.length) {
    return (
      <div className="gx-panel-body">
        <EmptyState title="NO REGISTERED ASSETS">Acquire a hull or ground unit in the Black Market, then return to commit it to a theatre.</EmptyState>
        <button className="gx-btn ghost" onClick={onOpenHangar}>OPEN BLACK MARKET <ArrowUpRight size={14} /></button>
      </div>
    );
  }

  return (
    <div className="gx-panel-body fleet-panel">
      <div className="fleet-head">
        <div>
          <div className="gx-eyebrow">ASSET COMMAND // PRIVATE REGISTRY</div>
          <h2>FLEET CONTROL</h2>
        </div>
        <StatusPill tone="muted">{assets.length} ASSETS</StatusPill>
      </div>

      <div className="fleet-filters">
        {FILTERS.map(([key, label]) => <button key={key} className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>{label}</button>)}
      </div>

      <div className="fleet-list">
        {filtered.map(asset => {
          const active = deployments?.find(d => d.assetId === asset.id && ['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(d.status));
          return (
            <button key={asset.id} className={`fleet-row ${selected?.id === asset.id ? 'on' : ''}`} onClick={() => { setSelectedId(asset.id); setRename(''); setLivery(null); setEditOpen(false); }}>
              <span className="glyph" style={{ color: asset.trimColor || '#91f71f', borderColor: asset.color || '#2b3d2e' }}><AssetGlyph category={asset.category} size={17} /></span>
              <span className="fleet-row-main">
                <b>{asset.name}</b>
                <small>{asset.category} · LVL {asset.level || 1} · {asset.role || 'PATROL'}</small>
              </span>
              <span className={`fleet-dot ${active ? 'live' : ''}`} />
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="fleet-detail">
          <div className="fleet-hero" style={{ '--body': selected.color || '#16221a', '--trim': selected.trimColor || '#91f71f' }}>
            <div className="fleet-hero-grid" aria-hidden="true" />
            <span className="fleet-hero-glyph"><AssetGlyph category={selected.category} size={46} /></span>
            <div className="fleet-hero-meta">
              <b>{selected.name}</b>
              <small>{selected.category} · {selected.quality || 'STANDARD'} · {selected.role || 'PATROL'}</small>
            </div>
            <StatusPill tone={selected.status === 'DEPLOYED' ? 'good' : selected.status === 'DAMAGED' ? 'danger' : 'muted'}>{selected.status}</StatusPill>
          </div>

          <div className="fleet-stats">
            <div><span><Shield size={11} /> HULL</span><b>{Math.max(0, 100 - Math.round(selected.damage || 0))}%</b><ProgressBar value={100 - (selected.damage || 0)} tone={(selected.damage || 0) > 55 ? 'red' : 'green'} /></div>
            <div><span><Crosshair size={11} /> FIREPOWER</span><b>{fmt(selected.firepower)}</b><small>Base weapon output</small></div>
            <div><span><Gauge size={11} /> SPEED</span><b>{fmt(selected.speed)}</b><small>Transit rating</small></div>
            <div><span><Package size={11} /> SUPPLIES</span><b>{Math.round(selected.supplies ?? 100)}%</b><ProgressBar value={selected.supplies ?? 100} tone="amber" /></div>
            <div><span><Users size={11} /> CREW</span><b>{selected.crew ?? '—'}</b><small>{categoryFamily(selected.category) === 'GROUND' ? 'Operatives' : 'Hull crew'}</small></div>
            <div><span><Sparkles size={11} /> EXPERIENCE</span><b>LVL {selected.level || 1}</b><ProgressBar value={((selected.xp || 0) % 60) / 60 * 100} tone="green" /></div>
          </div>

          {dep && (
            <div className="fleet-deployment">
              <div>
                <span>DEPLOYED TO</span>
                <button onClick={() => onSelectPlanet(dep.planetId)}>{dep.planetName} <ArrowUpRight size={11} /></button>
              </div>
              <div><span>STATUS</span><b>{dep.status.replace('_', ' ')}</b></div>
              <div><span>EARNED</span><b>{fmt(dep.earned || 0)} BC</b></div>
              <div><span>SORTIES</span><b>{dep.sorties || 0}</b></div>
              <button className="gx-btn small ghost" onClick={() => onRecall(dep.id)} disabled={busy}><RotateCcw size={12} /> RECALL</button>
            </div>
          )}

          <div className="fleet-actions">
            <button onClick={() => setEditOpen(open => !open)} className={editOpen ? 'on' : ''}><Paintbrush size={13} /> REFIT & LIVERY</button>
            <button onClick={() => act('repair')} disabled={busy || !!dep || !(selected.damage > 0)}><Wrench size={13} /> REPAIR {repairCost ? `(${fmt(repairCost)} BC)` : ''}</button>
            <button onClick={() => act('restock')} disabled={busy || !!dep || (selected.supplies ?? 100) >= 100}><Package size={13} /> RESTOCK {restockCost ? `(${fmt(restockCost)} BC)` : ''}</button>
            <button onClick={onOpenHangar}><Layers size={13} /> FULL HANGAR</button>
          </div>

          {editOpen && (
            <div className="refit-block">
              <div className="refit-row">
                <label>DESIGNATION<input value={rename || selected.name} maxLength={36} onChange={e => setRename(e.target.value)} /></label>
                <button className="gx-btn small" disabled={busy || !rename || rename.trim().length < 2} onClick={() => act('rename', { name: rename.trim() })}>SAVE <Check size={12} /></button>
              </div>
              <div className="refit-row">
                <label>HULL COLOR<input type="color" value={livery?.color ?? selected.color ?? '#16221a'} onChange={e => setLivery({ color: e.target.value, trimColor: livery?.trimColor ?? selected.trimColor ?? '#91f71f' })} /></label>
                <label>TRIM COLOR<input type="color" value={livery?.trimColor ?? selected.trimColor ?? '#91f71f'} onChange={e => setLivery({ color: livery?.color ?? selected.color ?? '#16221a', trimColor: e.target.value })} /></label>
              </div>
              <div className="refit-row livery-row">
                <button className="gx-btn small" disabled={busy || !livery} onClick={() => { act('paint', livery); setLivery(null); }}>SAVE LIVERY <Check size={12} /></button>
                <span className="gx-fine">Hull livery is persisted with the asset and shown on the chart.</span>
              </div>
              <div className="refit-row">
                <label>OPERATIONAL ROLE
                  <select value={selected.role || 'PATROL'} onChange={e => act('role', { role: e.target.value })}>
                    {ROLES.map(role => <option key={role}>{role}</option>)}
                  </select>
                </label>
                <label>CREW MANIFEST<input type="number" min="0" max="240" value={selected.crew ?? 0} onChange={e => act('crew', { crew: Number(e.target.value) })} /></label>
              </div>

              <div className="loadout-block">
                <h4>WEAPONS / DEFENSIVE SYSTEMS</h4>
                {SLOTS.map(slot => {
                  const options = mods.filter(e => MODS.find(m => m.id === e.catalogId)?.slot === slot);
                  const current = selected.components?.[slot] || '';
                  return (
                    <div className="loadout-row" key={slot}>
                      <span>{slot}</span>
                      <select
                        value={current}
                        disabled={busy || !!dep || !options.length}
                        onChange={e => {
                          const item = MODS.find(m => m.id === e.target.value);
                          if (item) act('install', { itemId: item.id, slot: item.slot });
                        }}
                      >
                        <option value="">{options.length ? 'NO MODULE INSTALLED' : 'NO MODULE REQUISITIONED'}</option>
                        {options.map(e => {
                          const item = MODS.find(m => m.id === e.catalogId);
                          return <option key={e.catalogId} value={e.catalogId}>{item?.name || e.catalogId}</option>;
                        })}
                      </select>
                      <small>{MODS.find(m => m.id === current)?.desc || 'Empty hardpoint'}</small>
                    </div>
                  );
                })}
                <p className="gx-fine">Modules are purchased in the Black Market. Installing one while recalled changes the asset's combat and earning profile.</p>
              </div>
            </div>
          )}

          <div className="fleet-history">
            <h4>DEPLOYMENT HISTORY</h4>
            {history.length ? history.map(report => (
              <button key={report.id} className="fleet-history-row" onClick={() => onOpenReport(report)}>
                <span>{report.outcome.replaceAll('_', ' ')}</span>
                <b>{report.planetName}</b>
                <em>+{fmt(report.net)} BC</em>
              </button>
            )) : <p className="muted-line">No settled operations for this asset yet.</p>}
          </div>
        </div>
      )}

      <section className="taskforce-block">
        <h3><Layers size={13} /> TASK FORCES</h3>
        {taskForces?.length ? (
          <div className="taskforce-list">
            {taskForces.map(force => (
              <div key={force.id} className="taskforce-row">
                <div><b>{force.name}</b><small>{force.doctrine} · {(force.assetIds || []).length} assets</small></div>
                <button onClick={() => onAct('task_force_delete', { id: force.id })} disabled={busy} aria-label={`Dissolve ${force.name}`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        ) : <p className="muted-line">No task forces mustered.</p>}
        <div className="taskforce-form">
          <input value={forceName} onChange={e => setForceName(e.target.value)} maxLength={28} placeholder="TASK FORCE NAME" aria-label="Task force name" />
          <select value={forceDoctrine} onChange={e => setForceDoctrine(e.target.value)} aria-label="Doctrine">
            {['BALANCED', 'SHOCK', 'SCREEN', 'SUPPORT', 'STEALTH'].map(d => <option key={d}>{d}</option>)}
          </select>
          <button
            className="gx-btn small"
            disabled={busy || forceName.trim().length < 2}
            onClick={() => {
              onAct('task_force_save', { name: forceName, doctrine: forceDoctrine, assetIds: forceAssets });
              setForceName('');
              setForceAssets([]);
            }}
          >
            <Plus size={12} /> MUSTER
          </button>
        </div>
        <div className="taskforce-picks">
          {(assets || []).slice(0, 8).map(asset => (
            <button
              key={asset.id}
              className={forceAssets.includes(asset.id) ? 'on' : ''}
              onClick={() => setForceAssets(prev => (prev.includes(asset.id) ? prev.filter(id => id !== asset.id) : [...prev, asset.id]))}
            >
              {asset.name}
            </button>
          ))}
        </div>
        <p className="gx-fine">Task forces group assets for deployment. Only your own equipment can be assigned; unit assets remain controlled by their owner.</p>
      </section>

      {demo && <div className="gx-preview-note"><AlertTriangle size={13} /> PREVIEW REFIT — colour, name and loadout changes are stored in this browser only.</div>}
    </div>
  );
}
