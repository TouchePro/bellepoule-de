/**
 * BellePoule Modern - Éditeur de thème arène
 * Permet de créer, sauvegarder, importer et exporter des thèmes visuels personnalisés
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { CustomTheme } from '../../shared/types/remote';

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
};

// ──────────────────────────────────────────────────────────────────────────────
// Groupes de variables
// ──────────────────────────────────────────────────────────────────────────────
interface VarDef {
  key: string;
  label: string;
  /** color → color-picker + text; text → texte libre; size → presets de taille; font → menu déroulant police */
  type: 'color' | 'text' | 'size' | 'font';
}

interface VarGroup {
  label: string;
  vars: VarDef[];
}

const VAR_GROUPS: VarGroup[] = [
  {
    label: 'Arrière-plans',
    vars: [
      { key: '--bg',         label: 'Fond général',    type: 'text'  },
      { key: '--header-bg',  label: 'Fond en-tête',    type: 'text'  },
      { key: '--match-bg',   label: 'Fond match',      type: 'text'  },
      { key: '--score-bg',   label: 'Fond score',      type: 'text'  },
      { key: '--timer-bg',   label: 'Fond chrono',     type: 'text'  },
    ],
  },
  {
    label: 'Textes',
    vars: [
      { key: '--text',               label: 'Texte principal',     type: 'color' },
      { key: '--fencer-name-color',  label: 'Nom combattant',      type: 'color' },
      { key: '--fencer-club-color',  label: 'Club combattant',     type: 'color' },
      { key: '--waiting-color',      label: 'Écran attente',       type: 'color' },
      { key: '--idle-number-color',  label: 'Numéro arène',        type: 'text'  },
      { key: '--idle-label-color',   label: 'Label arène',         type: 'text'  },
    ],
  },
  {
    label: 'Côté gauche (vert)',
    vars: [
      { key: '--green-side-bg',     label: 'Fond',           type: 'text'  },
      { key: '--green-side-border', label: 'Bordure',        type: 'color' },
      { key: '--score-green',       label: 'Couleur score',  type: 'color' },
      { key: '--score-green-glow',  label: 'Lueur score',    type: 'text'  },
    ],
  },
  {
    label: 'Côté droit (rouge)',
    vars: [
      { key: '--red-side-bg',     label: 'Fond',           type: 'text'  },
      { key: '--red-side-border', label: 'Bordure',        type: 'color' },
      { key: '--score-red',       label: 'Couleur score',  type: 'color' },
      { key: '--score-red-glow',  label: 'Lueur score',    type: 'text'  },
    ],
  },
  {
    label: 'Chronomètre',
    vars: [
      { key: '--timer-color',      label: 'Couleur arrêt',    type: 'color' },
      { key: '--timer-glow',       label: 'Lueur arrêt',      type: 'text'  },
      { key: '--timer-border',     label: 'Bordure arrêt',    type: 'text'  },
      { key: '--timer-run-color',  label: 'Couleur en cours', type: 'color' },
      { key: '--timer-run-glow',   label: 'Lueur en cours',   type: 'text'  },
      { key: '--timer-run-border', label: 'Bordure en cours', type: 'text'  },
    ],
  },
  {
    label: 'Disposition',
    vars: [
      { key: '--score-font-size',       label: 'Taille scores',     type: 'size' },
      { key: '--timer-font-size',       label: 'Taille chrono',     type: 'size' },
      { key: '--fencer-name-font-size', label: 'Taille noms',       type: 'size' },
      { key: '--score-font-family',       label: 'Police scores',   type: 'font' },
      { key: '--timer-font-family',       label: 'Police chrono',   type: 'font' },
      { key: '--fencer-name-font-family', label: 'Police noms',     type: 'font' },
      { key: '--vs-color',                label: 'Couleur VS',      type: 'color' },
      { key: '--vs-font-family',          label: 'Police VS',       type: 'font' },
    ],
  },
];

const SIZE_PRESETS: Record<string, Record<string, string>> = {
  '--score-font-size': {
    'Petit':       'clamp(4rem, 14vw, 28vh)',
    'Normal':      'clamp(7rem, 23vw, 44vh)',
    'Grand':       'clamp(9rem, 29vw, 55vh)',
    'Très grand':  'clamp(11rem, 35vw, 66vh)',
  },
  '--timer-font-size': {
    'Petit':      'clamp(2rem, 6vw, 10vh)',
    'Normal':     'clamp(3.5rem, 11vw, 18vh)',
    'Grand':      'clamp(4.5rem, 14vw, 24vh)',
    'Très grand': 'clamp(6rem, 18vw, 30vh)',
  },
  '--fencer-name-font-size': {
    'Petit':      'clamp(0.7rem, 2vw, 3vh)',
    'Normal':     'clamp(1rem, 3.5vw, 5vh)',
    'Grand':      'clamp(1.4rem, 5vw, 7vh)',
    'Très grand': 'clamp(1.8rem, 6.5vw, 9vh)',
  },
};

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Monospace (défaut)',    value: 'monospace' },
  { label: 'Courier New',          value: '"Courier New", monospace' },
  { label: 'System UI',            value: 'system-ui, sans-serif' },
  { label: 'Arial',                value: 'Arial, sans-serif' },
  { label: 'Verdana',              value: 'Verdana, sans-serif' },
  { label: 'Impact',               value: 'Impact, fantasy' },
  { label: 'Georgia',              value: 'Georgia, serif' },
  { label: 'Trebuchet MS',         value: '"Trebuchet MS", sans-serif' },
  { label: 'Lucida Console',       value: '"Lucida Console", monospace' },
];

// Canvas virtuel pour le preview scalé (résolution de référence 16:9)
const VIRTUAL_W = 1280;
const VIRTUAL_H = 720;

const STORAGE_KEY = 'bellepoule-custom-themes';

function loadSavedThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSavedThemes(themes: CustomTheme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

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
    label: 'Kiosk',
    vars: [
      { key: '--k-bg',       label: 'Fond',              type: 'text'  },
      { key: '--k-accent',   label: 'Couleur accent',    type: 'color' },
      { key: '--k-accent2',  label: 'Couleur interactive', type: 'color' },
      { key: '--k-card-bg',  label: 'Fond cartes',       type: 'text'  },
      { key: '--k-border',   label: 'Bordures',          type: 'text'  },
      { key: '--k-muted',    label: 'Texte discret',     type: 'color' },
      { key: '--k-progress', label: 'Barre progression', type: 'text'  },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────
interface ThemeEditorProps {
  /** Arène cible (ex: 'arena1') ou 'all' pour toutes les arènes */
  targetArenaId: string;
  /** 'arena' (défaut) ou 'kiosk' */
  targetType?: 'arena' | 'kiosk';
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
  const instanceId = useId();
  const isKiosk = targetType === 'kiosk';
  const activeDefaults = isKiosk ? KIOSK_DEFAULTS : DARK_DEFAULTS;
  const activeVarGroups = isKiosk ? KIOSK_VAR_GROUPS : VAR_GROUPS;

  const [themeName, setThemeName] = useState(initialTheme?.name ?? (isKiosk ? 'Thème kiosk' : 'Mon thème'));
  const [vars, setVars] = useState<Record<string, string>>(() => ({
    ...activeDefaults,
    ...(initialTheme?.variables ?? {}),
  }));
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>(loadSavedThemes);
  const [activeGroup, setActiveGroup] = useState(0);
  const [importError, setImportError] = useState('');
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

  // ── Sauvegarde locale ──
  const handleSave = () => {
    const id = initialTheme?.id ?? `custom-${Date.now()}`;
    const theme: CustomTheme = { id, name: themeName.trim() || 'Sans nom', variables: vars };
    const existing = savedThemes.findIndex(t => t.id === id);
    const updated = existing >= 0
      ? savedThemes.map((t, i) => (i === existing ? theme : t))
      : [...savedThemes, theme];
    setSavedThemes(updated);
    saveSavedThemes(updated);
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedThemes.filter(t => t.id !== id);
    setSavedThemes(updated);
    saveSavedThemes(updated);
  };

  const handleLoadSaved = (theme: CustomTheme) => {
    setThemeName(theme.name);
    setVars({ ...activeDefaults, ...theme.variables });
  };

  // ── Import / Export (IPC Electron natif) ──
  const handleExport = async () => {
    const theme: CustomTheme = {
      id: initialTheme?.id ?? `custom-${Date.now()}`,
      name: themeName.trim() || 'Mon thème',
      variables: vars,
    };
    const json = JSON.stringify(theme, null, 2);
    const safeName = theme.name.replace(/[^a-z0-9_-]/gi, '-');
    const result = await window.electronAPI.dialog.saveFile({
      defaultPath: `theme-${safeName}.json`,
      filters: [{ name: 'Thème JSON', extensions: ['json'] }],
    });
    if (result && !result.canceled && result.filePath) {
      await window.electronAPI.file.writeContent(result.filePath, json);
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'Thème JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!result || !result.content) return;
    try {
      const parsed: CustomTheme = JSON.parse(result.content);
      if (!parsed.variables || typeof parsed.variables !== 'object') {
        setImportError('Fichier invalide : propriété "variables" manquante');
        return;
      }
      setThemeName(parsed.name ?? 'Thème importé');
      setVars({ ...activeDefaults, ...parsed.variables });
      setImportError('');
    } catch {
      setImportError('Fichier JSON invalide');
    }
  };

  // ── Application ──
  const handleApply = () => {
    const theme: CustomTheme = {
      id: initialTheme?.id ?? `custom-${Date.now()}`,
      name: themeName.trim() || 'Mon thème',
      variables: vars,
    };
    onApply(targetArenaId, theme);
  };

  const arenaLabel = isKiosk
    ? 'Kiosk (affichage public)'
    : targetArenaId === 'all'
      ? 'Toutes les arènes'
      : `Piste ${targetArenaId.replace('arena', '')}`;

  return (
    <div className="theme-editor-overlay" onClick={onClose}>
      <div className="theme-editor-modal" onClick={e => e.stopPropagation()}>
        {/* ── En-tête ── */}
        <div className="theme-editor-header">
          <div>
            <h3 style={{ margin: 0 }}>Éditeur de thème</h3>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Cible : <strong style={{ color: '#60a5fa' }}>{arenaLabel}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="theme-editor-btn secondary" onClick={() => { void handleImport(); }} title="Importer un thème JSON">
              ↑ Importer
            </button>
            <button className="theme-editor-btn secondary" onClick={() => { void handleExport(); }} title="Exporter comme JSON">
              ↓ Exporter
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
                Nom du thème
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
                  key={g.label}
                  className={`theme-editor-tab ${activeGroup === i ? 'active' : ''}`}
                  onClick={() => setActiveGroup(i)}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Variables du groupe actif */}
            <div className="theme-editor-vars">
              {activeVarGroups[activeGroup]?.vars.map(({ key, label, type }) => (
                <VarRow
                  key={key}
                  varKey={key}
                  label={label}
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
                  Thèmes sauvegardés
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {savedThemes.map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.3rem 0.5rem', background: '#1e293b', borderRadius: '0.3rem',
                      }}
                    >
                      <span
                        style={{ flex: 1, fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}
                        onClick={() => handleLoadSaved(t)}
                      >
                        {t.name}
                      </span>
                      <button
                        onClick={() => handleDeleteSaved(t.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                        title="Supprimer"
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
              Aperçu en direct
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
                      <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--k-accent)' }}>🏆 Classement provisoire</span>
                      <span style={{ fontSize: 18, padding: '4px 16px', borderRadius: 20, background: 'var(--k-card-bg)', border: '1px solid var(--k-border)', color: 'var(--k-accent2)' }}>
                        16 tireurs
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
                      <span style={{ fontWeight: 700 }}>⚔ Arène 1</span>
                      <span style={{ background: '#22c55e', borderRadius: '999px', padding: '4px 18px', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                        EN COURS
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
                      {' '}— Arène en attente
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
            💾 Sauvegarder
          </button>
          <div style={{ flex: 1 }} />
          <button className="theme-editor-btn secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="theme-editor-btn primary" onClick={handleApply}>
            ✓ Appliquer à {arenaLabel}
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
  const isSimpleColor = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v.trim());

  if (type === 'size') {
    const presets = SIZE_PRESETS[varKey] ?? {};
    const entries = Object.entries(presets);
    const currentIdx = entries.findIndex(([, v]) => v === value);
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
              max={entries.length - 1}
              step={1}
              value={sliderIdx}
              onChange={e => onChange(entries[Number(e.target.value)][1])}
              style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '1.1rem', color: '#94a3b8', userSelect: 'none', width: 14, textAlign: 'center', fontWeight: 700 }}>A</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
            {entries.map(([name], i) => (
              <span
                key={name}
                onClick={() => onChange(entries[i][1])}
                style={{
                  fontSize: '0.62rem',
                  color: i === sliderIdx ? '#60a5fa' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {name}
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
                {opt.label}
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
          placeholder="ex: linear-gradient(135deg,#000,#111)"
        />
      </div>
    </div>
  );
};

export default React.memo(ThemeEditor);
export { DARK_DEFAULTS, loadSavedThemes, saveSavedThemes, STORAGE_KEY };
export type { CustomTheme };
