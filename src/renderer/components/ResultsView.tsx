/**
 * BellePoule Modern - Results View Component
 * Final competition results display
 * Licensed under GPL-3.0
 */

import React from 'react';
import { Fencer, PoolRanking, Competition, FencerStatus } from '../../shared/types';
import { useToast } from './Toast';
import { exportResultsXMLFFE } from '../../shared/utils/multiFormatExport';
import { exportResultsToPDF } from '../../shared/utils/pdfExport';
import { usePdfTemplateStore } from '../../features/pdfTemplates/hooks/usePdfTemplateStore';

interface FinalResult {
  rank: number;
  fencer: Fencer;
  eliminatedAt?: string; // "Finale", "Demi-finale", etc.
}

interface ResultsViewProps {
  competition: Competition;
  poolRanking: PoolRanking[];
  finalResults: FinalResult[];
}

const ResultsView: React.FC<ResultsViewProps> = ({ competition, poolRanking, finalResults }) => {
  const { showToast } = useToast();
  const rankingTemplate = usePdfTemplateStore(s => s.templates.ranking);

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const getRowStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return { background: '#fef3c7', fontWeight: '600' };
    if (rank === 2) return { background: '#f3f4f6', fontWeight: '500' };
    if (rank === 3) return { background: '#fed7aa', fontWeight: '500' };
    return {};
  };

  const resultsToDisplay = (() => {
    if (finalResults.length === 0) {
      return poolRanking.map((pr, idx) => ({
        rank: idx + 1,
        fencer: pr.fencer,
        eliminatedAt: 'Poules' as const,
      }));
    }
    const tableauIds = new Set(finalResults.map(r => r.fencer.id));
    const poolEliminated = poolRanking
      .filter(pr => !tableauIds.has(pr.fencer.id))
      .map((pr, idx) => ({
        rank: finalResults.length + idx + 1,
        fencer: pr.fencer,
        eliminatedAt: 'Poules' as const,
      }));
    return [...finalResults, ...poolEliminated];
  })();

  // Export CSV
  const exportCSV = () => {
    const headers = ['Rang', 'Nom', 'Prénom', 'Club', 'Statut', 'Éliminé à'];

    const getStatusLabel = (status: FencerStatus) => {
      switch (status) {
        case FencerStatus.ABANDONED:
          return 'A';
        case FencerStatus.FORFAIT:
          return 'F';
        case FencerStatus.EXCLUDED:
          return 'X';
        default:
          return '';
      }
    };

    const rows = resultsToDisplay.map(r => {
      return [
        r.rank,
        r.fencer.lastName,
        r.fencer.firstName,
        r.fencer.club || '',
        getStatusLabel(r.fencer.status),
        r.eliminatedAt || '',
      ];
    });

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultats_${competition.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    showToast('Export CSV réussi !', 'success');
  };

  // Export PDF
  const exportPDF = async () => {
    try {
      const logo = localStorage.getItem('bellepoule-logo') ?? undefined;
      await exportResultsToPDF(
        resultsToDisplay,
        `Résultats — ${competition.title}`,
        logo,
        rankingTemplate
      );
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  // Export XML
  const exportXML = () => {
    const xmlContent = exportResultsXMLFFE(
      competition,
      poolRanking,
      resultsToDisplay.map(r => ({
        rank: r.rank,
        fencer: r.fencer,
        eliminatedAt: r.eliminatedAt,
      }))
    );

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultats_${competition.title.replace(/[^a-z0-9]/gi, '_')}.xml`;
    link.click();
    showToast('Export XML réussi !', 'success');
  };

  const champion = resultsToDisplay.find(r => r.rank === 1);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* En-tête avec le champion */}
      {champion && (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            borderRadius: '12px',
            marginBottom: '2rem',
            color: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Champion</h1>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>
            {champion.fencer.firstName} {champion.fencer.lastName}
          </div>
          {champion.fencer.club && (
            <div style={{ opacity: 0.9, marginTop: '0.5rem' }}>{champion.fencer.club}</div>
          )}
        </div>
      )}

      {/* Podium visuel */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem',
        }}
      >
        {/* 2ème place */}
        {resultsToDisplay[1] && (
          <div
            style={{
              textAlign: 'center',
              background: '#e5e7eb',
              padding: '1rem',
              borderRadius: '8px 8px 0 0',
              minWidth: '150px',
              height: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ fontSize: '2rem' }}>🥈</div>
            <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
              {resultsToDisplay[1].fencer.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>2ème</div>
          </div>
        )}

        {/* 1ère place */}
        {resultsToDisplay[0] && (
          <div
            style={{
              textAlign: 'center',
              background: '#fef3c7',
              padding: '1rem',
              borderRadius: '8px 8px 0 0',
              minWidth: '150px',
              height: '160px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              border: '2px solid #f59e0b',
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>🥇</div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>
              {resultsToDisplay[0].fencer.lastName}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#92400e' }}>1er</div>
          </div>
        )}

        {/* 3ème place */}
        {resultsToDisplay[2] && (
          <div
            style={{
              textAlign: 'center',
              background: '#fed7aa',
              padding: '1rem',
              borderRadius: '8px 8px 0 0',
              minWidth: '150px',
              height: '100px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>🥉</div>
            <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
              {resultsToDisplay[2].fencer.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>3ème</div>
          </div>
        )}
      </div>

      {/* Tableau complet des résultats */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: '600',
          }}
        >
          📊 Classement final - {resultsToDisplay.length} tireurs
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', width: '60px' }}>Rang</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tireur</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Club</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Éliminé en</th>
            </tr>
          </thead>
          <tbody>
            {resultsToDisplay.map(result => (
              <tr
                key={result.fencer.id}
                style={{
                  ...getRowStyle(result.rank),
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ marginRight: '0.5rem' }}>{getMedalEmoji(result.rank)}</span>
                  {result.rank}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {result.fencer.firstName} {result.fencer.lastName}
                  {result.fencer.status === FencerStatus.ABANDONED && ' (A)'}
                  {result.fencer.status === FencerStatus.FORFAIT && ' (F)'}
                  {result.fencer.status === FencerStatus.EXCLUDED && ' (X)'}
                </td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                  {result.fencer.club || '-'}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280' }}>
                  {result.eliminatedAt || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Boutons d'export */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => window.electronAPI.print()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          🖨️ Imprimer
        </button>
        <button
          onClick={() => {
            const text = resultsToDisplay
              .map(
                r =>
                  `${r.rank}. ${r.fencer.firstName} ${r.fencer.lastName} (${r.fencer.club || 'Sans club'})`
              )
              .join('\n');
            navigator.clipboard.writeText(text);
            showToast('Résultats copiés dans le presse-papier !', 'success');
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          📋 Copier
        </button>
        <button
          onClick={exportCSV}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          📊 CSV
        </button>
        <button
          onClick={exportXML}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          📝 XML
        </button>
        <button
          onClick={exportPDF}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          📄 PDF
        </button>
      </div>

      {/* Légende */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: '#6b7280',
        }}
      >
        (A) = Abandon • (F) = Forfait • (X) = Exclu
      </div>
    </div>
  );
};

export default React.memo(ResultsView);
