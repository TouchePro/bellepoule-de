/**
 * BellePoule Modern - Styles statiques de LiveDashboard
 * Constantes au niveau module (références stables) pour les styles répétés.
 * Licensed under GPL-3.0
 */

import type { CSSProperties } from 'react';

export const PANEL_TITLE: CSSProperties = {
  color: 'white',
  marginBottom: '1rem',
  fontSize: '1.5rem',
};

export const TABLE: CSSProperties = { width: '100%', borderCollapse: 'collapse' };

export const CELL_CENTER_FLEX: CSSProperties = { textAlign: 'center', flex: 1 };

export const TH: CSSProperties = {
  padding: '1rem',
  textAlign: 'left',
  color: '#374151',
  fontWeight: '600',
};

export const MONO_CELL: CSSProperties = {
  padding: '0.5rem',
  textAlign: 'center',
  fontFamily: 'monospace',
};

export const STAT_VALUE: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#1f2937',
};

export const SUB_TEXT: CSSProperties = { fontSize: '0.875rem', color: '#6b7280' };

export const ROW_TEXT: CSSProperties = {
  fontSize: '0.875rem',
  color: '#1f2937',
  fontWeight: '500',
};
