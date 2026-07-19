// @vitest-environment jsdom
/**
 * Tests de composant - LanguageSelector
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const changeLanguage = vi.fn();
// Valeurs reprises de src/renderer/locales/de.json (namespace language_selector.*)
const translations: Record<string, string> = {
  'language_selector.loading': 'Sprachen werden geladen…',
  'language_selector.label': 'Sprache',
};
const hookState = {
  language: 'fr',
  changeLanguage,
  availableLanguages: [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ],
  isLoading: false,
  t: (key: string) => translations[key] ?? key,
};
vi.mock('../hooks/useTranslation', () => ({ useTranslation: () => hookState }));

import LanguageSelector from './LanguageSelector';

beforeEach(() => {
  changeLanguage.mockClear();
  hookState.isLoading = false;
});

describe('LanguageSelector', () => {
  it('rend les langues disponibles', () => {
    render(<LanguageSelector />);
    expect(screen.getByText(/Français/)).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();
  });

  it('applique directement le changement sans prop onLanguageChange', () => {
    render(<LanguageSelector />);
    fireEvent.change(screen.getByLabelText('Sprache'), { target: { value: 'en' } });
    expect(changeLanguage).toHaveBeenCalledWith('en');
  });

  it('délègue à onLanguageChange si fourni (mode sélection)', () => {
    const onLanguageChange = vi.fn();
    render(<LanguageSelector onLanguageChange={onLanguageChange} />);
    fireEvent.change(screen.getByLabelText('Sprache'), { target: { value: 'en' } });
    expect(onLanguageChange).toHaveBeenCalledWith('en');
    expect(changeLanguage).not.toHaveBeenCalled();
  });

  it('affiche un état de chargement', () => {
    hookState.isLoading = true;
    render(<LanguageSelector />);
    expect(screen.getByText('Sprachen werden geladen…')).toBeInTheDocument();
  });
});
