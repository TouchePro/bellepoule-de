/**
 * BellePoule Modern - Settings Modal Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { Language } from '../contexts/TranslationContext';
import LanguageSelector from './LanguageSelector';

const LOGO_STORAGE_KEY = 'bellepoule-logo';
const LOGO_MAX_W = 600;
const LOGO_MAX_H = 200;

function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > LOGO_MAX_W || h > LOGO_MAX_H) {
          const ratio = Math.min(LOGO_MAX_W / w, LOGO_MAX_H / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface SettingsModalProps {
  onClose: () => void;
  onSave: (settings: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSave }) => {
  const { t, language, theme, changeLanguage, changeTheme } = useTranslation();
  const [settings, setSettings] = useState({
    language: language,
    theme: theme,
  });
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem(LOGO_STORAGE_KEY));
  const [isDragging, setIsDragging] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(prev => ({ ...prev, language, theme }));
  }, [language, theme]);

  // Sync persisted logo from main process if localStorage is empty
  useEffect(() => {
    if (!logo) {
      const api = (window as any).electronAPI;
      api?.getLogo?.().then((persisted: string | null) => {
        if (persisted) {
          setLogo(persisted);
          localStorage.setItem(LOGO_STORAGE_KEY, persisted);
        }
      });
    }
    const api = (window as any).electronAPI;
    const unsub = api?.onLogoLoaded?.((persisted: string | null) => {
      if (persisted && !localStorage.getItem(LOGO_STORAGE_KEY)) {
        setLogo(persisted);
        localStorage.setItem(LOGO_STORAGE_KEY, persisted);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLanguageChange = (newLanguage: Language) => {
    setSettings(prev => ({ ...prev, language: newLanguage }));
  };

  const handleThemeChange = (newTheme: 'default' | 'light' | 'dark') => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  const applyLogo = useCallback(async (file: File) => {
    setLogoError(null);
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Image trop grande (max 5 Mo)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setLogoError('Fichier non supporté — choisissez une image');
      return;
    }
    try {
      const base64 = await resizeLogo(file);
      setLogo(base64);
      localStorage.setItem(LOGO_STORAGE_KEY, base64);
      const api = (window as any).electronAPI;
      if (api?.remote?.updateLogo) api.remote.updateLogo(base64).catch(() => {});
    } catch {
      setLogoError('Impossible de lire l\'image');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyLogo(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyLogo(file);
  }, [applyLogo]);

  const handleRemoveLogo = () => {
    setLogo(null);
    localStorage.removeItem(LOGO_STORAGE_KEY);
    const api = (window as any).electronAPI;
    if (api?.remote?.updateLogo) api.remote.updateLogo(null).catch(() => {});
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

          {/* Logo organisateur */}
          <div className="form-group">
            <label>Logo organisateur</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)', marginBottom: '0.5rem' }}>
              Affiché en haut à gauche des PDF exportés et dans le mode kiosque.
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--primary, #3b82f6)' : 'var(--border, #d1d5db)'}`,
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'var(--primary-light, #eff6ff)' : 'transparent',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Logo organisateur"
                  style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }}
                />
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6b7280)' }}>
                  Glissez une image ici ou cliquez pour choisir
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', display: 'block', marginTop: logo ? '0' : '0.25rem' }}>
                PNG, JPG, SVG — max 5 Mo
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {logoError && (
              <p style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)', marginTop: '0.25rem' }}>{logoError}</p>
            )}
            {logo && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                onClick={handleRemoveLogo}
              >
                Supprimer le logo
              </button>
            )}
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
