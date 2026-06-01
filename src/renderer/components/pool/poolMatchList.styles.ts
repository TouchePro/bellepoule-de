/**
 * BellePoule Modern - Styles statiques de PoolMatchList
 * Constantes au niveau module (références stables) pour les styles répétés.
 * Licensed under GPL-3.0
 */

import type { CSSProperties } from 'react';

export const ROW_BETWEEN: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const CELL_CENTER: CSSProperties = { flex: 1, textAlign: 'center' };

export const SUB_TEXT: CSSProperties = { fontSize: '0.875rem', opacity: 0.8 };

export const VS_SEP: CSSProperties = { padding: '0 1rem', fontSize: '1.25rem', fontWeight: '600' };

export const NAME_BIG: CSSProperties = { fontSize: '1.5rem', fontWeight: '700' };

export const COL_GAP: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };

export const NUM_BADGE: CSSProperties = {
  color: '#9ca3af',
  fontSize: '0.875rem',
  minWidth: '30px',
};

export const SECTION_TITLE: CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
  color: '#6b7280',
};
