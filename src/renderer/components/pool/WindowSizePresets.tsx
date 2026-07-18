/**
 * BellePoule Modern - Window Size Presets
 * Boutons de redimensionnement de la fenêtre principale pour l'affichage des poules.
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const STORAGE_KEY = 'bellepoule-pool-window-size';

const PRESETS = [
  { label: 'Compact', width: 1024, height: 768 },
  { label: 'Normal', width: 1400, height: 900 },
  { label: 'Large', width: 1800, height: 1050 },
  { label: 'XL', width: 2200, height: 1200 },
] as const;

type PresetLabel = (typeof PRESETS)[number]['label'];

const PRESET_LABEL_KEYS: Record<PresetLabel, string> = {
  Compact: 'windowSizePresets.presets.compact',
  Normal: 'windowSizePresets.presets.normal',
  Large: 'windowSizePresets.presets.large',
  XL: 'windowSizePresets.presets.xl',
};

const WindowSizePresets: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<PresetLabel>('Normal');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PresetLabel | null;
    if (saved && PRESETS.some(p => p.label === saved)) {
      setActive(saved);
    }
  }, []);

  const apply = (preset: (typeof PRESETS)[number]) => {
    setActive(preset.label);
    localStorage.setItem(STORAGE_KEY, preset.label);
    window.electronAPI?.setWindowSize(preset.width, preset.height);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{t('windowSizePresets.label')}</span>
      {PRESETS.map(preset => (
        <button
          key={preset.label}
          className={`btn btn-sm ${active === preset.label ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => apply(preset)}
          title={`${preset.width}×${preset.height}`}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
        >
          {t(PRESET_LABEL_KEYS[preset.label])}
        </button>
      ))}
    </div>
  );
};

export default WindowSizePresets;
