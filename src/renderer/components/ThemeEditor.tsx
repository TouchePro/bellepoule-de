/**
 * BellePoule Modern - Éditeur de thème arène
 * Permet de créer, sauvegarder, importer et exporter des thèmes visuels personnalisés
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { CustomTheme, ThemeTargetType } from '../../shared/types/remote';

// ──────────────────────────────────────────────────────────────────────────────
// Valeurs par défaut (thème dark)
// ──────────────────────────────────────────────────────────────────────────────
const DARK_DEFAULTS: Record<string, string> = {
  '--bg': 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
  '--text': '#ffffff',
  '--header-bg': 'rgba(0,0,0,0.4)',
  '--match-bg': 'rgba(255,255,255,0.95)',
  '--fencer-name-color': '#1f2937',
  '--fencer-club-color': '#6b7280',
  '--green-side-bg': 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  '--green-side-border': '#16a34a',
  '--red-side-bg': 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
  '--red-side-border': '#dc2626',
  '--score-bg': '#0c0c09',
  '--score-green': '#00e640',
  '--score-green-glow': 'rgba(0,230,64,0.65), rgba(0,230,64,0.3)',
  '--score-red': '#ff2200',
  '--score-red-glow': 'rgba(255,34,0,0.65), rgba(255,34,0,0.3)',
  '--timer-bg': '#0a0800',
  '--timer-color': '#ffaa00',
  '--timer-glow': 'rgba(255,170,0,0.9), rgba(255,170,0,0.45)',
  '--timer-border': 'rgba(255,170,0,0.18)',
  '--timer-run-color': '#00e640',
  '--timer-run-glow': 'rgba(0,230,64,0.95), rgba(0,230,64,0.5)',
  '--timer-run-border': 'rgba(0,230,64,0.5)',
  '--waiting-color': '#ffffff',
  '--idle-number-color': 'rgba(255,255,255,0.9)',
  '--idle-label-color': 'rgba(255,255,255,0.5)',
  '--score-font-size': 'clamp(7rem, 23vw, 44vh)',
  '--timer-font-size': 'clamp(3.5rem, 11vw, 18vh)',
  '--fencer-name-font-size': 'clamp(1rem, 3.5vw, 5vh)',
  '--score-font-family': 'monospace',
  '--timer-font-family': 'monospace',
  '--fencer-name-font-family': 'system-ui, sans-serif',
  '--vs-color': '#ef4444',
  '--vs-font-family': 'system-ui, sans-serif',
  // Visibilité
  '--header-display': 'flex',
  '--vs-divider-display': 'flex',
  '--timer-label-display': 'none',
  // Positionnement overlay
  '--timer-section-position': 'relative',
  '--timer-section-top': 'auto',
  '--timer-section-left': 'auto',
  '--timer-section-right': 'auto',
  '--timer-section-bottom': 'auto',
  '--timer-section-width': 'auto',
  '--timer-section-transform': 'none',
  '--timer-section-z-index': '1',
  '--score-a-position': 'relative',
  '--score-a-top': 'auto',
  '--score-a-left': 'auto',
  '--score-a-right': 'auto',
  '--score-a-bottom': 'auto',
  '--score-a-transform': 'none',
  '--score-b-position': 'relative',
  '--score-b-top': 'auto',
  '--score-b-left': 'auto',
  '--score-b-right': 'auto',
  '--score-b-bottom': 'auto',
  '--score-b-transform': 'none',
  '--name-a-position': 'relative',
  '--name-a-top': 'auto',
  '--name-a-left': 'auto',
  '--name-a-right': 'auto',
  '--name-a-width': 'auto',
  '--name-a-transform': 'none',
  '--name-b-position': 'relative',
  '--name-b-top': 'auto',
  '--name-b-left': 'auto',
  '--name-b-right': 'auto',
  '--name-b-width': 'auto',
  '--name-b-transform': 'none',
};

// ──────────────────────────────────────────────────────────────────────────────
// Groupes de variables
// ──────────────────────────────────────────────────────────────────────────────
interface VarDef {
  key: string;
  /** Clé i18n du libellé (résolue via t() au rendu) */
  labelKey: string;
  /** color → color-picker + text; text → texte libre; size → presets de taille; font → menu déroulant police */
  type: 'color' | 'text' | 'size' | 'font';
}

interface VarGroup {
  labelKey: string;
  vars: VarDef[];
}

const VAR_GROUPS: VarGroup[] = [
  {
    labelKey: 'theme.group_backgrounds',
    vars: [
      { key: '--bg',         labelKey: 'theme.var_bg_general',  type: 'text'  },
      { key: '--header-bg',  labelKey: 'theme.var_bg_header',   type: 'text'  },
      { key: '--match-bg',   labelKey: 'theme.var_bg_match',    type: 'text'  },
      { key: '--score-bg',   labelKey: 'theme.var_bg_score',    type: 'text'  },
      { key: '--timer-bg',   labelKey: 'theme.var_bg_timer',    type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_texts',
    vars: [
      { key: '--text',               labelKey: 'theme.var_text_main',       type: 'color' },
      { key: '--fencer-name-color',  labelKey: 'theme.var_fencer_name',     type: 'color' },
      { key: '--fencer-club-color',  labelKey: 'theme.var_fencer_club',     type: 'color' },
      { key: '--waiting-color',      labelKey: 'theme.var_waiting_screen',  type: 'color' },
      { key: '--idle-number-color',  labelKey: 'theme.var_arena_number',    type: 'text'  },
      { key: '--idle-label-color',   labelKey: 'theme.var_arena_label',     type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_left_green',
    vars: [
      { key: '--green-side-bg',     labelKey: 'theme.var_bg',           type: 'text'  },
      { key: '--green-side-border', labelKey: 'theme.var_border',       type: 'color' },
      { key: '--score-green',       labelKey: 'theme.var_score_color',  type: 'color' },
      { key: '--score-green-glow',  labelKey: 'theme.var_score_glow',   type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_right_red',
    vars: [
      { key: '--red-side-bg',     labelKey: 'theme.var_bg',           type: 'text'  },
      { key: '--red-side-border', labelKey: 'theme.var_border',       type: 'color' },
      { key: '--score-red',       labelKey: 'theme.var_score_color',  type: 'color' },
      { key: '--score-red-glow',  labelKey: 'theme.var_score_glow',   type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_timer',
    vars: [
      { key: '--timer-color',      labelKey: 'theme.var_timer_color_stopped',  type: 'color' },
      { key: '--timer-glow',       labelKey: 'theme.var_timer_glow_stopped',   type: 'text'  },
      { key: '--timer-border',     labelKey: 'theme.var_timer_border_stopped', type: 'text'  },
      { key: '--timer-run-color',  labelKey: 'theme.var_timer_color_running',  type: 'color' },
      { key: '--timer-run-glow',   labelKey: 'theme.var_timer_glow_running',   type: 'text'  },
      { key: '--timer-run-border', labelKey: 'theme.var_timer_border_running', type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_layout',
    vars: [
      { key: '--score-font-size',       labelKey: 'theme.var_score_size',   type: 'size' },
      { key: '--timer-font-size',       labelKey: 'theme.var_timer_size',   type: 'size' },
      { key: '--fencer-name-font-size', labelKey: 'theme.var_name_size',    type: 'size' },
      { key: '--score-font-family',       labelKey: 'theme.var_score_font', type: 'font' },
      { key: '--timer-font-family',       labelKey: 'theme.var_timer_font', type: 'font' },
      { key: '--fencer-name-font-family', labelKey: 'theme.var_name_font',  type: 'font' },
      { key: '--vs-color',                labelKey: 'theme.var_vs_color',   type: 'color' },
      { key: '--vs-font-family',          labelKey: 'theme.var_vs_font',    type: 'font' },
    ],
  },
  {
    labelKey: 'theme.group_positioning',
    vars: [
      { key: '--header-display',          labelKey: 'theme.var_pos_header_display',      type: 'text' },
      { key: '--vs-divider-display',      labelKey: 'theme.var_pos_vs_display',          type: 'text' },
      { key: '--timer-label-display',     labelKey: 'theme.var_pos_timer_label_display', type: 'text' },
      { key: '--timer-section-position',  labelKey: 'theme.var_pos_timer_position',      type: 'text' },
      { key: '--timer-section-top',       labelKey: 'theme.var_pos_timer_top',           type: 'text' },
      { key: '--timer-section-left',      labelKey: 'theme.var_pos_timer_left',          type: 'text' },
      { key: '--timer-section-right',     labelKey: 'theme.var_pos_timer_right',         type: 'text' },
      { key: '--timer-section-bottom',    labelKey: 'theme.var_pos_timer_bottom',        type: 'text' },
      { key: '--timer-section-width',     labelKey: 'theme.var_pos_timer_width',         type: 'text' },
      { key: '--timer-section-transform', labelKey: 'theme.var_pos_timer_transform',     type: 'text' },
      { key: '--score-a-position',        labelKey: 'theme.var_pos_score_l_position',    type: 'text' },
      { key: '--score-a-top',             labelKey: 'theme.var_pos_score_l_top',         type: 'text' },
      { key: '--score-a-left',            labelKey: 'theme.var_pos_score_l_left',        type: 'text' },
      { key: '--score-a-right',           labelKey: 'theme.var_pos_score_l_right',       type: 'text' },
      { key: '--score-a-bottom',          labelKey: 'theme.var_pos_score_l_bottom',      type: 'text' },
      { key: '--score-a-transform',       labelKey: 'theme.var_pos_score_l_transform',   type: 'text' },
      { key: '--score-b-position',        labelKey: 'theme.var_pos_score_r_position',    type: 'text' },
      { key: '--score-b-top',             labelKey: 'theme.var_pos_score_r_top',         type: 'text' },
      { key: '--score-b-left',            labelKey: 'theme.var_pos_score_r_left',        type: 'text' },
      { key: '--score-b-right',           labelKey: 'theme.var_pos_score_r_right',       type: 'text' },
      { key: '--score-b-bottom',          labelKey: 'theme.var_pos_score_r_bottom',      type: 'text' },
      { key: '--score-b-transform',       labelKey: 'theme.var_pos_score_r_transform',   type: 'text' },
      { key: '--name-a-position',         labelKey: 'theme.var_pos_name_l_position',     type: 'text' },
      { key: '--name-a-top',              labelKey: 'theme.var_pos_name_l_top',          type: 'text' },
      { key: '--name-a-left',             labelKey: 'theme.var_pos_name_l_left',         type: 'text' },
      { key: '--name-a-right',            labelKey: 'theme.var_pos_name_l_right',        type: 'text' },
      { key: '--name-a-width',            labelKey: 'theme.var_pos_name_l_width',        type: 'text' },
      { key: '--name-a-transform',        labelKey: 'theme.var_pos_name_l_transform',    type: 'text' },
      { key: '--name-b-position',         labelKey: 'theme.var_pos_name_r_position',     type: 'text' },
      { key: '--name-b-top',              labelKey: 'theme.var_pos_name_r_top',          type: 'text' },
      { key: '--name-b-left',             labelKey: 'theme.var_pos_name_r_left',         type: 'text' },
      { key: '--name-b-right',            labelKey: 'theme.var_pos_name_r_right',        type: 'text' },
      { key: '--name-b-width',            labelKey: 'theme.var_pos_name_r_width',        type: 'text' },
      { key: '--name-b-transform',        labelKey: 'theme.var_pos_name_r_transform',    type: 'text' },
    ],
  },
];

interface SizePreset {
  labelKey: string;
  value: string;
}

const SIZE_PRESETS: Record<string, SizePreset[]> = {
  '--score-font-size': [
    { labelKey: 'theme.size_small',  value: 'clamp(4rem, 14vw, 28vh)' },
    { labelKey: 'theme.size_normal', value: 'clamp(7rem, 23vw, 44vh)' },
    { labelKey: 'theme.size_large',  value: 'clamp(9rem, 29vw, 55vh)' },
    { labelKey: 'theme.size_xlarge', value: 'clamp(11rem, 35vw, 66vh)' },
  ],
  '--timer-font-size': [
    { labelKey: 'theme.size_small',  value: 'clamp(2rem, 6vw, 10vh)' },
    { labelKey: 'theme.size_normal', value: 'clamp(3.5rem, 11vw, 18vh)' },
    { labelKey: 'theme.size_large',  value: 'clamp(4.5rem, 14vw, 24vh)' },
    { labelKey: 'theme.size_xlarge', value: 'clamp(6rem, 18vw, 30vh)' },
  ],
  '--fencer-name-font-size': [
    { labelKey: 'theme.size_small',  value: 'clamp(0.7rem, 2vw, 3vh)' },
    { labelKey: 'theme.size_normal', value: 'clamp(1rem, 3.5vw, 5vh)' },
    { labelKey: 'theme.size_large',  value: 'clamp(1.4rem, 5vw, 7vh)' },
    { labelKey: 'theme.size_xlarge', value: 'clamp(1.8rem, 6.5vw, 9vh)' },
  ],
};

const FONT_OPTIONS: { label: string; value: string; labelKey?: string }[] = [
  { label: 'Monospace', labelKey: 'theme.font_monospace_default', value: 'monospace' },
  { label: 'Courier New',          value: '"Courier New", monospace' },
  { label: 'System UI',            value: 'system-ui, sans-serif' },
  { label: 'Arial',                value: 'Arial, sans-serif' },
  { label: 'Verdana',              value: 'Verdana, sans-serif' },
  { label: 'Impact',               value: 'Impact, fantasy' },
  { label: 'Georgia',              value: 'Georgia, serif' },
  { label: 'Trebuchet MS',         value: '"Trebuchet MS", sans-serif' },
  { label: 'Lucida Console',       value: '"Lucida Console", monospace' },
];

// Preset de variables pour le mode Overlay — arène
const OVERLAY_PRESET: Record<string, string> = {
  '--match-bg':          'transparent',
  '--score-bg':          'transparent',
  '--timer-bg':          'rgba(0, 0, 0, 0.55)',
  '--green-side-bg':     'rgba(0, 28, 14, 0.50)',
  '--red-side-bg':       'rgba(58, 0, 28, 0.50)',
  '--fencer-name-color': '#ffffff',
  '--fencer-club-color': 'rgba(255, 230, 255, 0.85)',
};

// Preset de variables pour le mode Overlay — kiosque
const KIOSK_OVERLAY_PRESET: Record<string, string> = {
  '--k-card-bg': 'rgba(0, 0, 0, 0.52)',
  '--k-border':  'rgba(255, 255, 255, 0.18)',
};

// Canvas virtuel pour le preview scalé (résolution de référence 16:9)
const VIRTUAL_W = 1280;
const VIRTUAL_H = 720;

// Compat shim : utilisé par RemoteScoreManager (migré vers IPC)
const STORAGE_KEY = 'bellepoule-custom-themes';
function loadSavedThemes(): CustomTheme[] { return []; }
function saveSavedThemes(_themes: CustomTheme[]): void { /* no-op */ }

// ──────────────────────────────────────────────────────────────────────────────
// Variables et defaults Arbitre (tablette)
// ──────────────────────────────────────────────────────────────────────────────
const REFEREE_DEFAULTS: Record<string, string> = {
  '--ref-bg':         'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
  '--ref-header-bg':  'rgba(0, 0, 0, 0.3)',
  '--ref-accent':     '#3b82f6',
  '--ref-accent2':    '#f59e0b',
  '--ref-text':       '#ffffff',
  '--ref-muted':      'rgba(255,255,255,0.6)',
  '--ref-card-bg':    'rgba(255, 255, 255, 0.05)',
  '--ref-border':     'rgba(255, 255, 255, 0.1)',
};

const REFEREE_VAR_GROUPS: VarGroup[] = [
  {
    labelKey: 'theme.group_referee_bg',
    vars: [
      { key: '--ref-bg',        labelKey: 'theme.var_bg_page',    type: 'text'  },
      { key: '--ref-header-bg', labelKey: 'theme.var_bg_header',  type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_referee_colors',
    vars: [
      { key: '--ref-accent',  labelKey: 'theme.var_accent1',     type: 'color' },
      { key: '--ref-accent2', labelKey: 'theme.var_accent2',     type: 'color' },
      { key: '--ref-text',    labelKey: 'theme.var_text_main',   type: 'color' },
      { key: '--ref-muted',   labelKey: 'theme.var_text_muted',  type: 'color' },
    ],
  },
  {
    labelKey: 'theme.group_referee_cards',
    vars: [
      { key: '--ref-card-bg', labelKey: 'theme.var_bg_cards',  type: 'text'  },
      { key: '--ref-border',  labelKey: 'theme.var_border',    type: 'text'  },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Variables et defaults Affichage poule
// ──────────────────────────────────────────────────────────────────────────────
const POOL_DEFAULTS: Record<string, string> = {
  '--pool-bg':         '#1a1a2e',
  '--pool-header-bg':  'rgba(0, 0, 0, 0.5)',
  '--pool-accent':     '#6366f1',
  '--pool-accent2':    '#3b82f6',
  '--pool-text':       '#ffffff',
  '--pool-muted':      '#64748b',
  '--pool-card-bg':    'rgba(255, 255, 255, 0.04)',
  '--pool-border':     'rgba(255, 255, 255, 0.08)',
};

const POOL_VAR_GROUPS: VarGroup[] = [
  {
    labelKey: 'theme.group_pool_bg',
    vars: [
      { key: '--pool-bg',        labelKey: 'theme.var_bg_page',    type: 'text'  },
      { key: '--pool-header-bg', labelKey: 'theme.var_bg_header',  type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_pool_colors',
    vars: [
      { key: '--pool-accent',  labelKey: 'theme.var_accent1',     type: 'color' },
      { key: '--pool-accent2', labelKey: 'theme.var_accent2',     type: 'color' },
      { key: '--pool-text',    labelKey: 'theme.var_text_main',   type: 'color' },
      { key: '--pool-muted',   labelKey: 'theme.var_text_muted',  type: 'color' },
    ],
  },
  {
    labelKey: 'theme.group_pool_cards',
    vars: [
      { key: '--pool-card-bg', labelKey: 'theme.var_bg_cards',  type: 'text'  },
      { key: '--pool-border',  labelKey: 'theme.var_border',    type: 'text'  },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Variables et defaults Public
// ──────────────────────────────────────────────────────────────────────────────
const PUBLIC_DEFAULTS: Record<string, string> = {
  '--pub-bg':         'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
  '--pub-header-bg':  'rgba(0, 0, 0, 0.4)',
  '--pub-accent':     '#fbbf24',
  '--pub-accent2':    '#3b82f6',
  '--pub-text':       '#ffffff',
  '--pub-muted':      'rgba(255,255,255,0.6)',
  '--pub-card-bg':    'rgba(255, 255, 255, 0.05)',
  '--pub-border':     'rgba(255, 255, 255, 0.1)',
};

const PUBLIC_VAR_GROUPS: VarGroup[] = [
  {
    labelKey: 'theme.group_public_bg',
    vars: [
      { key: '--pub-bg',        labelKey: 'theme.var_bg_page',    type: 'text'  },
      { key: '--pub-header-bg', labelKey: 'theme.var_bg_header',  type: 'text'  },
    ],
  },
  {
    labelKey: 'theme.group_public_colors',
    vars: [
      { key: '--pub-accent',  labelKey: 'theme.var_accent1',     type: 'color' },
      { key: '--pub-accent2', labelKey: 'theme.var_accent2',     type: 'color' },
      { key: '--pub-text',    labelKey: 'theme.var_text_main',   type: 'color' },
      { key: '--pub-muted',   labelKey: 'theme.var_text_muted',  type: 'color' },
    ],
  },
  {
    labelKey: 'theme.group_public_cards',
    vars: [
      { key: '--pub-card-bg', labelKey: 'theme.var_bg_cards',  type: 'text'  },
      { key: '--pub-border',  labelKey: 'theme.var_border',    type: 'text'  },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Variables et defaults Kiosk
// ──────────────────────────────────────────────────────────────────────────────
const KIOSK_DEFAULTS: Record<string, string> = {
  '--k-bg':       '#0f172a',
  '--k-accent':   '#fbbf24',
  '--k-accent2':  '#3b82f6',
  '--k-card-bg':  'rgba(255, 255, 255, 0.04)',
  '--k-border':   'rgba(255, 255, 255, 0.08)',
  '--k-muted':    '#64748b',
  '--k-progress': 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
};

const KIOSK_VAR_GROUPS: VarGroup[] = [
  {
    labelKey: 'theme.group_kiosk',
    vars: [
      { key: '--k-bg',       labelKey: 'theme.var_bg',                 type: 'text'  },
      { key: '--k-accent',   labelKey: 'theme.var_accent',             type: 'color' },
      { key: '--k-accent2',  labelKey: 'theme.var_interactive_color',  type: 'color' },
      { key: '--k-card-bg',  labelKey: 'theme.var_bg_cards',           type: 'text'  },
      { key: '--k-border',   labelKey: 'theme.var_border',             type: 'text'  },
      { key: '--k-muted',    labelKey: 'theme.var_text_muted',         type: 'color' },
      { key: '--k-progress', labelKey: 'theme.var_progress_bar',       type: 'text'  },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────
interface ThemeEditorProps {
  /** Arène cible (ex: 'arena1') ou 'all' pour toutes les arènes */
  targetArenaId: string;
  /** Section cible : 'arena' (défaut), 'kiosk', 'public', 'referee', 'pool' */
  targetType?: ThemeTargetType;
  /** Thème initial à éditer (undefined = nouveau thème depuis dark) */
  initialTheme?: CustomTheme;
  /** Callback quand l'utilisateur applique le thème */
  onApply: (arenaId: string, theme: CustomTheme) => void;
  onClose: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Composant
// ──────────────────────────────────────────────────────────────────────────────
const ThemeEditor: React.FC<ThemeEditorProps> = ({
  targetArenaId,
  targetType = 'arena',
  initialTheme,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const instanceId = useId();
  const effectiveType = (targetType ?? 'arena') as ThemeTargetType;
  const isKiosk = effectiveType === 'kiosk';
  const activeDefaults =
    effectiveType === 'kiosk'    ? KIOSK_DEFAULTS :
    effectiveType === 'referee'  ? REFEREE_DEFAULTS :
    effectiveType === 'pool'     ? POOL_DEFAULTS :
    effectiveType === 'public'   ? PUBLIC_DEFAULTS :
    DARK_DEFAULTS;
  const activeVarGroups =
    effectiveType === 'kiosk'    ? KIOSK_VAR_GROUPS :
    effectiveType === 'referee'  ? REFEREE_VAR_GROUPS :
    effectiveType === 'pool'     ? POOL_VAR_GROUPS :
    effectiveType === 'public'   ? PUBLIC_VAR_GROUPS :
    VAR_GROUPS;
  const defaultName =
    effectiveType === 'kiosk'   ? t('theme.default_name_kiosk') :
    effectiveType === 'referee' ? t('theme.default_name_referee') :
    effectiveType === 'pool'    ? t('theme.default_name_pool') :
    effectiveType === 'public'  ? t('theme.default_name_public') :
    t('theme.default_name');

  const [themeName, setThemeName] = useState(initialTheme?.name ?? defaultName);
  const [vars, setVars] = useState<Record<string, string>>(() => ({
    ...activeDefaults,
    ...(initialTheme?.variables ?? {}),
  }));
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>([]);
  const [activeGroup, setActiveGroup] = useState(0);

  // Charger les thèmes depuis l'app (filtrés par type)
  useEffect(() => {
    window.electronAPI.themes.list().then(all => {
      setSavedThemes(all.filter(t => (t.targetType ?? 'arena') === effectiveType));
    }).catch(() => {});
  }, [effectiveType]);
  const [importError, setImportError] = useState('');
  const [overlayMode, setOverlayMode] = useState(initialTheme?.overlayMode ?? false);
  const previewStyleId = `theme-preview-${instanceId.replace(/:/g, '')}`;

  // Canvas virtuel scalé pour le preview
  const previewOuterRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.3);

  const updatePreviewStyle = useCallback((variables: Record<string, string>) => {
    let styleEl = document.getElementById(previewStyleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = previewStyleId;
      document.head.appendChild(styleEl);
    }
    const cssVars = Object.entries(variables)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    styleEl.textContent = `.theme-preview-scope-${previewStyleId} {\n${cssVars}\n}`;
  }, [previewStyleId]);

  useEffect(() => {
    updatePreviewStyle(vars);
    return () => {
      document.getElementById(previewStyleId)?.remove();
    };
  }, [vars, updatePreviewStyle, previewStyleId]);

  useEffect(() => {
    const el = previewOuterRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setPreviewScale(entry.contentRect.width / VIRTUAL_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setVar = (key: string, value: string) => {
    setVars(prev => ({ ...prev, [key]: value }));
  };

  const handleOverlayToggle = (enabled: boolean) => {
    setOverlayMode(enabled);
    if (isKiosk) {
      if (enabled) {
        setVars(prev => ({ ...prev, ...KIOSK_OVERLAY_PRESET }));
      } else {
        setVars(prev => ({
          ...prev,
          '--k-card-bg': KIOSK_DEFAULTS['--k-card-bg'],
          '--k-border':  KIOSK_DEFAULTS['--k-border'],
        }));
      }
    } else {
      if (enabled) {
        setVars(prev => ({ ...prev, ...OVERLAY_PRESET }));
      } else {
        setVars(prev => ({
          ...prev,
          '--match-bg':          DARK_DEFAULTS['--match-bg'],
          '--score-bg':          DARK_DEFAULTS['--score-bg'],
          '--timer-bg':          DARK_DEFAULTS['--timer-bg'],
          '--green-side-bg':     DARK_DEFAULTS['--green-side-bg'],
          '--red-side-bg':       DARK_DEFAULTS['--red-side-bg'],
          '--fencer-name-color': DARK_DEFAULTS['--fencer-name-color'],
          '--fencer-club-color': DARK_DEFAULTS['--fencer-club-color'],
        }));
      }
    }
  };

  const bgVar = isKiosk ? '--k-bg' : '--bg';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1600;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setVar(bgVar, `url("${dataUrl}") center / cover no-repeat`);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Sauvegarde dans l'app ──
  const handleSave = () => {
    const id = initialTheme?.id ?? `custom-${Date.now()}`;
    const theme: CustomTheme = { id, name: themeName.trim() || t('theme.unnamed'), targetType: effectiveType, variables: vars, overlayMode };
    window.electronAPI.themes.save(theme).then(() => {
      setSavedThemes(prev => {
        const idx = prev.findIndex(t => t.id === id);
        return idx >= 0 ? prev.map((t, i) => (i === idx ? theme : t)) : [...prev, theme];
      });
    }).catch(() => {});
  };

  const handleDeleteSaved = (id: string) => {
    window.electronAPI.themes.delete(id).then(() => {
      setSavedThemes(prev => prev.filter(t => t.id !== id));
    }).catch(() => {});
  };

  const handleLoadSaved = (theme: CustomTheme) => {
    setThemeName(theme.name);
    setVars({ ...activeDefaults, ...theme.variables });
    setOverlayMode(theme.overlayMode ?? false);
  };

  // ── Import / Export (IPC Electron natif) ──
  const handleExport = async () => {
    const theme: CustomTheme = {
      id: initialTheme?.id ?? `custom-${Date.now()}`,
      name: themeName.trim() || t('theme.default_name'),
      targetType: effectiveType,
      variables: vars,
    };
    const json = JSON.stringify(theme, null, 2);
    const safeName = theme.name.replace(/[^a-z0-9_-]/gi, '-');
    const result = await window.electronAPI.dialog.saveFile({
      defaultPath: `theme-${safeName}.json`,
      filters: [{ name: t('theme.file_filter_json'), extensions: ['json'] }],
    });
    if (result && !result.canceled && result.filePath) {
      await window.electronAPI.file.writeContent(result.filePath, json);
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.dialog.openFile({
      filters: [{ name: t('theme.file_filter_json'), extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!result || !result.content) return;
    try {
      const parsed: CustomTheme = JSON.parse(result.content);
      if (!parsed.variables || typeof parsed.variables !== 'object') {
        setImportError(t('theme.import_invalid_missing_variables'));
        return;
      }
      setThemeName(parsed.name ?? t('theme.imported_name'));
      setVars({ ...activeDefaults, ...parsed.variables });
      setOverlayMode(parsed.overlayMode ?? false);
      setImportError('');
    } catch {
      setImportError(t('theme.import_invalid_json'));
    }
  };

  // ── Application ──
  const handleApply = () => {
    const theme: CustomTheme = {
      id: initialTheme?.id ?? `custom-${Date.now()}`,
      name: themeName.trim() || t('theme.default_name'),
      targetType: effectiveType,
      variables: vars,
      overlayMode,
    };
    onApply(targetArenaId, theme);
  };

  const arenaLabel = effectiveType === 'kiosk'   ? t('theme.target_kiosk')
    : effectiveType === 'public'   ? t('theme.target_public')
    : effectiveType === 'referee'  ? t('theme.target_referee')
    : effectiveType === 'pool'     ? t('theme.target_pool')
    : targetArenaId === 'all' ? t('theme.target_all_pistes')
    : t('theme.target_piste', { number: targetArenaId.replace('arena', '') });

  return (
    <div className="theme-editor-overlay" onClick={onClose}>
      <div className="theme-editor-modal" onClick={e => e.stopPropagation()}>
        {/* ── En-tête ── */}
        <div className="theme-editor-header">
          <div>
            <h3 style={{ margin: 0 }}>{t('theme.editor_title')}</h3>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {t('theme.target_label')} <strong style={{ color: '#60a5fa' }}>{arenaLabel}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="theme-editor-btn secondary" onClick={() => { void handleImport(); }} title={t('theme.import_json')}>
              ↑ {t('actions.import')}
            </button>
            <button className="theme-editor-btn secondary" onClick={() => { void handleExport(); }} title={t('actions.export')}>
              ↓ {t('actions.export')}
            </button>
            <button className="theme-editor-btn close" onClick={onClose}>✕</button>
          </div>
        </div>

        {importError && (
          <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            {importError}
          </div>
        )}

        <div className="theme-editor-body">
          {/* ── Panneau gauche : éditeur ── */}
          <div className="theme-editor-left">
            {/* Nom du thème */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                {t('theme.name')}
              </label>
              <input
                type="text"
                value={themeName}
                onChange={e => setThemeName(e.target.value)}
                style={{
                  width: '100%', padding: '0.4rem 0.6rem', borderRadius: '0.3rem',
                  border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0',
                  boxSizing: 'border-box', fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Onglets de groupes */}
            <div className="theme-editor-tabs">
              {activeVarGroups.map((g, i) => (
                <button
                  key={g.labelKey}
                  className={`theme-editor-tab ${activeGroup === i ? 'active' : ''}`}
                  onClick={() => setActiveGroup(i)}
                >
                  {t(g.labelKey)}
                </button>
              ))}
            </div>

            {/* Variables du groupe actif */}
            <div className="theme-editor-vars">
              {/* Contrôles image + overlay — Arrière-plans arène et kiosque */}
              {activeGroup === 0 && (
                <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.75rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="var-row">
                    <label className="var-label">{t('theme.var_bg_image')}</label>
                    <div className="var-control" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                      <label style={{
                        cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '0.3rem',
                        border: '1px solid #475569', background: '#1e293b', color: '#94a3b8',
                        fontSize: '0.8rem', whiteSpace: 'nowrap',
                      }}>
                        📷 {t('theme.choose_image')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                      </label>
                      {vars[bgVar]?.includes('url(') && (
                        <button
                          onClick={() => setVar(bgVar, activeDefaults[bgVar] ?? '')}
                          style={{
                            padding: '0.3rem 0.6rem', borderRadius: '0.3rem',
                            border: '1px solid #475569', background: 'none', color: '#ef4444',
                            fontSize: '0.8rem', cursor: 'pointer',
                          }}
                        >
                          ✕ {t('theme.remove_image')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="var-row">
                    <label className="var-label">{t('theme.overlay_mode')}</label>
                    <div className="var-control">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={overlayMode}
                          onChange={e => handleOverlayToggle(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: overlayMode ? '#60a5fa' : '#94a3b8' }}>
                          {t('theme.transparent_panels')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              {activeVarGroups[activeGroup]?.vars.map(({ key, labelKey, type }) => (
                <VarRow
                  key={key}
                  varKey={key}
                  label={t(labelKey)}
                  type={type}
                  value={vars[key] ?? activeDefaults[key] ?? ''}
                  onChange={val => setVar(key, val)}
                />
              ))}
            </div>

            {/* Thèmes sauvegardés */}
            {savedThemes.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  {t('theme.saved')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {savedThemes.map(savedTheme => (
                    <div
                      key={savedTheme.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.3rem 0.5rem', background: '#1e293b', borderRadius: '0.3rem',
                      }}
                    >
                      <span
                        style={{ flex: 1, fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}
                        onClick={() => handleLoadSaved(savedTheme)}
                      >
                        {savedTheme.name}
                      </span>
                      <button
                        onClick={() => handleDeleteSaved(savedTheme.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                        title={t('actions.delete')}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Panneau droit : preview ── */}
          <div className="theme-editor-right">
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600, textAlign: 'center' }}>
              {t('theme.live_preview')}
            </div>
            {/* Conteneur externe : clips + ratio 16:9 fixe */}
            <div
              ref={previewOuterRef}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: `${VIRTUAL_W} / ${VIRTUAL_H}`,
                overflow: 'hidden',
                borderRadius: '0.5rem',
                background: '#000',
                flexShrink: 0,
              }}
            >
              {/* Canvas virtuel 1280×720 */}
              <div
                className={`theme-preview-scope-${previewStyleId}`}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: `${VIRTUAL_W}px`,
                  height: `${VIRTUAL_H}px`,
                  transformOrigin: 'top left',
                  transform: `scale(${previewScale})`,
                  background: isKiosk ? 'var(--k-bg)' : 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px',
                  gap: '14px',
                  boxSizing: 'border-box',
                }}
              >
                {isKiosk ? (
                  // ── Aperçu Kiosk ──
                  <>
                    {/* Barre de progression */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'var(--k-progress)', borderRadius: '4px 4px 0 0' }} />
                    {/* En-tête kiosk */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, flexShrink: 0 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--k-accent)' }}>{t('theme.provisional_ranking')}</span>
                      <span style={{ fontSize: 18, padding: '4px 16px', borderRadius: 20, background: 'var(--k-card-bg)', border: '1px solid var(--k-border)', color: 'var(--k-accent2)' }}>
                        {t('theme.demo_club')}
                      </span>
                    </div>
                    {/* Lignes de classement */}
                    {[
                      { rank: '🥇', name: 'DUPONT A.', club: 'Escrime Paris', v: '5', ind: '+12', gold: true },
                      { rank: '🥈', name: 'MARTIN B.', club: 'CE Orléans', v: '4', ind: '+8', gold: false },
                      { rank: '🥉', name: 'LEROY C.', club: 'EC Lyon', v: '4', ind: '+5', gold: false },
                      { rank: '4', name: 'BERNARD D.', club: 'Fleuret Club', v: '3', ind: '+1', gold: false },
                    ].map((row, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 20,
                        padding: '12px 18px',
                        background: i === 0 ? 'rgba(251,191,36,0.06)' : 'var(--k-card-bg)',
                        border: `1px solid var(--k-border)`,
                        borderRadius: 10,
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 26, width: 40, textAlign: 'center', color: row.gold ? 'var(--k-accent)' : '#94a3b8', fontWeight: 700 }}>{row.rank}</span>
                        <span style={{ flex: 1, fontSize: 22, fontWeight: 600 }}>{row.name} <span style={{ fontSize: 16, color: 'var(--k-muted)' }}>· {row.club}</span></span>
                        <span style={{ fontSize: 20, color: '#10b981', fontWeight: 700 }}>{row.v}V</span>
                        <span style={{ fontSize: 20, color: 'var(--k-accent2)', width: 60, textAlign: 'right' }}>{row.ind}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  // ── Aperçu Arène ──
                  <>
                    {/* En-tête arène */}
                    <div style={{
                      background: 'var(--header-bg)',
                      borderRadius: '10px',
                      padding: '14px 28px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '26px',
                      color: 'var(--text)',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontWeight: 700 }}>{t('theme.arena1')}</span>
                      <span style={{ background: '#22c55e', borderRadius: '999px', padding: '4px 18px', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                        {t('theme.in_progress')}
                      </span>
                    </div>

                    {/* Corps du match */}
                    <div style={{
                      background: 'var(--match-bg)',
                      borderRadius: '14px',
                      flex: 1,
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      minHeight: 0,
                    }}>
                      {/* Grille combattants */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '14px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        {/* Côté vert */}
                        <div style={{
                          background: 'var(--green-side-bg)',
                          border: '6px solid var(--green-side-border)',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          overflow: 'hidden',
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', flexShrink: 0 }} />
                          <div style={{ fontSize: 'var(--fencer-name-font-size)', fontFamily: 'var(--fencer-name-font-family)', fontWeight: 800, color: 'var(--fencer-name-color)', textAlign: 'center', lineHeight: 1.1 }}>
                            DUPONT A.
                          </div>
                          <div style={{ fontSize: '22px', color: 'var(--fencer-club-color)' }}>
                            Escrime Paris
                          </div>
                          <div style={{
                            fontFamily: 'var(--score-font-family)',
                            fontSize: 'var(--score-font-size)',
                            fontWeight: 'bold',
                            color: 'var(--score-green)',
                            background: 'var(--score-bg)',
                            padding: '0.05em 0.2em',
                            borderRadius: '8px',
                            lineHeight: 1,
                            flexShrink: 0,
                          }}>
                            5
                          </div>
                        </div>

                        {/* VS */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 900, color: 'var(--vs-color)', fontFamily: 'var(--vs-font-family)' }}>
                          VS
                        </div>

                        {/* Côté rouge */}
                        <div style={{
                          background: 'var(--red-side-bg)',
                          border: '6px solid var(--red-side-border)',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          overflow: 'hidden',
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', flexShrink: 0 }} />
                          <div style={{ fontSize: 'var(--fencer-name-font-size)', fontFamily: 'var(--fencer-name-font-family)', fontWeight: 800, color: 'var(--fencer-name-color)', textAlign: 'center', lineHeight: 1.1 }}>
                            MARTIN B.
                          </div>
                          <div style={{ fontSize: '22px', color: 'var(--fencer-club-color)' }}>
                            CE Orléans
                          </div>
                          <div style={{
                            fontFamily: 'var(--score-font-family)',
                            fontSize: 'var(--score-font-size)',
                            fontWeight: 'bold',
                            color: 'var(--score-red)',
                            background: 'var(--score-bg)',
                            padding: '0.05em 0.2em',
                            borderRadius: '8px',
                            lineHeight: 1,
                            flexShrink: 0,
                          }}>
                            3
                          </div>
                        </div>
                      </div>

                      {/* Chronomètre */}
                      <div style={{
                        background: 'var(--timer-bg)',
                        border: '4px solid var(--timer-run-border)',
                        borderRadius: '10px',
                        padding: '10px',
                        textAlign: 'center',
                        fontFamily: 'var(--timer-font-family)',
                        fontSize: 'var(--timer-font-size)',
                        fontWeight: 'bold',
                        color: 'var(--timer-run-color)',
                        flexShrink: 0,
                        lineHeight: 1,
                      }}>
                        02:30
                      </div>
                    </div>

                    {/* Écran attente */}
                    <div style={{ textAlign: 'center', fontSize: '22px', color: 'var(--idle-label-color)', flexShrink: 0 }}>
                      <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--idle-number-color)' }}>2</span>
                      {' '}— {t('theme.arena_waiting')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pied de page ── */}
        <div className="theme-editor-footer">
          <button className="theme-editor-btn secondary" onClick={handleSave}>
            💾 {t('actions.save')}
          </button>
          <div style={{ flex: 1 }} />
          <button className="theme-editor-btn secondary" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button className="theme-editor-btn primary" onClick={handleApply}>
            ✓ {t('theme.apply_to', { target: arenaLabel })}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Ligne de variable
// ──────────────────────────────────────────────────────────────────────────────
interface VarRowProps {
  varKey: string;
  label: string;
  type: 'color' | 'text' | 'size' | 'font';
  value: string;
  onChange: (v: string) => void;
}

const VarRow: React.FC<VarRowProps> = ({ varKey, label, type, value, onChange }) => {
  const { t } = useTranslation();
  const isSimpleColor = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v.trim());

  if (type === 'size') {
    const presets = SIZE_PRESETS[varKey] ?? [];
    const currentIdx = presets.findIndex(p => p.value === value);
    const sliderIdx = currentIdx >= 0 ? currentIdx : 1;

    return (
      <div className="var-row">
        <label className="var-label">{label}</label>
        <div className="var-control" style={{ flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', userSelect: 'none', width: 14, textAlign: 'center' }}>A</span>
            <input
              type="range"
              min={0}
              max={presets.length - 1}
              step={1}
              value={sliderIdx}
              onChange={e => onChange(presets[Number(e.target.value)].value)}
              style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '1.1rem', color: '#94a3b8', userSelect: 'none', width: 14, textAlign: 'center', fontWeight: 700 }}>A</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
            {presets.map((preset, i) => (
              <span
                key={preset.labelKey}
                onClick={() => onChange(preset.value)}
                style={{
                  fontSize: '0.62rem',
                  color: i === sliderIdx ? '#60a5fa' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {t(preset.labelKey)}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'font') {
    return (
      <div className="var-row">
        <label className="var-label">{label}</label>
        <div className="var-control">
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              flex: 1, padding: '0.35rem 0.5rem', borderRadius: '0.3rem',
              border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0',
              fontSize: '0.85rem', cursor: 'pointer', fontFamily: value,
            }}
          >
            {FONT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>
                {opt.labelKey ? t(opt.labelKey) : opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (type === 'color' || (type === 'text' && isSimpleColor(value))) {
    return (
      <div className="var-row">
        <label className="var-label">{label}</label>
        <div className="var-control">
          <input
            type="color"
            value={isSimpleColor(value) ? value : '#000000'}
            onChange={e => onChange(e.target.value)}
            style={{
              width: 32, height: 28, border: '1px solid #475569',
              borderRadius: '0.25rem', cursor: 'pointer', padding: '2px',
              background: '#1e293b',
            }}
          />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="var-text-input"
          />
        </div>
      </div>
    );
  }

  // text libre (gradients, rgba, etc.)
  return (
    <div className="var-row">
      <label className="var-label">{label}</label>
      <div className="var-control">
        <div
          style={{
            width: 28, height: 28, borderRadius: '0.25rem',
            border: '1px solid #475569', flexShrink: 0,
            background: value, backgroundSize: 'cover',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="var-text-input"
          placeholder={t('theme.gradient_placeholder')}
        />
      </div>
    </div>
  );
};

export default React.memo(ThemeEditor);
export { DARK_DEFAULTS, loadSavedThemes, saveSavedThemes, STORAGE_KEY };
export type { CustomTheme };
