import React from 'react';

export default function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          key={it.value}
          className={value === it.value ? 'tab active' : 'tab'}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
