/**
 * BellePoule Modern - Styles statiques de PoolView
 * Constantes de style définies au niveau module (références stables, pas de
 * recréation à chaque rendu) + fabriques pour les variantes dynamiques.
 * Licensed under GPL-3.0
 */

import type { CSSProperties } from 'react';

// Base commune des boutons de la barre d'outils (fond/couleur fournis à l'usage)
export const TOOLBAR_BTN: CSSProperties = {
  padding: '0.375rem 0.75rem',
  fontSize: '0.75rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

// Base des boutons icône undo/redo (border-radius/cursor variables)
export const ICON_BTN: CSSProperties = {
  padding: '0.375rem 0.6rem',
  fontSize: '0.8rem',
  border: 'none',
  borderRadius: '4px',
};

// Boutons de statut spécial (abandon/forfait/exclusion/annuler)
export const SPECIAL_BTN: CSSProperties = { fontSize: '0.8rem', padding: '0.4rem 0.75rem' };

export const ROW_BETWEEN: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const MATCH_LABEL: CSSProperties = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  opacity: 0.8,
};

export const MATCH_CENTER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flex: 1,
  justifyContent: 'center',
};

export const COL_GAP: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };

export const REF_EMPTY: CSSProperties = {
  color: '#9ca3af',
  fontSize: '0.875rem',
  textAlign: 'center',
};

export const REF_BTN: CSSProperties = { padding: '0.75rem', fontSize: '0.875rem' };

export const FENCER_NAME: CSSProperties = { fontWeight: '600' };

// Conteneur du bloc « prochain match » (le fond varie selon l'état)
export const NEXT_MATCH_BOX: CSSProperties = {
  borderRadius: '8px',
  padding: '1rem',
  marginTop: '1rem',
  color: 'white',
};
