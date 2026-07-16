/**
 * BellePoule Modern - Centre d'export
 * Point d'entrée unique regroupant les exports jusque-là dispersés entre plusieurs vues
 * (poules, classement, résultats, tableau, export complet).
 * Licensed under GPL-3.0
 */

import React from 'react';
import { Fencer, Pool, PoolRanking } from '../../../shared/types';
import { FinalResult } from '../tableau/tableauTypes';
import { useTranslation } from '../../hooks/useTranslation';

interface ExportCenterModalProps {
  fencers: Fencer[];
  pools: Pool[];
  currentPoolRound: number;
  overallRanking: PoolRanking[];
  finalResults: FinalResult[];
  tableauMatchesCount: number;
  isLaserSabre: boolean;
  onClose: () => void;
  exportFencersList: (fencers: Fencer[], format: 'txt' | 'fff') => void | Promise<void>;
  exportPoolsPDF: (pools: Pool[], round: number) => void | Promise<void>;
  printPoolsPDF: (pools: Pool[], round: number) => void | Promise<void>;
  exportRanking: (ranking: PoolRanking[], format: 'csv' | 'json', isLaserSabre: boolean) => void;
  exportRankingExcelCSV: (ranking: PoolRanking[]) => void;
  exportResults: (results: FinalResult[], format: 'csv' | 'json') => void;
  exportResultsHTML: (ranking: PoolRanking[], results: FinalResult[]) => void;
  exportResultsXML: (ranking: PoolRanking[], results: FinalResult[], pools?: Pool[]) => void;
  exportDetailedStats: (pools: Pool[], ranking: PoolRanking[]) => void;
  onGoToTableau: () => void;
  onGoToResults: () => void;
  onExportFFE: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
      {title}
    </h3>
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{children}</div>
  </div>
);

const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  fencers,
  pools,
  currentPoolRound,
  overallRanking,
  finalResults,
  tableauMatchesCount,
  isLaserSabre,
  onClose,
  exportFencersList,
  exportPoolsPDF,
  printPoolsPDF,
  exportRanking,
  exportRankingExcelCSV,
  exportResults,
  exportResultsHTML,
  exportResultsXML,
  exportDetailedStats,
  onGoToTableau,
  onGoToResults,
  onExportFFE,
}) => {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-center-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="export-center-title">{t('exportCenter.title')}</h2>
        </div>
        <div className="modal-body">
          {fencers.length > 0 && (
            <Section title={t('exportCenter.fencers')}>
              <button className="btn btn-secondary" onClick={() => exportFencersList(fencers, 'txt')}>{t('exportCenter.export_txt')}</button>
              <button className="btn btn-secondary" onClick={() => exportFencersList(fencers, 'fff')}>{t('exportCenter.export_fff')}</button>
            </Section>
          )}

          {pools.length > 0 && (
            <Section title={t('phases.pools')}>
              <button className="btn btn-secondary" onClick={() => exportPoolsPDF(pools, currentPoolRound)}>{t('exportCenter.export_pdf')}</button>
              <button className="btn btn-secondary" onClick={() => printPoolsPDF(pools, currentPoolRound)}>{t('poolRanking.print')}</button>
            </Section>
          )}

          {tableauMatchesCount > 0 && (
            <Section title={t('exportCenter.tableau')}>
              <button className="btn btn-secondary" onClick={onGoToTableau}>
                {t('exportCenter.go_tableau')}
              </button>
            </Section>
          )}

          {overallRanking.length > 0 && (
            <Section title={t('exportCenter.ranking')}>
              <button className="btn btn-secondary" onClick={() => exportRanking(overallRanking, 'csv', isLaserSabre)}>CSV</button>
              <button className="btn btn-secondary" onClick={() => exportRankingExcelCSV(overallRanking)}>CSV Excel</button>
              <button className="btn btn-secondary" onClick={() => exportRanking(overallRanking, 'json', isLaserSabre)}>JSON</button>
              <button className="btn btn-secondary" onClick={onExportFFE}>{t('exportCenter.send_ffe')}</button>
            </Section>
          )}

          {finalResults.length > 0 && (
            <Section title={t('exportCenter.final_results')}>
              <button className="btn btn-secondary" onClick={() => exportResults(finalResults, 'csv')}>CSV</button>
              <button className="btn btn-secondary" onClick={() => exportResults(finalResults, 'json')}>JSON</button>
              <button className="btn btn-secondary" onClick={() => exportResultsHTML(overallRanking, finalResults)}>HTML</button>
              <button className="btn btn-secondary" onClick={() => exportResultsXML(overallRanking, finalResults, pools)}>XML FFE</button>
            </Section>
          )}

          {pools.length > 0 && overallRanking.length > 0 && (
            <Section title={t('analytics.tab_stats')}>
              <button className="btn btn-secondary" onClick={() => exportDetailedStats(pools, overallRanking)}>{t('exportCenter.detailed_csv')}</button>
            </Section>
          )}

          {finalResults.length > 0 && (
            <Section title={t('exportCenter.full_export')}>
              <button className="btn btn-secondary" onClick={onGoToResults}>
                {t('exportCenter.go_results')}
              </button>
            </Section>
          )}

          {fencers.length === 0 && pools.length === 0 && (
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
              {t('exportCenter.no_data')}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>{t('actions.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ExportCenterModal);
