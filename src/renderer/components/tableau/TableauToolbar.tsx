/**
 * BellePoule Modern - TableauToolbar
 * Barre d'outils du tableau à élimination directe
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
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
  onPreviewClick: () => void;
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
  onPreviewClick,
  onExportPdfClick,
  onExportTreeClick,
  champion,
}) => {
  const { t } = useTranslation();
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close FAB when clicking outside
  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);

  const closeAndRun = (fn: () => void) => {
    setFabOpen(false);
    fn();
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
      {/* Left: title + champion */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, whiteSpace: 'nowrap' }}>
          {t('tableauToolbar.title_size', { size: tableauSize })}
          <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '1rem', marginLeft: '0.375rem' }}>
            — {t('tableauToolbar.qualified_count', { count: rankingCount })}
          </span>
        </h2>
        {champion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#fef3c7', padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: '600', border: '1px solid #fcd34d' }}>
            🏆 {champion.lastName} {champion.firstName}
          </div>
        )}
      </div>

      {/* Right: view toggles + FAB */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        {/* View mode toggles — toujours visibles */}
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
          }}
          title={viewMode === 'full' ? t('tableauToolbar.view_list_title') : t('tableauToolbar.view_tableau_title')}
        >
          {viewMode === 'full' ? t('tableauToolbar.view_list_label') : t('tableauToolbar.view_tableau_label')}
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
          }}
          title={pyramidViewMode ? t('tableauToolbar.pyramid_tableau_title') : t('tableauToolbar.pyramid_pyramid_title')}
        >
          {pyramidViewMode ? t('tableauToolbar.pyramid_tableau_label') : t('tableauToolbar.pyramid_pyramid_label')}
        </button>

        {/* FAB */}
        <div className="tableau-fab-wrapper" ref={fabRef}>
          <button
            className="tableau-fab-trigger"
            onClick={() => setFabOpen(o => !o)}
            title={t('tableauToolbar.options')}
          >
            {fabOpen ? '✕' : '⋮'} {t('tableauToolbar.options')}
          </button>

          {fabOpen && (
            <div className="tableau-fab-menu">
              {arenaCount > 0 && (
                <>
                  <span className="tableau-fab-section-label">{t('tableauToolbar.section_arenas')}</span>
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', background: autoAssignArenas ? 'rgba(59,130,246,0.08)' : 'transparent', color: autoAssignArenas ? '#2563eb' : 'var(--color-text)' }}
                  >
                    <input
                      type="checkbox"
                      checked={autoAssignArenas}
                      onChange={e => onAutoAssignToggle(e.target.checked)}
                    />
                    {t('tableauToolbar.auto_assign_arenas')}
                  </label>
                  <button className="tableau-fab-item tableau-fab-item--danger" onClick={() => closeAndRun(onBulkDeassign)}>
                    ❌ {t('tableauToolbar.unassign_all')}
                  </button>
                  <div className="tableau-fab-divider" />
                </>
              )}

              <span className="tableau-fab-section-label">{t('tableauToolbar.section_actions')}</span>
              <button className="tableau-fab-item" onClick={() => closeAndRun(onAutoFillScores)}>
                {t('tableauToolbar.autofill_scores')}
              </button>

              <div className="tableau-fab-divider" />
              <span className="tableau-fab-section-label">{t('tableauToolbar.export')}</span>
              <button className="tableau-fab-item" onClick={() => closeAndRun(onPrintClick)}>
                {t('tableauToolbar.print')}
              </button>
              <button className="tableau-fab-item" onClick={() => closeAndRun(onPreviewClick)} title={t('tableauToolbar.preview_desc')}>
                {t('tableauToolbar.preview')}
              </button>
              <button className="tableau-fab-item" onClick={() => closeAndRun(onExportPdfClick)}>
                {t('tableauToolbar.export_pdf')}
              </button>
              <button className="tableau-fab-item" onClick={() => closeAndRun(onExportTreeClick)}>
                {t('tableauToolbar.export_tree')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TableauToolbar = React.memo(TableauToolbarComponent);
export default TableauToolbar;
