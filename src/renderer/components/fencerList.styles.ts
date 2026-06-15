/**
 * BellePoule Modern - Styles statiques de FencerList
 * Constantes au niveau module (références stables) pour les styles répétés.
 * Licensed under GPL-3.0
 */

import type { CSSProperties } from 'react';

export const MENU_ITEM: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 16px',
  borderRadius: 0,
};

export const SMALL_BTN: CSSProperties = { fontSize: '0.75rem', padding: '0.25rem 0.5rem' };

export const W250: CSSProperties = { width: '250px' };

export const DROPDOWN_WRAP: CSSProperties = { position: 'relative', display: 'inline-block' };
