import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, RotateCcw, Search, X, Layers, Pause, Play, Crosshair, ChevronDown, Radar } from 'lucide-react';
import { AssetGlyph, OWNERS, fmt, family } from './ui.jsx';

const SIZE = 1000;
const SCALE = 465;
const LAYERS = [
  ['war', 'Galactic War'],
  ['ownership', 'Sector Boundaries'],
  ['campaigns', 'Active Campaigns'],
  ['objectives', 'Major Order'],
  ['supply', 'Supply Lines'],
  ['battles', 'Active Battles'],
  ['fleets', 'Fleet Deployment'],
  ['ground', 'Ground Forces'],
  ['medical', 'Medical Operations'],
  ['logistics', 'Logistics'],
  ['stations', 'Space Stations'],
  ['contracts', 'Contract Objectives'],
];

const project = planet => ({
  x: 500 + (Number(planet.positionX) || 0) * SCALE,
  y: 500 + (Number(planet.positionY) || 0) * SCALE,
});

function hull(points) {
  if (points.length < 3) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function travelPath(from, to) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = 0.18;
  return { d: `M ${from.x} ${from.y} Q ${mx - dy * bend} ${my + dx * bend} ${to.x} ${to.y}`, cx: mx - dy * bend, cy: my + dx * bend };
}

function pointOnQuad(from, control, to, t) {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

export default function GalaxyMap({
  bundle,
  deployments = [],
  selectedPlanetId,
  onSelect,
  paused = false,
  onTogglePause,
  planetActivity = {},
}) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [layers, setLayers] = useState({
    war: true,
    ownership: true,
    campaigns: true,
    objectives: true,
    supply: false,
    battles: true,
    fleets: true,
    ground: true,
    medical: true,
    logistics: true,
    stations: true,
    contracts: false,
  });
  const [layerOpen, setLayerOpen] = useState(false);
  const [faction, setFaction] = useState('ALL');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const drag = useRef(null);
  const dragMoved = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [paused]);

  const planets = bundle?.planets || [];
  const campaigns = useMemo(() => {
    const map = new Map();
    (bundle?.campaigns || []).forEach(c => map.set(c.planetId, c));
    return map;
  }, [bundle]);
  const orderPlanets = useMemo(() => {
    const set = new Set();
    (bundle?.majorOrder?.tasks || []).forEach(t => (t.planetIds || []).forEach(id => set.add(String(id))));
    return set;
  }, [bundle]);

  const visiblePlanets = useMemo(
    () => planets.filter(p => faction === 'ALL' || p.ownerKey === faction),
    [planets, faction],
  );
  const planetLookup = useMemo(() => {
    const map = new Map();
    planets.forEach(p => map.set(p.planetId, p));
    return map;
  }, [planets]);

  const sectors = useMemo(() => {
    const groups = new Map();
    visiblePlanets.forEach(p => {
      if (!groups.has(p.sector)) groups.set(p.sector, []);
      groups.get(p.sector).push(project(p));
    });
    return [...groups.entries()]
      .map(([name, points]) => ({ name, points: hull(points) }))
      .filter(s => s.points.length >= 3);
  }, [visiblePlanets]);

  const supplyLines = useMemo(() => {
    const lines = [];
    visiblePlanets.forEach(p => {
      const a = project(p);
      (p.waypoints || []).forEach(id => {
        const target = planetLookup.get(String(id));
        if (!target) return;
        if (faction !== 'ALL' && target.ownerKey !== faction) return;
        lines.push({ key: `${p.planetId}-${id}`, a, b: project(target), owner: p.ownerKey });
      });
    });
    return lines.slice(0, 260);
  }, [visiblePlanets, planetLookup, faction]);

  const selected = planetLookup.get(String(selectedPlanetId)) || null;
  const selectedProjection = selected ? project(selected) : null;

  const centerOn = useCallback(planet => {
    const p = project(planet);
    const zoom = 2.4;
    setCamera({ zoom, x: 500 - p.x * zoom, y: 500 - p.y * zoom });
  }, []);

  const choosePlanet = useCallback(
    planet => {
      onSelect?.(planet);
      setSearchOpen(false);
      setQuery('');
    },
    [onSelect],
  );

  useEffect(() => {
    if (!selected) return;
    const p = project(selected);
    setCamera(c => ({
      ...c,
      x: 500 - p.x * c.zoom,
      y: 500 - p.y * c.zoom,
    }));
  }, [selected?.planetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomBy = factor => {
    setCamera(c => {
      const zoom = Math.max(0.7, Math.min(7, c.zoom * factor));
      const k = zoom / c.zoom;
      return { zoom, x: 500 - (500 - c.x) * k, y: 500 - (500 - c.y) * k };
    });
  };

  const wheel = useCallback(event => {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const local = point.matrixTransform(matrix.inverse());
    setCamera(c => {
      const next = Math.max(0.7, Math.min(7, c.zoom * Math.pow(1.0018, -event.deltaY)));
      const k = next / c.zoom;
      return { zoom: next, x: local.x - (local.x - c.x) * k, y: local.y - (local.y - c.y) * k };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [wheel]);

  const pointerDown = event => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragMoved.current = false;
    drag.current = { x: event.clientX, y: event.clientY, cam: { ...camera } };
  };
  const pointerMove = event => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved.current = true;
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect || !dragMoved.current) return;
    const unit = SIZE / Math.min(rect.width, rect.height);
    setCamera({ ...drag.current.cam, x: drag.current.cam.x + dx * unit, y: drag.current.cam.y + dy * unit });
  };
  const pointerUp = () => {
    drag.current = null;
  };

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return planets.filter(p => `${p.name} ${p.sector}`.toLowerCase().includes(q)).slice(0, 6);
  }, [query, planets]);

  const activeDeployments = deployments.filter(d => ['ACTIVE', 'IN_TRANSIT', 'DAMAGED'].includes(d.status));
  const fleets = activeDeployments.filter(d => ['AIR', 'CAPITAL'].includes(family(d.category)) && layers.fleets);
  const ground = activeDeployments.filter(d => family(d.category) === 'GROUND' && layers.ground);
  const medical = activeDeployments.filter(d => family(d.category) === 'MEDICAL' && layers.medical);
  const logistics = activeDeployments.filter(d => family(d.category) === 'LOGISTICS' && layers.logistics);
  const stations = activeDeployments.filter(d => family(d.category) === 'STATION' && layers.stations);

  const shipMarkers = [...fleets, ...ground, ...medical, ...logistics, ...stations].map((dep, index) => {
    const planet = planetLookup.get(String(dep.planetId));
    if (!planet) return null;
    const base = project(planet);
    const angle = (index / 6) * Math.PI * 2 + 0.6;
    const radius = dep.status === 'IN_TRANSIT' ? 0 : 15;
    return { dep, planet, x: base.x + Math.cos(angle) * radius, y: base.y + Math.sin(angle) * radius, base };
  }).filter(Boolean);

  const stars = useMemo(() => {
    let seed = 91;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: 110 }, () => ({ x: rand() * 1000, y: rand() * 1000, r: rand() * 1.2 + 0.2, o: rand() * 0.5 + 0.15 }));
  }, []);

  return (
    <div className={`gmap ${paused ? 'is-paused' : ''}`} ref={wrapRef}>
      <div className="gmap-grid" aria-hidden="true" />
      <div className="gmap-radar" aria-hidden="true" />

      <div className="gmap-top">
        <div className="gmap-title">
          <Radar size={15} />
          <span>BLACKSITE NAVIGATION // GALACTIC CHART 09</span>
          <em>{bundle?.freshness === 'LIVE' ? 'COMMUNITY FEED SYNCED' : bundle?.freshness || 'NO TELEMETRY'}</em>
        </div>
        <div className="gmap-search">
          <label>
            <Search size={14} />
            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search planet or sector…"
              aria-label="Search planets"
            />
            {query ? (
              <button onClick={() => { setQuery(''); setSearchOpen(false); }} aria-label="Clear search"><X size={13} /></button>
            ) : null}
          </label>
          {searchOpen && results.length > 0 && (
            <ul className="gmap-results">
              {results.map(p => (
                <li key={p.planetId}>
                  <button onClick={() => { choosePlanet(p); centerOn(p); }}>
                    <span className="dot" style={{ background: OWNERS[p.ownerKey]?.color }} />
                    <b>{p.name}</b>
                    <small>{p.sector}</small>
                    <em>{p.players ? `${fmt(p.players)} DIVERS` : 'NO TELEMETRY'}</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="gmap-filters" role="group" aria-label="Faction filter">
        <button className={faction === 'ALL' ? 'on' : ''} onClick={() => setFaction('ALL')}>ALL SECTORS</button>
        {Object.entries(OWNERS).filter(([key]) => key !== 'UNKNOWN').map(([key, owner]) => (
          <button
            key={key}
            className={faction === key ? 'on' : ''}
            onClick={() => setFaction(key)}
            style={{ '--owner': owner.color }}
          >
            {owner.label}
          </button>
        ))}
      </div>

      <div className="gmap-stage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={pointerUp}>
        <svg
          ref={svgRef}
          className="gmap-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Interactive Helldivers 2 galactic war chart with LEDGER deployments"
        >
          <defs>
            <radialGradient id="galaxy-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#91f71f" stopOpacity="0.16" />
              <stop offset="65%" stopColor="#91f71f" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#91f71f" stopOpacity="0" />
            </radialGradient>
            <filter id="glow-green" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width={SIZE} height={SIZE} fill="#050806" />
          {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#c8e6c0" opacity={s.o} />)}
          <circle cx="500" cy="500" r="430" fill="url(#galaxy-core)" />

          <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
            <g className="gmap-gridlines" opacity="0.5">
              {Array.from({ length: 11 }, (_, i) => (
                <g key={i}>
                  <line x1={i * 100} y1="0" x2={i * 100} y2={SIZE} />
                  <line x1="0" y1={i * 100} x2={SIZE} y2={i * 100} />
                </g>
              ))}
            </g>

            {layers.ownership && (
              <g className="gmap-sectors">
                {sectors.map(sector => (
                  <path
                    key={sector.name}
                    d={`M ${sector.points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`}
                    fill="#8ff05a"
                    fillOpacity="0.025"
                    stroke="#74a25f"
                    strokeOpacity="0.22"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {sectors.map(sector => {
                  const cx = sector.points.reduce((s, p) => s + p.x, 0) / sector.points.length;
                  const cy = sector.points.reduce((s, p) => s + p.y, 0) / sector.points.length;
                  return (
                    <text key={`${sector.name}-label`} x={cx} y={cy} className="gmap-sector-label" style={{ fontSize: 9 / camera.zoom }}>
                      {sector.name.toUpperCase()}
                    </text>
                  );
                })}
              </g>
            )}

            {layers.supply && (
              <g className="gmap-supply">
                {supplyLines.map(line => (
                  <line
                    key={line.key}
                    x1={line.a.x}
                    y1={line.a.y}
                    x2={line.b.x}
                    y2={line.b.y}
                    stroke={OWNERS[line.owner]?.color || '#7d9187'}
                    strokeOpacity="0.2"
                    strokeWidth="0.7"
                    strokeDasharray="3 7"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            )}

            {layers.battles && (
              <g className="gmap-battles">
                {visiblePlanets.filter(p => campaigns.has(p.planetId) || p.event).map(p => {
                  const pos = project(p);
                  return (
                    <circle
                      key={`battle-${p.planetId}`}
                      cx={pos.x}
                      cy={pos.y}
                      r={14}
                      fill="none"
                      stroke={campaigns.has(p.planetId) ? '#ff8a5b' : '#ff5f57'}
                      strokeWidth="1"
                      strokeOpacity="0.55"
                      strokeDasharray="2 5"
                      className="gmap-battle-ring"
                    />
                  );
                })}
              </g>
            )}

            {layers.war && (
              <g className="gmap-planets">
                {visiblePlanets.map(p => {
                  const pos = project(p);
                  const owner = OWNERS[p.ownerKey] || OWNERS.UNKNOWN;
                  const isSelected = p.planetId === String(selectedPlanetId);
                  const radius = 2.1 + Math.min(3.4, Math.sqrt(p.players || 0) / 38);
                  const showLabel =
                    isSelected ||
                    hover?.planetId === p.planetId ||
                    (layers.objectives && orderPlanets.has(p.planetId)) ||
                    (layers.campaigns && campaigns.has(p.planetId) && camera.zoom > 1.15) ||
                    (camera.zoom > 1.9 && (p.players || 0) > 500);
                  return (
                    <g key={p.planetId} className={`gmap-planet ${isSelected ? 'selected' : ''}`}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={radius + 4.5}
                        fill="transparent"
                        onMouseEnter={e => {
                          const rect = wrapRef.current?.getBoundingClientRect();
                          setHover({
                            planetId: p.planetId,
                            name: p.name,
                            sector: p.sector,
                            owner: owner.label,
                            color: owner.color,
                            players: p.players,
                            liberation: p.liberation,
                            humans: p.humans,
                            x: rect ? e.clientX - rect.left : 0,
                            y: rect ? e.clientY - rect.top : 0,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                        onClick={e => { e.stopPropagation(); if (!dragMoved.current) choosePlanet(p); }}
                        style={{ cursor: 'pointer' }}
                      />
                      {isSelected && <circle cx={pos.x} cy={pos.y} r={radius + 9} fill="none" stroke="#d9ffb5" strokeWidth="1" strokeDasharray="2 4" />}
                      {layers.campaigns && campaigns.has(p.planetId) && (
                        <circle cx={pos.x} cy={pos.y} r={radius + 3.4} fill="none" stroke={owner.color} strokeOpacity="0.55" strokeWidth="0.9" />
                      )}
                      <circle cx={pos.x} cy={pos.y} r={radius} fill={owner.color} fillOpacity={p.humans ? 0.95 : 0.9} stroke="#04120a" strokeWidth="0.8" />
                      {layers.battles && p.event && <circle cx={pos.x} cy={pos.y} r={radius + 6} className="gmap-event-ring" fill="none" stroke="#ff5f57" strokeWidth="1.1" />}
                      {layers.objectives && orderPlanets.has(p.planetId) && (
                        <path
                          d={`M ${pos.x} ${pos.y - 15} l 4 6 -4 6 -4 -6 Z`}
                          fill="#ffd166"
                          stroke="#20180a"
                          strokeWidth="0.6"
                        />
                      )}
                      {layers.contracts && ((Number(p.hash) || 0) % 5 === 0) && (
                        <rect x={pos.x + 6} y={pos.y - 11} width="4" height="4" fill="#91f71f" transform={`rotate(45 ${pos.x + 8} ${pos.y - 9})`} />
                      )}
                      {showLabel && (
                        <text x={pos.x} y={pos.y - radius - 6} className="gmap-planet-label" style={{ fontSize: 8.5 / camera.zoom }}>
                          {p.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {bundle?.station && layers.stations && (() => {
              const p = planetLookup.get(String(bundle.station.planetId));
              if (!p) return null;
              const pos = project(p);
              return (
                <g className="gmap-dss">
                  <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="#8fd8ff" strokeOpacity="0.65" strokeDasharray="3 5" />
                  <circle cx={pos.x} cy={pos.y} r="5" fill="#8fd8ff" filter="url(#glow-green)" />
                  <text x={pos.x} y={pos.y + 34} className="gmap-dss-label" style={{ fontSize: 8 / camera.zoom }}>DSS // DEMOCRACY SPACE STATION</text>
                </g>
              );
            })()}

            {shipMarkers.map(({ dep, x, y, base }) => {
              const isTransit = dep.status === 'IN_TRANSIT';
              const from = { x: 500, y: 500 };
              const path = isTransit ? travelPath(from, base) : null;
              const total = Math.max(1, Date.parse(dep.arrivesAt) - Date.parse(dep.departedAt));
              const progress = Math.max(0, Math.min(1, (Date.now() - Date.parse(dep.departedAt)) / total));
              const moving = path ? pointOnQuad(from, { x: path.cx, y: path.cy }, base, progress) : null;
              return (
                <g key={dep.id} className={`gmap-fleet ${dep.status.toLowerCase()}`}>
                  {path && (
                    <path
                      d={path.d}
                      fill="none"
                      stroke="#91f71f"
                      strokeOpacity="0.4"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {isTransit && moving ? (
                    <g transform={`translate(${moving.x} ${moving.y})`}>
                      <circle r="8" fill="#0c1a0d" stroke="#91f71f" strokeWidth="1" />
                      <g transform="translate(-5 -5) scale(0.42)" color="#b8ff86"><AssetGlyph category={dep.category} size={24} /></g>
                      <circle r="12" fill="none" stroke="#91f71f" strokeOpacity="0.35" className="gmap-ping" />
                    </g>
                  ) : (
                    <g transform={`translate(${x} ${y})`}>
                      <circle r="9" fill="#0a130b" stroke="#91f71f" strokeWidth="1" />
                      <g transform="translate(-5.5 -5.5)" color="#b8ff86"><AssetGlyph category={dep.category} size={11} /></g>
                      {camera.zoom > 1.3 && (
                        <text x="13" y="3" className="gmap-fleet-label" style={{ fontSize: 7.5 / camera.zoom }}>{dep.assetName}</text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            {selectedProjection && (
              <g className="gmap-crosshair" transform={`translate(${selectedProjection.x} ${selectedProjection.y})`}>
                <line x1="-26" y1="0" x2="-12" y2="0" stroke="#91f71f" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <line x1="12" y1="0" x2="26" y2="0" stroke="#91f71f" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="-26" x2="0" y2="-12" stroke="#91f71f" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="12" x2="0" y2="26" stroke="#91f71f" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </g>
            )}
          </g>
        </svg>

        {hover && (
          <div className="gmap-tooltip" style={{ left: Math.min(hover.x + 16, (wrapRef.current?.clientWidth || 600) - 210), top: Math.max(8, hover.y - 60) }}>
            <div className="gmap-tooltip-head">
              <span className="dot" style={{ background: hover.color }} />
              <b>{hover.name}</b>
              <em>{hover.sector}</em>
            </div>
            <div className="gmap-tooltip-grid">
              <span>OWNER</span><b>{hover.owner}</b>
              <span>DIVERS</span><b>{hover.players ? fmt(hover.players) : '—'}</b>
              <span>{hover.humans ? 'DEFENSE' : 'LIBERATION'}</span><b>{hover.liberation.toFixed(1)}%</b>
            </div>
          </div>
        )}

        {!planets.length && (
          <div className="gmap-nofeed">
            <b>NO PLANETARY TELEMETRY</b>
            <p>The community war feed did not answer. The chart will populate when the feed returns — no placeholder planets are shown.</p>
          </div>
        )}
      </div>

      <div className="gmap-legend">
        {Object.entries(OWNERS).filter(([key]) => key !== 'UNKNOWN').map(([key, owner]) => (
          <span key={key}><i style={{ background: owner.color }} />{owner.short}</span>
        ))}
        <span className="legend-sep" />
        <span><AssetGlyph category="CORVETTE" size={12} /> FLEET</span>
        <span><AssetGlyph category="ARMOR" size={12} /> GROUND</span>
        <span><AssetGlyph category="MEDICAL" size={12} /> MEDICAL</span>
        <span><AssetGlyph category="CARGO" size={12} /> LOGISTICS</span>
      </div>

      <div className="gmap-tools">
        <button onClick={() => setLayerOpen(open => !open)} className={layerOpen ? 'on' : ''} aria-expanded={layerOpen}>
          <Layers size={15} /> LAYERS
        </button>
        {layerOpen && (
          <div className="gmap-layerpanel">
            <div className="layerpanel-head"><b>TOGGLE LAYERS</b><button onClick={() => setLayerOpen(false)} aria-label="Close layers"><X size={13} /></button></div>
            {LAYERS.map(([key, label]) => (
              <label key={key} className="layer-row">
                <input type="checkbox" checked={!!layers[key]} onChange={e => setLayers(prev => ({ ...prev, [key]: e.target.checked }))} />
                <span className={`layer-switch ${layers[key] ? 'on' : ''}`} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
        {onTogglePause && (
          <button onClick={onTogglePause} title={paused ? 'Resume tactical animation' : 'Pause tactical animation'}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        )}
        <button onClick={() => centerOn(selected || { positionX: 0, positionY: 0 })} title="Center on selection"><Crosshair size={15} /></button>
        <div className="gmap-zoom">
          <button onClick={() => zoomBy(1.35)} aria-label="Zoom in"><Plus size={15} /></button>
          <button onClick={() => zoomBy(0.74)} aria-label="Zoom out"><Minus size={15} /></button>
          <button onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })} aria-label="Reset view"><RotateCcw size={14} /></button>
        </div>
        <span className="gmap-zoom-readout">{camera.zoom.toFixed(2)}×</span>
      </div>

      <div className="gmap-foot">
        <span>SOURCE: {bundle?.source || 'UNAVAILABLE'} // {bundle?.transport === 'DIRECT_COMMUNITY_READ' ? 'DIRECT READ' : 'SERVER CACHE'}</span>
        <span>{bundle?.capturedAt ? `SYNC ${new Date(bundle.capturedAt).toISOString().slice(11, 19)} UTC` : 'NO SYNC'}</span>
        <span>POSITIONS FROM THE COMMUNITY FEED — NOT OFFICIAL ARROWHEAD DATA</span>
        {bundle?.majorOrder && <span className="gmap-mo">MAJOR ORDER ACTIVE <ChevronDown size={11} /></span>}
      </div>
      <span className="sr-only" aria-live="polite">{tick % 30 === 0 ? 'Tactical clock updating' : ''}</span>
    </div>
  );
}
