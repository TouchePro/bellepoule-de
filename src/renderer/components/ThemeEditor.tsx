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
};

// ──────────────────────────────────────────────────────────────────────────────
// Groupes de variables
// ──────────────────────────────────────────────────────────────────────────────
interface VarDef {
  key: string;
  label: string;
  /** color → color-picker + text; text → texte libre; size → presets de taille */
  type: 'color' | 'text' | 'size';
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
// Props
// ──────────────────────────────────────────────────────────────────────────────
interface ThemeEditorProps {
  /** Arène cible (ex: 'arena1') ou 'all' pour toutes les arènes */
  targetArenaId: string;
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
  initialTheme,
  onApply,
  onClose,
}) => {
  const instanceId = useId();

  const [themeName, setThemeName] = useState(initialTheme?.name ?? 'Mon thème');
  const [vars, setVars] = useState<Record<string, string>>(() => ({
    ...DARK_DEFAULTS,
    ...(initialTheme?.variables ?? {}),
  }));
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>(loadSavedThemes);
  const [activeGroup, setActiveGroup] = useState(0);
  const [importError, setImportError] = useState('');
  const previewStyleId = `theme-preview-${instanceId.replace(/:/g, '')}`;

  // Injecter les variables CSS dans un <style> pour le preview
  const previewRef = useRef<HTMLDivElement>(null);

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
    setVars({ ...DARK_DEFAULTS, ...theme.variables });
  };

  // ── Import / Export ──
  const handleExport = () => {
    const theme: CustomTheme = {
      id: initialTheme?.id ?? `custom-${Date.now()}`,
      name: themeName.trim() || 'Mon thème',
      variables: vars,
    };
    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme.name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed: CustomTheme = JSON.parse(text);
        if (!parsed.variables || typeof parsed.variables !== 'object') {
          setImportError('Fichier invalide : propriété "variables" manquante');
          return;
        }
        setThemeName(parsed.name ?? 'Thème importé');
        setVars({ ...DARK_DEFAULTS, ...parsed.variables });
        setImportError('');
      } catch {
        setImportError('Fichier JSON invalide');
      }
    };
    input.click();
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

  const arenaLabel = targetArenaId === 'all'
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
            <button className="theme-editor-btn secondary" onClick={handleImport} title="Importer un thème JSON">
              ↑ Importer
            </button>
            <button className="theme-editor-btn secondary" onClick={handleExport} title="Exporter comme JSON">
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
              {VAR_GROUPS.map((g, i) => (
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
              {VAR_GROUPS[activeGroup].vars.map(({ key, label, type }) => (
                <VarRow
                  key={key}
                  varKey={key}
                  label={label}
                  type={type}
                  value={vars[key] ?? DARK_DEFAULTS[key] ?? ''}
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
            <div
              ref={previewRef}
              className={`theme-preview-scope-${previewStyleId}`}
              style={{
                background: vars['--bg'] ?? DARK_DEFAULTS['--bg'],
                borderRadius: '0.5rem',
                overflow: 'hidden',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                padding: '0.4rem',
                gap: '0.3rem',
              }}
            >
              {/* Faux en-tête arène */}
              <div style={{
                background: vars['--header-bg'] ?? DARK_DEFAULTS['--header-bg'],
                borderRadius: '0.3rem',
                padding: '0.3rem 0.6rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.7rem',
                color: vars['--text'] ?? DARK_DEFAULTS['--text'],
              }}>
                <span style={{ fontWeight: 700 }}>⚔️ Arène 1</span>
                <span style={{ background: '#22c55e', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                  EN COURS
                </span>
              </div>

              {/* Corps du match */}
              <div style={{
                background: vars['--match-bg'] ?? DARK_DEFAULTS['--match-bg'],
                borderRadius: '0.4rem',
                flex: 1,
                padding: '0.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                minHeight: 0,
              }}>
                {/* Combattants + scores */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.3rem', flex: 1 }}>
                  {/* Côté vert */}
                  <div style={{
                    background: vars['--green-side-bg'] ?? DARK_DEFAULTS['--green-side-bg'],
                    border: `3px solid ${vars['--green-side-border'] ?? DARK_DEFAULTS['--green-side-border']}`,
                    borderRadius: '0.35rem',
                    padding: '0.3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.15rem',
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    }} />
                    <div style={{
                      fontSize: '0.6rem', fontWeight: 800,
                      color: vars['--fencer-name-color'] ?? DARK_DEFAULTS['--fencer-name-color'],
                    }}>
                      DUPONT A.
                    </div>
                    <div style={{
                      fontSize: '0.5rem',
                      color: vars['--fencer-club-color'] ?? DARK_DEFAULTS['--fencer-club-color'],
                    }}>
                      Escrime Paris
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '1.4rem',
                      fontWeight: 'bold',
                      color: vars['--score-green'] ?? DARK_DEFAULTS['--score-green'],
                      background: vars['--score-bg'] ?? DARK_DEFAULTS['--score-bg'],
                      padding: '0.05em 0.2em',
                      borderRadius: '0.15em',
                    }}>
                      5
                    </div>
                  </div>

                  {/* VS */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 900, color: '#ef4444',
                  }}>
                    VS
                  </div>

                  {/* Côté rouge */}
                  <div style={{
                    background: vars['--red-side-bg'] ?? DARK_DEFAULTS['--red-side-bg'],
                    border: `3px solid ${vars['--red-side-border'] ?? DARK_DEFAULTS['--red-side-border']}`,
                    borderRadius: '0.35rem',
                    padding: '0.3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.15rem',
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                    }} />
                    <div style={{
                      fontSize: '0.6rem', fontWeight: 800,
                      color: vars['--fencer-name-color'] ?? DARK_DEFAULTS['--fencer-name-color'],
                    }}>
                      MARTIN B.
                    </div>
                    <div style={{
                      fontSize: '0.5rem',
                      color: vars['--fencer-club-color'] ?? DARK_DEFAULTS['--fencer-club-color'],
                    }}>
                      CE Orléans
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '1.4rem',
                      fontWeight: 'bold',
                      color: vars['--score-red'] ?? DARK_DEFAULTS['--score-red'],
                      background: vars['--score-bg'] ?? DARK_DEFAULTS['--score-bg'],
                      padding: '0.05em 0.2em',
                      borderRadius: '0.15em',
                    }}>
                      3
                    </div>
                  </div>
                </div>

                {/* Chronomètre */}
                <div style={{
                  background: vars['--timer-bg'] ?? DARK_DEFAULTS['--timer-bg'],
                  border: `2px solid ${vars['--timer-run-border'] ?? DARK_DEFAULTS['--timer-run-border']}`,
                  borderRadius: '0.3rem',
                  padding: '0.2rem',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: vars['--timer-run-color'] ?? DARK_DEFAULTS['--timer-run-color'],
                }}>
                  02:30
                </div>
              </div>

              {/* Écran attente */}
              <div style={{
                textAlign: 'center',
                padding: '0.3rem',
                fontSize: '0.65rem',
                color: vars['--idle-label-color'] ?? DARK_DEFAULTS['--idle-label-color'],
                borderRadius: '0.3rem',
              }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: vars['--idle-number-color'] ?? DARK_DEFAULTS['--idle-number-color'],
                }}>2</span>
                {' '}— Arène en attente
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
  type: 'color' | 'text' | 'size';
  value: string;
  onChange: (v: string) => void;
}

const VarRow: React.FC<VarRowProps> = ({ varKey, label, type, value, onChange }) => {
  const isSimpleColor = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v.trim());

  if (type === 'size') {
    const presets = SIZE_PRESETS[varKey] ?? {};
    const activePreset = Object.entries(presets).find(([, v]) => v === value)?.[0];
    return (
      <div className="var-row">
        <label className="var-label">{label}</label>
        <div className="var-control" style={{ flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {Object.entries(presets).map(([name, val]) => (
              <button
                key={name}
                onClick={() => onChange(val)}
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: `1px solid ${activePreset === name ? '#3b82f6' : '#475569'}`,
                  background: activePreset === name ? '#1d4ed8' : 'transparent',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="var-text-input"
            placeholder="Valeur CSS personnalisée"
          />
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

export default ThemeEditor;
export { DARK_DEFAULTS };
export type { CustomTheme };
