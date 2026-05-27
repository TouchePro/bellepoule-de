/**
 * BellePoule Modern - TableauToolbar
 * Barre d'outils du tableau à élimination directe
 * Licensed under GPL-3.0
 */

import React from 'react';
import { Fencer } from '../../../shared/types';

interface TableauToolbarProps {
  tableauSize: number;
  rankingCount: number;
  arenaCount: number;
  autoAssignArenas: boolean;
  onAutoAssignToggle: (enabled: boolean) => void;
  onBulkDeassign: () => void;
  onAutoFillScores: () => void;
  viewMode: 'full' | 'pending';
  onViewModeToggle: () => void;
  pyramidViewMode: boolean;
  onPyramidViewModeToggle: () => void;
  onPrintClick: () => void;
  onExportPdfClick: () => void;
  onExportTreeClick: () => void;
  champion: Fencer | null | undefined;
}

const TableauToolbarComponent: React.FC<TableauToolbarProps> = ({
  tableauSize,
  rankingCount,
  arenaCount,
  autoAssignArenas,
  onAutoAssignToggle,
  onBulkDeassign,
  onAutoFillScores,
  viewMode,
  onViewModeToggle,
  pyramidViewMode,
  onPyramidViewModeToggle,
  onPrintClick,
  onExportPdfClick,
  onExportTreeClick,
  champion,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
        Tableau de {tableauSize} - {rankingCount} qualifiés
      </h2>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {arenaCount > 0 && (
          <>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer',
                padding: '0.5rem 0.75rem',
                background: autoAssignArenas ? '#eff6ff' : '#f3f4f6',
                border: `1px solid ${autoAssignArenas ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '6px',
                userSelect: 'none',
              }}
              title="Assigne automatiquement les matchs aux arènes disponibles en round-robin"
            >
              <input
                type="checkbox"
                checked={autoAssignArenas}
                onChange={e => onAutoAssignToggle(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>🏟️ Assignation auto</span>
            </label>
            <button
              onClick={onBulkDeassign}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title="Désaffecter tous les matches de toutes les arènes"
            >
              ❌ Désaffecter tout
            </button>
          </>
        )}
        <button
          onClick={onAutoFillScores}
          style={{
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          🎲 Remplir auto
        </button>
        <button
          onClick={onViewModeToggle}
          style={{
            background: viewMode === 'pending' ? '#3b82f6' : '#e5e7eb',
            color: viewMode === 'pending' ? 'white' : '#374151',
            border: 'none',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title={
            viewMode === 'full'
              ? 'Afficher les matches en attente'
              : 'Afficher le tableau complet'
          }
        >
          {viewMode === 'full' ? '📋 Matchs en attente' : '📊 Tableau complet'}
        </button>
        <button
          onClick={onPyramidViewModeToggle}
          style={{
            background: pyramidViewMode ? '#8b5cf6' : '#e5e7eb',
            color: pyramidViewMode ? 'white' : '#374151',
            border: 'none',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title={pyramidViewMode ? 'Vue tableau' : 'Vue pyramidale'}
        >
          {pyramidViewMode ? '🔲 Tableau' : '🔺 Pyramide'}
        </button>
        <button
          onClick={onPrintClick}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title="Imprimer les feuilles de match"
        >
          🖨️ Imprimer
        </button>
        <button
          onClick={onExportPdfClick}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title="Exporter les feuilles de match en PDF"
        >
          📄 Export PDF
        </button>
        <button
          onClick={onExportTreeClick}
          style={{
            background: '#0d9488',
            color: 'white',
            border: 'none',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title="Exporter l'arbre du tableau en PDF"
        >
          🌲 Arbre PDF
        </button>
        {champion && (
          <div
            style={{
              background: '#fef3c7',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <span style={{ fontWeight: '600' }}>
              {champion.lastName} {champion.firstName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const TableauToolbar = React.memo(TableauToolbarComponent);
export default TableauToolbar;
