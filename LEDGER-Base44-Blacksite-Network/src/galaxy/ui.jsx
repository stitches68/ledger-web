import React from 'react';

export const OWNERS = {
  HUMANS: { label: 'SUPER EARTH', color: '#91f71f', short: 'SE' },
  TERMINIDS: { label: 'TERMINIDS', color: '#f5a623', short: 'TER' },
  AUTOMATON: { label: 'AUTOMATONS', color: '#ff5f57', short: 'AUTO' },
  ILLUMINATE: { label: 'ILLUMINATE', color: '#b48cff', short: 'ILL' },
  UNKNOWN: { label: 'UNCLAIMED', color: '#7d9187', short: '???' },
};

export const ownerOf = key => OWNERS[key] || OWNERS.UNKNOWN;
export const fmt = v => Number(v || 0).toLocaleString('en-US');

export function ownerFromName(owner) {
  const value = String(owner || '').toLowerCase();
  if (value.startsWith('human')) return OWNERS.HUMANS;
  if (value.startsWith('terminid')) return OWNERS.TERMINIDS;
  if (value.startsWith('automaton')) return OWNERS.AUTOMATON;
  if (value.startsWith('illuminate')) return OWNERS.ILLUMINATE;
  return OWNERS.UNKNOWN;
}

export function family(category) {
  if (category === 'MEDICAL') return 'MEDICAL';
  if (category === 'CARGO' || category === 'TRANSPORT') return 'LOGISTICS';
  if (['CORVETTE', 'CRUISER', 'BATTLESHIP', 'CARRIER'].includes(category)) return 'CAPITAL';
  if (category === 'STATION') return 'STATION';
  if (category === 'ARMOR' || category === 'MERCENARY') return 'GROUND';
  return 'AIR';
}

export function AssetGlyph({ category, size = 16, className = '' }) {
  const kind = family(category);
  const paths = {
    AIR: <path d="M12 2 21 20 12 16.4 3 20Z" />,
    CAPITAL: <path d="M12 1.5 22 12 12 22.5 2 12ZM12 6.5 17 12 12 17.5 7 12Z" />,
    MEDICAL: <path d="M9.4 2h5.2v7.4H22v5.2h-7.4V22H9.4v-7.4H2V9.4h7.4Z" />,
    LOGISTICS: <path d="M3 6h12v9H3Zm12 3h4l3 4v2h-7ZM6.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
    GROUND: <path d="M3 8h18v9H3Zm2 3h4v3H5Zm5 0h4v3H10Zm5 0h4v3h-4ZM4 19h16v2H4Z" />,
    STATION: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6ZM11 2h2v6h-2Zm0 14h2v6h-2ZM2 11h6v2H2Zm14 0h6v2h-6Z" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`asset-glyph ${className}`} aria-hidden="true" focusable="false">
      <g fill="currentColor">{paths[kind] || paths.AIR}</g>
    </svg>
  );
}

export function ProgressBar({ value, tone = 'green', label }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`gx-track ${tone}`} role="progressbar" aria-valuenow={Math.round(width)} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}

export function StatusPill({ children, tone = 'muted' }) {
  return <span className={`gx-pill ${tone}`}>{children}</span>;
}

export function SectionLabel({ children, right }) {
  return (
    <div className="gx-section-label">
      <span>{children}</span>
      {right}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="gx-empty">
      <span className="gx-empty-mark">⌁</span>
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}
