/**
 * BellePoule Modern - Styles statiques de ImportModal
 * Constantes au niveau module (références stables) pour les styles répétés.
 * Licensed under GPL-3.0
 */

import type { CSSProperties } from 'react';

export const TD: CSSProperties = { padding: '0.5rem' };
export const TD_CENTER: CSSProperties = { padding: '0.5rem', textAlign: 'center' };
export const TD_LEFT: CSSProperties = { padding: '0.5rem', textAlign: 'left' };

export const LIST_INDENT: CSSProperties = { margin: '0.5rem 0 0 1rem', padding: 0 };

export const TABLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

export const STICKY_HEAD: CSSProperties = {
  position: 'sticky',
  top: 0,
  background: 'var(--color-bg)',
};
