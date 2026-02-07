import React from 'react';

export default function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="modalBack" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          </div>
          <button className="btn ghost" onClick={onClose}>Tutup</button>
        </div>
        <div className="hr" />
        {children}
        {actions ? <div className="hr" /> : null}
        {actions ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap:'wrap' }}>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
