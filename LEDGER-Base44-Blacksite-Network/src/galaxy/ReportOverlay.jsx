import React from 'react';
import { X, Check, ShieldAlert, Wrench, Coins, Activity, Package, Users, ArrowUpRight } from 'lucide-react';
import { AssetGlyph, ProgressBar, fmt } from './ui.jsx';

const copy = {
  VICTORY: 'OPERATION SUCCESSFUL',
  SALVAGE_RECOVERY: 'SALVAGE RECOVERED',
  STALEMATE: 'STALEMATE',
  RETREAT: 'TACTICAL WITHDRAWAL',
  SUPPLY_SHORTAGE: 'SUPPLY SHORTAGE',
  EVACUATION: 'EMERGENCY EVACUATION',
  DAMAGE: 'CRITICAL STRUCTURAL DAMAGE',
};

export default function ReportOverlay({ report, onClose, onAck }) {
  if (!report) return null;
  const tone = report.outcome === 'VICTORY' || report.outcome === 'SALVAGE_RECOVERY' ? 'good' : ['RETREAT', 'EVACUATION', 'DAMAGE', 'SUPPLY_SHORTAGE'].includes(report.outcome) ? 'danger' : 'warn';
  const efficiency = Math.round(((report.net || 0) / Math.max(1, report.reward || 0)) * 100);

  return (
    <div className="gx-overlay" role="dialog" aria-modal="true" aria-label="After action report">
      <div className="gx-modal report-modal">
        <header className="gx-modal-head">
          <div>
            <div className="gx-eyebrow">BLACKSITE AFTER-ACTION REPORT // {report.deploymentId?.slice(0, 12) || 'SIMULATION'}</div>
            <h2>{copy[report.outcome] || report.outcome}</h2>
          </div>
          <button onClick={onClose} aria-label="Close report"><X size={18} /></button>
        </header>

        <div className={`report-banner ${tone}`}>
          <span className="report-glyph"><AssetGlyph category={report.category || 'CORVETTE'} size={26} /></span>
          <div>
            <b>{report.assetName}</b>
            <p>{report.planetName} · {report.faction} · {report.missionType} · {report.cycles} cycle{report.cycles === 1 ? '' : 's'}</p>
          </div>
          <span className="report-net">+{fmt(report.net)}<em>WEB BC</em></span>
        </div>

        <p className="report-narrative">{report.narrative}</p>

        <div className="report-grid">
          <div><span><Coins size={12} /> GROSS RECOVERY</span><b>{fmt(report.reward)}</b></div>
          <div><span><Wrench size={12} /> MAINTENANCE</span><b>−{fmt(report.maintenance)}</b></div>
          <div><span><Package size={12} /> SALVAGE BONUS</span><b>{fmt(report.salvage)}</b></div>
          <div><span><ShieldAlert size={12} /> HULL DAMAGE</span><b>{Math.round(report.damage)}%</b></div>
          <div><span><Activity size={12} /> EXPERIENCE</span><b>+{fmt(report.xp)} XP</b></div>
          <div><span><Users size={12} /> CASUALTIES</span><b>{fmt(report.casualties)}</b></div>
        </div>

        <div className="report-bars">
          <div>
            <div className="stat-label"><span>HULL INTEGRITY</span><b>{Math.max(0, 100 - Math.round(report.damage))}%</b></div>
            <ProgressBar value={100 - (report.damage || 0)} tone={(report.damage || 0) > 60 ? 'red' : 'green'} />
          </div>
          <div>
            <div className="stat-label"><span>PAYOUT EFFICIENCY</span><b>{efficiency}%</b></div>
            <ProgressBar value={efficiency} tone="amber" />
          </div>
        </div>

        {report.modifiers?.length > 0 && (
          <div className="report-mods">
            {report.modifiers.map(m => <span key={m}>{m.replace(':', ' // ')}</span>)}
          </div>
        )}

        <div className="gx-preview-note danger">
          <ShieldAlert size={14} />
          <span>
            <b>RECONCILIATION PENDING.</b> {report.net} web Blacksite Credits are recorded in the website ledger only. This is not an official Helldivers mission result and no Discord LEDGER payout has occurred.
            {report.reconciliationStatus === 'HELD_FOR_REVIEW' && ' This report is currently held by LEDGER staff for economy review.'}
          </span>
        </div>

        <footer className="gx-modal-foot">
          <span className="gx-fine">Report created {report.createdAt ? new Date(report.createdAt).toLocaleString() : '—'}</span>
          {!report.acknowledged && <button className="gx-btn ghost" onClick={() => onAck(report.id)}>ACKNOWLEDGE <Check size={14} /></button>}
          <button className="gx-btn" onClick={onClose}>CLOSE FILE <ArrowUpRight size={14} /></button>
        </footer>
      </div>
    </div>
  );
}
