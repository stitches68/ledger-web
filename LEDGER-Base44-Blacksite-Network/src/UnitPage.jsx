import React, { useEffect, useState } from 'react';
import { Users, Warehouse, ArrowUpRight, Clock, Crosshair, MapPin, TrendingUp, ShieldCheck, AlertTriangle, ScrollText, LockKeyhole } from 'lucide-react';
import { CONTRACTS } from '../base44/shared/catalog.js';
import ItemStats from './ItemStats.jsx';

const fmt = value => Number(value || 0).toLocaleString('en-US');
const graphic = category => ({ FIGHTER: '✈', BOMBER: '◈', GUNSHIP: '⬡', DROPSHIP: '↓', MEDICAL: '✚', TRANSPORT: '▰', CARGO: '▥', CORVETTE: '⟁', CRUISER: '⬢', BATTLESHIP: '◆', CARRIER: '▣', STATION: '◎', ARMOR: '▱', MERCENARY: '♟' }[category] || '⬡');

function SectionHead({ kicker, title, desc, right }) {
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">{kicker}</div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {right && <div className="head-actions">{right}</div>}
    </div>
  );
}

export default function UnitPage({ data, discord, busy, openPage, saveUnit, acceptUnitOp, abandonUnitOp, isDemo }) {
  const profile = data.profile || {};
  const unitName = profile.unit && profile.unit !== 'UNASSIGNED' ? profile.unit : '';
  const [designation, setDesignation] = useState(unitName || '');
  useEffect(() => { setDesignation(unitName || ''); }, [unitName]);

  const members = data.unitMembers || [];
  const fleet = data.unitFleet && data.unitFleet.length
    ? data.unitFleet
    : (data.owned || []).map(asset => ({ ...asset, ownerCallsign: profile.callsign || 'YOU' }));
  const ops = data.unitOps || [];
  const activeOp = ops.find(op => op.status === 'ACTIVE');
  const activeContract = activeOp ? CONTRACTS.find(contract => contract.id === activeOp.contractId) : null;
  const deployed = fleet.filter(asset => asset.status === 'DEPLOYED').length;
  const firepower = fleet.reduce((total, asset) => total + Number(asset.firepower || 0), 0);

  const submitUnit = event => {
    event.preventDefault();
    if (designation.trim().length < 2) return;
    saveUnit(designation.trim());
  };

  return (
    <>
      <SectionHead
        kicker="UNIT COMMAND // COLLECTIVE OPERATIONS"
        title={<>UNIT <em>HANGAR.</em></>}
        desc="Pool your unit's hulls, inspect every member's contribution and run shared web operations. Discord roles verify membership; the unit designation here is a website label."
        right={<div className="wallet-pill"><Users size={15} />{unitName || 'NO UNIT'}</div>}
      />

      <section className="unit-banner">
        <div>
          <div className="eyebrow">UNIT DESIGNATION // SELF-DECLARED WEB LABEL</div>
          <h2>{unitName || 'UNASSIGNED'}</h2>
          <p>
            {discord.identity.verified
              ? <>Verified Discord unit roles: {discord.identity.units?.length ? discord.identity.units.join(' · ') : 'none assigned'}.</>
              : 'Link Discord to verify guild roles. Unit membership on this page is not enforcement — it groups web operations only.'}
          </p>
        </div>
        <form className="unit-form" onSubmit={submitUnit}>
          <label className="field">
            <span>SET UNIT DESIGNATION</span>
            <input value={designation} maxLength={40} onChange={event => setDesignation(event.target.value)} placeholder="ANGEL" />
          </label>
          <button className="btn dark" type="submit" disabled={busy || designation.trim().length < 2}>SAVE UNIT</button>
        </form>
        {!discord.identity.linked && <button className="unit-link" onClick={() => openPage('discord')}>LINK DISCORD FOR ROLE CHECK <ArrowUpRight size={13} /></button>}
      </section>

      <div className="unit-stats">
        <div className="unit-stat"><span>MEMBERS</span><strong>{fmt(members.length || (unitName ? 1 : 0))}</strong><small>Web profiles sharing this unit</small></div>
        <div className="unit-stat"><span>REGISTERED HULLS</span><strong>{fmt(fleet.length)}</strong><small>{deployed} currently deployed</small></div>
        <div className="unit-stat"><span>COMBINED FIREPOWER</span><strong>{fmt(firepower)}</strong><small>Across every hull and squad</small></div>
        <div className="unit-stat"><span>ACTIVE OPERATIONS</span><strong>{activeOp ? '01' : '00'}</strong><small>{activeContract ? activeContract.title : 'No shared operation active'}</small></div>
      </div>

      <div className="unit-grid">
        <section className="panel">
          <div className="panel-head"><h3>UNIT ROSTER</h3><span>{members.length} FILES</span></div>
          {members.length ? members.map(member => {
            const isMe = (member.callsign || '').trim().toLowerCase() === (profile.callsign || '').trim().toLowerCase();
            return (
              <div className={`unit-roster-row ${isMe ? 'me' : ''}`} key={member.callsign}>
                <span className="rank-icon">{(member.callsign || '?')[0]}</span>
                <div><b>{member.callsign || 'UNNAMED'} {isMe && <em className="you-tag">YOU</em>}</b><small>{member.specialty || member.unit || 'CONTRACTOR'} · {member.unit || unitName || 'NO UNIT'}</small></div>
                <div className="unit-roster-value">{fmt(member.webEarned)}<span>WEB BC</span></div>
                <div className="unit-roster-kills">{fmt(member.kills)}<span>KILLS</span></div>
              </div>
            );
          }) : <div className="empty">No unit roster yet. Set a unit designation above, or ask unit members to use the same web unit label.</div>}
          <p className="fineprint"><ShieldCheck size={11} /> Roster groups web dossiers by unit label. Discord role names are shown only when the account is linked and verified.</p>
        </section>

        <section className="panel unit-ops-panel">
          <div className="panel-head"><h3>UNIT WEB OPERATIONS</h3><span>SHARED PROGRESS</span></div>
          {activeOp && activeContract ? (
            <div className="unit-op-active">
              <div className="unit-op-head"><div><span className="eyebrow">ACTIVE UNIT OPERATION</span><h2>{activeContract.title}</h2><p>{activeContract.description}</p></div><span className="chip good">IN PROGRESS</span></div>
              <div className="unit-op-progress">
                <div className="stat-label"><span>SHARED PROGRESS</span><b>{activeOp.completed || 0} / {activeOp.target || activeContract.missionTarget}</b></div>
                <div className="track"><span style={{ width: `${Math.min(100, ((activeOp.completed || 0) / (activeOp.target || activeContract.missionTarget)) * 100)}%`, background: '#91f71f' }} /></div>
              </div>
              <p className="fineprint"><Clock size={11} /> Every patrol cycle any unit member settles counts toward this operation. Completion pays the contract reward to the member who finishes it.</p>
              {(activeOp.createdByUserId === profile.userId || activeOp.createdByUserId === 'preview' || !activeOp.createdByUserId)
                ? <button className="btn dark" disabled={busy} onClick={() => abandonUnitOp(activeOp.id)}>CLOSE OPERATION</button>
                : <p className="fineprint">Only the operation creator can close it.</p>}
            </div>
          ) : (
            <>
              <p className="unit-ops-intro">Activate one shared web contract for the whole unit. Any member's settled patrols advance it.</p>
              <div className="unit-op-list">
                {CONTRACTS.map(contract => {
                  const done = ops.find(op => op.contractId === contract.id && op.status === 'COMPLETED');
                  return (
                    <div className="unit-op-row" key={contract.id}>
                      <span className="list-icon"><ScrollText size={17} /></span>
                      <div><b>{contract.title}</b><small>{contract.type} · {contract.missionTarget} patrol cycles · {fmt(contract.baseReward)} BC</small></div>
                      {done ? <span className="chip good">COMPLETED</span> : (
                        <button className="btn dark" disabled={busy || !unitName} onClick={() => acceptUnitOp(contract.id)}>ACTIVATE</button>
                      )}
                    </div>
                  );
                })}
              </div>
              {!unitName && <p className="fineprint"><AlertTriangle size={11} /> Set a unit designation before activating a shared operation.</p>}
            </>
          )}
        </section>
      </div>

      <section className="panel unit-hangar-panel">
        <div className="panel-head"><h3>UNIT HANGAR</h3><span>{fleet.length} HULLS / SQUADS</span></div>
        {fleet.length ? (
          <div className="unit-fleet-grid">
            {fleet.slice(0, 24).map(asset => (
              <div className="unit-fleet-card" key={asset.id}>
                <div className="unit-fleet-head">
                  <div className="unit-fleet-glyph">{graphic(asset.category)}</div>
                  <div><b>{asset.name}</b><small>{asset.category} · {asset.ownerCallsign || profile.callsign || 'UNIT ASSET'}</small></div>
                  <span className={`asset-dot ${asset.status === 'DEPLOYED' ? 'lit' : ''}`} />
                </div>
                <ItemStats item={asset} kind="asset" />
                <div className="unit-fleet-foot">
                  <span><MapPin size={11} /> {asset.status === 'DEPLOYED' ? 'DEPLOYED' : 'HANGAR'}</span>
                  <span><TrendingUp size={11} /> {fmt(asset.income)} BC / 30M</span>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty">No hulls registered in this unit yet. Acquire assets in the Black Market and deploy them together.</div>}
        <div className="panel-foot">
          <span><Crosshair size={11} /> Unit hangar aggregates web assets from profiles sharing this unit label.</span>
          <button className="btn dark" onClick={() => openPage('hangar')}><Warehouse size={13} /> OPEN PERSONAL HANGAR</button>
        </div>
      </section>

      <div className="help-block">
        <LockKeyhole size={18} />
        <p><b>What is verified:</b> Discord guild and unit roles are checked server-side when your account is linked. Web unit membership, shared operations and this hangar are website simulation features — they do not read or write the LEDGER Discord bot database.{isDemo ? ' Preview mode keeps changes in this sample session only.' : ''}</p>
      </div>
    </>
  );
}
