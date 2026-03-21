/**
 * BellePoule Modern - Keyboard Shortcuts Help
 * UX Improvement: Accessible shortcut documentation
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';

interface Shortcut {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'competition' | 'global';
}

const SHORTCUTS: Shortcut[] = [
  // Global
  { key: '?', description: "Afficher l'aide des raccourcis", category: 'global' },
  { key: 'Ctrl + K', description: 'Recherche rapide', category: 'global' },
  { key: 'Esc', description: 'Fermer la modale / Annuler', category: 'global' },

  // Navigation
  { key: 'Ctrl + 1', description: 'Aller aux poules', category: 'navigation' },
  { key: 'Ctrl + 2', description: 'Aller au tableau', category: 'navigation' },
  { key: 'Ctrl + 3', description: 'Aller aux résultats', category: 'navigation' },
  { key: 'Tab', description: 'Navigation entre champs', category: 'navigation' },

  // Actions
  { key: 'Ctrl + S', description: 'Sauvegarder', category: 'actions' },
  { key: 'Ctrl + Z', description: 'Annuler (Undo)', category: 'actions' },
  { key: 'Ctrl + Y', description: 'Refaire (Redo)', category: 'actions' },
  { key: 'Ctrl + N', description: 'Nouvelle compétition', category: 'actions' },

  // Competition
  { key: 'F5', description: 'Rafraîchir les données', category: 'competition' },
  { key: 'Space', description: 'Démarrer/Pause le chronomètre', category: 'competition' },
  { key: '↑ ↓', description: 'Naviguer dans la liste', category: 'competition' },
  { key: 'Enter', description: 'Valider / Ouvrir', category: 'competition' },
];

export const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'Tous', icon: '⌨️' },
    { id: 'global', label: 'Globaux', icon: '🌍' },
    { id: 'navigation', label: 'Navigation', icon: '🧭' },
    { id: 'actions', label: 'Actions', icon: '⚡' },
    { id: 'competition', label: 'Compétition', icon: '🤺' },
  ];

  const filteredShortcuts =
    activeCategory === 'all' ? SHORTCUTS : SHORTCUTS.filter(s => s.category === activeCategory);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>⌨️ Raccourcis Clavier</h2>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              Maîtrisez BellePoule comme un pro
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s',
                backgroundColor: activeCategory === cat.id ? '#3b82f6' : '#f3f4f6',
                color: activeCategory === cat.id ? 'white' : '#374151',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            maxHeight: '400px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {filteredShortcuts.map((shortcut, index) => (
              <React.Fragment key={index}>
                <kbd
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#111827',
                    boxShadow: '0 2px 0 #d1d5db',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {shortcut.key}
                </kbd>
                <span
                  style={{
                    fontSize: '15px',
                    color: '#374151',
                    paddingLeft: '8px',
                  }}
                >
                  {shortcut.description}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            fontSize: '13px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          Appuyez sur{' '}
          <kbd
            style={{
              padding: '2px 6px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            ?
          </kbd>{' '}
          pour afficher cette aide à tout moment
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
