import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Save, RadioTower, Pause, Play, Gavel, AlertTriangle } from 'lucide-react';
import { StatusPill, fmt } from './ui.jsx';

export default function AdminOverlay({ discord, invoke, config, bundle, onClose, notify }) {
  const isAdmin = discord?.identity?.isAdmin;
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    rewardMultiplier: config?.rewardMultiplier ?? 1,
    payoutCap: config?.payoutCap ?? 4000,
    maintenanceRate: config?.maintenanceRate ?? 0.14,
    cycleMinutes: config?.cycleMinutes ?? 15,
    paused: !!config?.paused,
    season: config?.season || 'SEASON 01 // BLACK VEIL',
  });
  const [event, setEvent] = useState({ title: '', planetId: '', multiplier: 1.5, minutes: 720 });

  const load = async () => {
    if (!invoke) {
      setError('Admin verification needs a live Base44 session and the configured LEDGER Discord role.');
      return;
    }
    setBusy(true);
    try {
      const raw = await invoke('galaxyOps', { type: 'admin_status' });
      const data = raw?.data ?? raw;
      if (data?.error) throw new Error(data.error);
      setStatus(data);
      setError('');
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    else setError('LEDGER moderation role required. This is verified on the server for every action.');
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async payload => {
    if (!invoke) return;
    setBusy(true);
    try {
      const raw = await invoke('galaxyOps', payload);
      const data = raw?.data ?? raw;
      if (data?.error) throw new Error(data.error);
      notify?.(data?.message || 'GALACTIC COMMAND UPDATED');
      await load();
    } catch (e) {
      notify?.(`COMMAND DENIED: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gx-overlay" role="dialog" aria-modal="true" aria-label="Galactic command center">
      <div className="gx-modal admin-modal">
        <header className="gx-modal-head">
          <div>
            <div className="gx-eyebrow">LEDGER // VERIFIED AUTHORITY</div>
            <h2>GALACTIC COMMAND</h2>
          </div>
          <button onClick={onClose} aria-label="Close command center"><X size={18} /></button>
        </header>

        {!isAdmin ? (
          <div className="gx-preview-note danger"><ShieldAlert size={15} /> Only LEDGER moderators with the configured Discord role may open the galactic command center. The role is re-checked server-side on every request.</div>
        ) : (
          <>
            {error && <div className="gx-preview-note danger"><AlertTriangle size={14} /> {error}</div>}

            <section className="admin-section">
              <h3>SIMULATION ECONOMY</h3>
              <div className="admin-grid">
                <label>REWARD MULTIPLIER<input type="number" step="0.05" min="0.5" max="2.5" value={form.rewardMultiplier} onChange={e => setForm({ ...form, rewardMultiplier: Number(e.target.value) })} /></label>
                <label>PAYOUT CAP (BC)<input type="number" min="50" max="50000" value={form.payoutCap} onChange={e => setForm({ ...form, payoutCap: Number(e.target.value) })} /></label>
                <label>MAINTENANCE RATE<input type="number" step="0.01" min="0.05" max="0.5" value={form.maintenanceRate} onChange={e => setForm({ ...form, maintenanceRate: Number(e.target.value) })} /></label>
                <label>CYCLE MINUTES<input type="number" min="5" max="180" value={form.cycleMinutes} onChange={e => setForm({ ...form, cycleMinutes: Number(e.target.value) })} /></label>
                <label>SEASON<input value={form.season} maxLength={60} onChange={e => setForm({ ...form, season: e.target.value })} /></label>
              </div>
              <div className="admin-actions">
                <button className="gx-btn small" disabled={busy} onClick={() => send({ type: 'admin_config', ...form })}><Save size={12} /> SAVE ECONOMY</button>
                <button className="gx-btn small ghost" disabled={busy} onClick={() => { const paused = !form.paused; setForm({ ...form, paused }); send({ type: 'admin_config', ...form, paused }); }}>
                  {form.paused ? <Play size={12} /> : <Pause size={12} />} {form.paused ? 'RESUME' : 'PAUSE'} SIMULATION
                </button>
              </div>
            </section>

            <section className="admin-section">
              <h3><RadioTower size={13} /> SPECIAL FICTIONAL EVENT</h3>
              <div className="admin-grid">
                <label>EVENT TITLE<input value={event.title} maxLength={80} onChange={e => setEvent({ ...event, title: e.target.value })} placeholder="BLACK VEIL SURGE" /></label>
                <label>TARGET PLANET<input value={event.planetId} onChange={e => setEvent({ ...event, planetId: e.target.value })} list="admin-planets" placeholder="129" /></label>
                <datalist id="admin-planets">{(bundle?.planets || []).slice(0, 80).map(p => <option key={p.planetId} value={p.planetId}>{p.name}</option>)}</datalist>
                <label>MULTIPLIER<input type="number" step="0.1" min="0.5" max="3" value={event.multiplier} onChange={e => setEvent({ ...event, multiplier: Number(e.target.value) })} /></label>
                <label>DURATION (MIN)<input type="number" min="15" max="10080" value={event.minutes} onChange={e => setEvent({ ...event, minutes: Number(e.target.value) })} /></label>
              </div>
              <button className="gx-btn small" disabled={busy || event.title.trim().length < 4} onClick={() => send({ type: 'admin_event', ...event })}><RadioTower size={12} /> BROADCAST EVENT</button>
            </section>

            <section className="admin-section">
              <h3><Gavel size={13} /> PENDING RECONCILIATION</h3>
              <div className="admin-kpis">
                <div><span>UNRECONCILED</span><b>{fmt(status?.pendingReconciliation || 0)} BC</b></div>
                <div><span>PENDING CLAIMS</span><b>{status?.pendingClaims ?? '—'}</b></div>
                <div><span>ROLE CHECK</span><StatusPill tone="good">VERIFIED</StatusPill></div>
              </div>
              <div className="admin-reports">
                {(status?.reports || []).slice(0, 8).map(report => (
                  <div key={report.id} className="admin-report-row">
                    <div><b>{report.assetName}</b><small>{report.planetName} · {report.outcome.replaceAll('_', ' ')}</small></div>
                    <span>{fmt(report.net)} BC</span>
                    <StatusPill tone={report.reconciliationStatus === 'HELD_FOR_REVIEW' ? 'danger' : 'warn'}>{report.reconciliationStatus || 'PENDING'}</StatusPill>
                    {report.reconciliationStatus !== 'HELD_FOR_REVIEW' && (
                      <button onClick={() => send({ type: 'admin_flag_report', reportId: report.id })} disabled={busy}>HOLD</button>
                    )}
                  </div>
                ))}
                {!status?.reports?.length && <p className="muted-line">No galactic reports recorded yet.</p>}
              </div>
            </section>

            <section className="admin-section">
              <h3>ACTIVE DEPLOYMENTS</h3>
              <div className="admin-reports">
                {(status?.deployments || []).filter(d => ['ACTIVE', 'IN_TRANSIT'].includes(d.status)).slice(0, 8).map(dep => (
                  <div key={dep.id} className="admin-report-row">
                    <div><b>{dep.assetName}</b><small>{dep.planetName} · {dep.status} · {dep.missionType}</small></div>
                    <button onClick={() => send({ type: 'admin_cancel', deploymentId: dep.id })} disabled={busy}>CANCEL</button>
                  </div>
                ))}
                {!status?.deployments?.length && <p className="muted-line">No deployments to monitor.</p>}
              </div>
            </section>

            <p className="gx-fine">All privileged actions are re-verified against your authenticated Discord role and written to the LEDGER admin audit log. Simulation rewards never move Discord credits.</p>
          </>
        )}
      </div>
    </div>
  );
}
