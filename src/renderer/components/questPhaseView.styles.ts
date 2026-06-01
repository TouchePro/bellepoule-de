/**
 * BellePoule Modern - Styles statiques de QuestPhaseView
 * Constantes au niveau module (références stables) pour les styles répétés.
 * Licensed under GPL-3.0
 */

import type { CSSProperties } from 'react';

export const TH_CENTER: CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'center',
  borderBottom: '2px solid #e5e7eb',
};

export const TH_LEFT: CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  borderBottom: '2px solid #e5e7eb',
};

export const TD_CENTER: CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'center' };

export const CARD: CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

export const CARD_TOP: CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1.25rem',
  marginTop: '1.5rem',
};

export const CARD_TITLE: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  marginBottom: '0.75rem',
};

export const MUTED: CSSProperties = { color: '#6b7280' };
