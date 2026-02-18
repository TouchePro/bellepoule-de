/**
 * BellePoule Modern - Language Selector Component
 * Licensed under GPL-3.0
 */

import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface LanguageSelectorProps {
  className?: string;
  showLabel?: boolean;
  onLanguageChange?: (language: 'fr' | 'en' | 'br') => void;
  value?: 'fr' | 'en' | 'br';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  showLabel = true,
  onLanguageChange,
  value,
}) => {
  const { language, changeLanguage, availableLanguages, isLoading } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value as 'fr' | 'en' | 'br';

    if (onLanguageChange) {
      // Mode "sélection" - ne pas appliquer immédiatement
      onLanguageChange(newLanguage);
    } else {
      // Mode "immédiat" - appliquer directement
      changeLanguage(newLanguage);
    }
  };

  if (isLoading) {
    return (
      <div className={`language-selector ${className}`}>
        {showLabel && <span>Chargement...</span>}
      </div>
    );
  }

  return (
    <div className={`language-selector ${className}`}>
      {showLabel && <label htmlFor="language-select">Langue :</label>}
      <select
        id="language-select"
        value={value !== undefined ? value : language}
        onChange={handleLanguageChange}
        className="form-input form-select"
        style={{ minWidth: '120px' }}
      >
        {availableLanguages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
