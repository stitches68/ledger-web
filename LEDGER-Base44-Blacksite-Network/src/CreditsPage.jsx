import React, { useEffect, useState } from 'react';
import { Coins, Link2, ShieldCheck, ShieldAlert, Clock, ArrowUpRight, History, LockKeyhole, CircleDollarSign, TrendingUp, ShoppingBag, ScrollText, Wallet } from 'lucide-react';

const fmt = value => Number(value || 0).toLocaleString('en-US');
const stamp = value => {
  if (!value) return 'NEVER';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'UNKNOWN' : date.toLocaleString();
};
const statusCopy = {
  NOT_LINKED: ['NOT LINKED', 'blocked'],
  PENDING_VERIFICATION: ['PENDING STAFF VERIFICATION', 'warn'],
  VERIFIED: ['VERIFIED BY STAFF', 'ok'],
  REJECTED: ['VERIFICATION REJECTED', 'blocked'],
};

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

export default function CreditsPage({ data, discord, connected, busy, openPage, onRedeem, linkBalance, isDemo }) {
  const profile = data.profile || {};
  const history = data.history || [];
  const status = profile.discordBalanceStatus || (profile.discordCredits != null ? 'PENDING_VERIFICATION' : 'NOT_LINKED');
  const [copy, tone] = statusCopy[status] || statusCopy.NOT_LINKED;
  const [amount, setAmount] = useState(profile.discordCredits != null ? String(profile.discordCredits) : '');
  const [note, setNote] = useState(profile.discordBalanceNote || '');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (profile.discordCredits != null) setAmount(String(profile.discordCredits));
    setNote(profile.discordBalanceNote || '');
  }, [profile.discordCredits, profile.discordBalanceNote]);

  const submitLink = async event => {
    event.preventDefault();
    const value = Math.trunc(Number(amount));
    if (!Number.isSafeInteger(value) || value < 0) return;
    setSending(true);
    try {
      await linkBalance(value, note);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SectionHead
        kicker="WALLET CONTROL // DUAL LEDGER"
        title={<>BLACKSITE <em>CREDITS.</em></>}
        desc="The website wallet and the LEDGER Discord balance are separate ledgers. Link a claimed Discord balance for staff verification — the website never reads or moves bot credits."
        right={<div className="wallet-pill"><Coins size={15} />{fmt(profile.webCredits)} WEB BC</div>}
      />

      <div className="credits-grid">
        <section className="ledger-card">
          <div className="ledger-head">
            <div><span className="eyebrow">WEBSITE LEDGER // SPENDABLE</span><h2>WEB WALLET</h2></div>
            <Wallet size={26} />
          </div>
          <div className="balance-hero">{fmt(profile.webCredits)}<small>WEB BLACKSITE CREDITS</small></div>
          <div className="ledger-facts">
            <div><span>LIFETIME EARNED</span><b>{fmt(profile.webEarned)}</b></div>
            <div><span>ESCROW PENDING</span><b>{fmt(profile.pendingCredits)}</b></div>
            <div><span>ACCOUNT MODE</span><b>{connected ? 'LIVE BASE44 ACCOUNT' : 'PREVIEW SAMPLE'}</b></div>
          </div>
          <div className="ledger-actions">
            <button className="btn dark" onClick={() => openPage('market')}><ShoppingBag size={14} /> SPEND IN MARKET</button>
            <button className="btn dark" onClick={onRedeem}><ArrowUpRight size={14} /> REQUEST REDEMPTION</button>
          </div>
        </section>

        <section className="ledger-card discord">
          <div className="ledger-head">
            <div><span className="eyebrow">DISCORD LEDGER // CLAIMED</span><h2>DISCORD WALLET</h2></div>
            <Link2 size={26} />
          </div>
          <div className="balance-hero">{profile.discordCredits != null ? fmt(profile.discordCredits) : '—'}<small>CLAIMED BLACKSITE CREDITS</small></div>
          <div className="ledger-facts">
            <div><span>LINK STATUS</span><b><span className={`state-${tone}`}>{copy}</span></b></div>
            <div><span>DISCORD ACCOUNT</span><b>{discord.identity.linked ? (discord.identity.username || 'LINKED') : 'NOT LINKED'}</b></div>
            <div><span>LAST SUBMITTED</span><b>{stamp(profile.discordBalanceSyncedAt)}</b></div>
          </div>
          <div className="ledger-actions">
            <button className="btn dark" onClick={() => openPage('discord')}><ShieldCheck size={14} /> {discord.identity.linked ? 'MANAGE DISCORD LINK' : 'CONNECT DISCORD'}</button>
          </div>
        </section>
      </div>

      <section className="panel link-panel">
        <div className="panel-head">
          <h3>LINK DISCORD BALANCE</h3>
          <span>MANUAL STAFF VERIFICATION</span>
        </div>
        <p className="fineprint">
          Submit the balance shown by the LEDGER Discord bot. A staff member verifies it in Discord before the link is marked verified.
          This creates a review request only — no bot wallet is read, credited or debited by the website.
        </p>
        {discord.identity.linked ? (
          <div className="discord-link-line">
            <ShieldCheck size={17} />
            <div><b>{discord.identity.username || 'DISCORD CONTRACTOR'}</b><small>{discord.identity.verified ? 'Verified server member' : 'Linked — server verification unavailable'}</small></div>
          </div>
        ) : (
          <div className="discord-warning-inline"><ShieldAlert size={17} /><div><b>DISCORD NOT LINKED</b><small>Connect your account first so staff can match the balance request. Preview mode allows a local test submission.</small></div><button onClick={() => openPage('discord')}>CONNECT ↗</button></div>
        )}
        <form className="link-form" onSubmit={submitLink}>
          <label className="field">
            <span>DISCORD BLACKSITE CREDITS</span>
            <input type="number" min="0" step="1" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="12000" />
          </label>
          <label className="field">
            <span>REFERENCE / STAFF NOTE (OPTIONAL)</span>
            <input maxLength={120} value={note} onChange={event => setNote(event.target.value)} placeholder="Wallet balance shown in #ledger-wallet" />
          </label>
          <button className="btn" type="submit" disabled={busy || sending || amount === ''}>
            {sending ? 'SUBMITTING…' : 'SUBMIT FOR VERIFICATION'} <ArrowUpRight size={15} />
          </button>
        </form>
        {isDemo && <div className="help-block"><LockKeyhole size={17} /><p><b>Preview mode:</b> the request updates this sample session only. Sign into the published Base44 app to create a real staff verification record.</p></div>}
      </section>

      <div className="columns-2 credits-lower">
        <section className="panel">
          <div className="panel-head"><h3>WEB WALLET LEDGER</h3><small>{history.length} TRANSACTIONS</small></div>
          {history.length ? history.slice(0, 12).map(h => (
            <div className="list-line" key={h.id}>
              <span className="list-icon"><History size={16} /></span>
              <div><b>{h.kind}</b><small>{h.reference}</small></div>
              <strong className={Number(h.amount) > 0 ? 'green' : ''}>{Number(h.amount) > 0 ? '+' : ''}{fmt(h.amount)} BC</strong>
            </div>
          )) : <p className="empty">No web transactions yet. Deploy a hull or complete a web contract to start earning.</p>}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>HOW TO EARN WEB CREDITS</h3><Coins size={17} /></div>
          {[
            ['AUTONOMOUS PATROLS', 'Deploy a hull, then settle its patrol returns for passive web credits.', 'galaxy', TrendingUp],
            ['WEB CONTRACTS', 'Accept a blacksite contract and finish its patrol cycles.', 'contracts', ScrollText],
            ['MARKET & ARMORY', 'Trade web credits for ships, mercenary squads, modules and weapons.', 'market', CircleDollarSign],
          ].map(([title, body, page, Icon]) => (
            <button className="earn-row" key={title} onClick={() => openPage(page)}>
              <span className="list-icon"><Icon size={17} /></span>
              <div><b>{title}</b><small>{body}</small></div>
              <ArrowUpRight size={15} />
            </button>
          ))}
          <p className="fineprint"><Clock size={11} /> Patrol income is calculated server-side when you settle. Web credits are not Discord LEDGER credits.</p>
        </section>
      </div>

      <div className="help-block">
        <LockKeyhole size={18} />
        <p><b>No fake wallet bridge:</b> the existing Discord bot keeps its own SQLite balance. Until a secure backend bridge exists, a balance link is a staff-verification record — never a live transfer.</p>
      </div>
    </>
  );
}
