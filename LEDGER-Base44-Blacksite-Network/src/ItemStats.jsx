import React from 'react';

const fmt = value => Number(value || 0).toLocaleString('en-US');
const signed = value => `${Number(value) > 0 ? '+' : ''}${fmt(value)}`;

// Renders the distinct operational profile for every purchasable catalog item:
// ships and mercenary squads, ship modules, and mercenary weapons.
export default function ItemStats({ item, kind }) {
  if (!item) return null;

  if (kind === 'weapon') {
    return (
      <div className="item-stats">
        <span><b>DMG</b>{fmt(item.damage)}</span>
        <span><b>RATE</b>{fmt(item.rate)}</span>
        <span><b>UTIL</b>{fmt(item.utility)}</span>
        <span className="item-class">{item.category}</span>
      </div>
    );
  }

  if (kind === 'mod') {
    const effects = [['FIRE', item.firepower], ['HULL', item.hull], ['SHIELD', item.shields], ['SPEED', item.speed], ['YIELD', item.income]]
      .filter(([, value]) => Number(value));
    return (
      <div className="item-stats">
        <span className="item-class">{item.slot}</span>
        {effects.map(([label, value]) => (
          <span key={label} className={Number(value) > 0 ? 'positive' : 'negative'}>
            <b>{label}</b>{signed(value)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="item-stats">
      <span><b>FIRE</b>{fmt(item.firepower)}</span>
      <span><b>HULL</b>{fmt(item.hull)}</span>
      <span><b>SHIELD</b>{fmt(item.shields)}</span>
      <span><b>SPEED</b>{fmt(item.speed)}</span>
      <span><b>YIELD</b>{fmt(item.income)}<i>/30M</i></span>
    </div>
  );
}
