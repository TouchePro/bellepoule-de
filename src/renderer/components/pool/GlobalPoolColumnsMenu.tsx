/**
 * BellePoule Modern - Global Pool Columns Menu
 * Bouton global pour choisir les colonnes affichées dans toutes les poules.
 * Applique le choix à l'ensemble des poules et efface les réglages propres à chaque poule.
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useColumnVisibility, POOL_COLUMNS, ColumnId } from '../../hooks/useColumnVisibility';

interface GlobalPoolColumnsMenuProps {
  isLaserSabre: boolean;
}

const GlobalPoolColumnsMenu: React.FC<GlobalPoolColumnsMenuProps> = ({ isLaserSabre }) => {
  const { visibility, setAllPoolColumns } = useColumnVisibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const columns = POOL_COLUMNS.filter(col => col.id !== 'quest' || isLaserSabre);

  const toggle = (id: ColumnId) => {
    const current = visibility.pool;
    const next = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    setAllPoolColumns(next);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-secondary" onClick={() => setOpen(o => !o)}>
        🧱 Colonnes (toutes les poules)
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.25rem',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
            minWidth: '220px',
            padding: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.5rem',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '0.25rem',
            }}
          >
            Colonnes — appliqué à toutes les poules
          </div>
          {columns.map(col => (
            <label
              key={col.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.5rem',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.8rem',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <input
                type="checkbox"
                checked={visibility.pool.includes(col.id)}
                onChange={() => toggle(col.id)}
                style={{ cursor: 'pointer' }}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalPoolColumnsMenu;
