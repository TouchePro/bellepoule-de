/**
 * BellePoule Modern - Translation Context
 * Global translation state using React Context
 * Licensed under GPL-3.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Language = 'fr' | 'en' | 'br' | 'ca' | 'de' | 'es' | 'zh-HK';
export type TranslationKey = string;
export type Theme = 'light' | 'dark' | 'default';

export interface Translations {
  [key: string]: {
    [key: string]: string | unknown;
  };
}

interface TranslationContextValue {
  language: Language;
  theme: Theme;
  translations: Translations;
  isLoading: boolean;
  t: (key: TranslationKey, params?: { [key: string]: string | number }) => string;
  changeLanguage: (lang: Language) => Promise<void>;
  changeTheme: (theme: Theme) => void;
  availableLanguages: readonly { code: Language; name: string; flag: string }[];
  availableThemes: readonly { code: Theme; name: string }[];
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const getFallbackTranslations = (language: Language): Translations => {
  const fallbackTranslations: Record<Language, Translations> = {
    fr: {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: 'Nouvelle compétition' },
      settings: { title: 'Paramètres' },
      messages: {
        no_competitions: 'Aucune compétition',
        loading: 'Chargement...',
      },
    },
    en: {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: 'New competition' },
      settings: { title: 'Settings' },
      messages: {
        no_competitions: 'No competitions',
        loading: 'Loading...',
      },
    },
    br: {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: 'Nevezompetañ' },
      settings: { title: 'Arventennoù' },
      messages: {
        no_competitions: 'Hini kenstrrenn',
        loading: 'O kargañ...',
      },
    },
    ca: {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: 'Nova Competició' },
      settings: { title: 'Configuració' },
      messages: {
        no_competitions: 'Sense competicions',
        loading: 'Carregant...',
      },
    },
    de: {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: 'Neuer Wettbewerb' },
      settings: { title: 'Einstellungen' },
      messages: {
        no_competitions: 'Keine Wettbewerbe',
        loading: 'Laden...',
      },
    },
    es: {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: 'Nueva Competición' },
      settings: { title: 'Ajustes' },
      messages: {
        no_competitions: 'Sin competiciones',
        loading: 'Cargando...',
      },
    },
    'zh-HK': {
      app: { title: 'BellePoule Modern' },
      menu: { new_competition: '新增比賽' },
      settings: { title: '設定' },
      messages: {
        no_competitions: '沒有比賽',
        loading: '載入中...',
      },
    },
  };
  return fallbackTranslations[language] || fallbackTranslations.fr;
};

const loadTranslations = async (language: Language): Promise<Translations> => {
  try {
    const response = await fetch(`./locales/${language}.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    console.warn(`Failed to load translations for ${language}`);
  }
  return getFallbackTranslations(language);
};

const applyTheme = (theme: Theme): void => {
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-default');
  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }
};

interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('fr');
  const [theme, setTheme] = useState<Theme>('default');
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  const changeLanguage = useCallback(async (newLanguage: Language) => {
    setIsLoading(true);
    try {
      const loadedTranslations = await loadTranslations(newLanguage);
      setLanguage(newLanguage);
      setTranslations(loadedTranslations);
      localStorage.setItem('bellepoule-language', newLanguage);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('bellepoule-theme', newTheme);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const savedLanguage = (localStorage.getItem('bellepoule-language') as Language) || 'fr';
      const savedTheme = (localStorage.getItem('bellepoule-theme') as Theme) || 'default';

      applyTheme(savedTheme);
      const loadedTranslations = await loadTranslations(savedLanguage);

      setLanguage(savedLanguage);
      setTheme(savedTheme);
      setTranslations(loadedTranslations);
      setIsLoading(false);
    };

    initialize();
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: { [key: string]: string | number }): string => {
      const keys = key.split('.');
      let value: unknown = translations;

      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }

      if (typeof value !== 'string') {
        return key;
      }

      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return String(params[paramKey] || match);
        });
      }

      return value;
    },
    [translations]
  );

  const value: TranslationContextValue = {
    language,
    theme,
    translations,
    isLoading,
    t,
    changeLanguage,
    changeTheme,
    availableLanguages: [
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'br', name: 'Brezhoneg', flag: '🇫🇷' },
      { code: 'ca', name: 'Català', flag: '🇪🇸' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'zh-HK', name: '繁體中文', flag: '🇭🇰' },
    ],
    availableThemes: [
      { code: 'default', name: 'Default' },
      { code: 'light', name: 'Light' },
      { code: 'dark', name: 'Dark' },
    ],
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslation = (): TranslationContextValue => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
