/**
 * BellePoule Modern - Settings Modal Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { Language } from '../contexts/TranslationContext';
import LanguageSelector from './LanguageSelector';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (settings: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSave }) => {
  const { t, language, theme, changeLanguage, changeTheme } = useTranslation();
  const [settings, setSettings] = useState({
    language: language,
    theme: theme,
    // Ajouter d'autres paramètres ici
  });

  // Update local settings when global language/theme changes (e.g., from localStorage)
  useEffect(() => {
    setSettings(prev => ({ ...prev, language, theme }));
  }, [language, theme]);

  const handleLanguageChange = (newLanguage: Language) => {
    setSettings(prev => ({ ...prev, language: newLanguage }));
  };

  const handleThemeChange = (newTheme: 'default' | 'light' | 'dark') => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  const handleSave = () => {
    if (settings.language !== language) {
      changeLanguage(settings.language);
    }
    if (settings.theme !== theme) {
      changeTheme(settings.theme);
    }
    onSave(settings);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{t('settings.title')}</h2>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <LanguageSelector
              showLabel={true}
              value={settings.language}
              onLanguageChange={handleLanguageChange}
            />
          </div>

          {/* Ajouter d'autres paramètres ici */}
          <div className="form-group">
            <label>{t('settings.theme')}</label>
            <select
              className="form-input form-select"
              value={settings.theme}
              onChange={e => handleThemeChange(e.target.value as 'default' | 'light' | 'dark')}
            >
              <option value="default">Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
