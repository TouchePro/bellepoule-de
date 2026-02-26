/**
 * BellePoule Modern - Pool Ranking View Component
 * Shows ranking after pools with export/print functionality
 * Licensed under GPL-3.0
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { PoolRanking, Pool, Weapon, FencerStatus } from '../../shared/types';
import {
  formatRatio,
  formatIndex,
  calculateOverallRankingQuest,
  calculateOverallRanking,
  calculatePoolRanking,
  calculatePoolRankingQuest,
} from '../../shared/utils/poolCalculations';
import { useToast } from './Toast';

interface PoolRankingViewProps {
  pools: Pool[];
  weapon?: Weapon;
  onGoToTableau?: () => void;
  onGoToResults?: () => void;
  hasDirectElimination?: boolean;
  onExport?: (format: 'csv' | 'xml' | 'pdf') => void;
  onPoolsChange?: (pools: Pool[], rankingChanged: boolean) => void;
}

const PoolRankingView: React.FC<PoolRankingViewProps> = ({
  pools,
  weapon,
  onGoToTableau,
  onGoToResults,
  hasDirectElimination = true,
  onExport,
  onPoolsChange,
}) => {
  const { showToast } = useToast();
  const isLaserSabre = weapon === 'L';
  const [recalcKey, setRecalcKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRanking, setEditedRanking] = useState<PoolRanking[]>([]);

  // Calculer le classement général selon le type d'arme
  const overallRanking = useMemo(() => {
    // Utiliser recalcKey pour forcer le recalcul
    const _ = recalcKey;
    return isLaserSabre ? calculateOverallRankingQuest(pools) : calculateOverallRanking(pools);
  }, [pools, isLaserSabre, recalcKey]);

  // Recalculer les classements de toutes les poules
  const handleRecalculate = useCallback(() => {
    // Recalculer le classement de chaque poule
    const updatedPools = pools.map(pool => {
      const newRanking = isLaserSabre
        ? calculatePoolRankingQuest(pool)
        : calculatePoolRanking(pool);
      return {
        ...pool,
        ranking: newRanking,
      };
    });

    // Vérifier si le classement global a changé
    const newOverallRanking = isLaserSabre
      ? calculateOverallRankingQuest(updatedPools)
      : calculateOverallRanking(updatedPools);

    const rankingChanged =
      JSON.stringify(overallRanking.map(r => r.fencer.id)) !==
      JSON.stringify(newOverallRanking.map(r => r.fencer.id));

    // Mettre à jour les pools si callback fourni
    if (onPoolsChange) {
      onPoolsChange(updatedPools, rankingChanged);
    }

    // Forcer le recalcul du classement général
    setRecalcKey(prev => prev + 1);

    if (rankingChanged) {
      showToast('Classement recalculé et modifié ! Le tableau sera régénéré.', 'warning');
    } else {
      showToast('Classement recalculé avec succès !', 'success');
    }
  }, [pools, isLaserSabre, onPoolsChange, showToast, overallRanking]);

  // Initialiser le classement édité quand le classement global change
  useEffect(() => {
    if (!isEditing) {
      setEditedRanking(overallRanking);
    }
  }, [overallRanking, isEditing]);

  const handleExport = (format: 'csv' | 'xml' | 'pdf') => {
    if (onExport) {
      onExport(format);
    } else {
      showToast(`Export ${format.toUpperCase()} non implémenté`, 'warning');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Déplacer un tireur vers le haut
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newRanking = [...editedRanking];
    [newRanking[index], newRanking[index - 1]] = [newRanking[index - 1], newRanking[index]];
    // Mettre à jour les rangs
    newRanking.forEach((r, i) => (r.rank = i + 1));
    setEditedRanking(newRanking);
  };

  // Déplacer un tireur vers le bas
  const moveDown = (index: number) => {
    if (index === editedRanking.length - 1) return;
    const newRanking = [...editedRanking];
    [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]];
    // Mettre à jour les rangs
    newRanking.forEach((r, i) => (r.rank = i + 1));
    setEditedRanking(newRanking);
  };

  // Sauvegarder les modifications
  const saveChanges = () => {
    // TODO: Propager les changements vers les pools si nécessaire
    setIsEditing(false);
    showToast('Classement modifié avec succès !', 'success');
  };

  const generateCSV = () => {
    const headers = ['Rg', 'Nom', 'Prénom', 'Club', 'V', 'M', 'V/M', 'TD', 'TR', 'Statut'];
    if (isLaserSabre) {
      headers.push('Quest', 'Indice');
    } else {
      headers.push('Indice');
    }

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

    const rows = editedRanking.map(r => [
      r.rank,
      r.fencer.lastName,
      r.fencer.firstName,
      r.fencer.club || '',
      r.victories,
      r.victories + r.defeats,
      formatRatio(r.ratio),
      r.touchesScored,
      r.touchesReceived,
      getStatusLabel(r.fencer.status),
      ...(isLaserSabre ? [r.questPoints || 0, formatIndex(r.index)] : [formatIndex(r.index)]),
    ]);

    return [headers, ...rows].map(row => row.join(';')).join('\n');
  };

  return (
    <div className="content" style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Classement après poules</h2>
          <p className="text-sm text-muted">
            {pools.length} poule{pools.length > 1 ? 's' : ''} • {editedRanking.length} tireur
            {editedRanking.length > 1 ? 's' : ''}
            {isEditing && ' (mode édition)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRecalculate}
            title="Recalculer le classement"
          >
            🔄 Recalculer
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport('csv')}
            title="Exporter en CSV"
          >
            📄 CSV
          </button>
          <button className="btn btn-secondary" onClick={handlePrint} title="Imprimer">
            🖨️ Imprimer
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? 'Terminer la modification' : 'Modifier le classement'}
          >
            {isEditing ? '✓ Terminer' : '✏️ Modifier'}
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>Rg</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Club</th>
              <th style={{ width: '40px' }}>V</th>
              <th style={{ width: '40px' }}>M</th>
              <th style={{ width: '60px' }}>V/M</th>
              <th style={{ width: '50px' }}>TD</th>
              <th style={{ width: '50px' }}>TR</th>
              {isLaserSabre && <th style={{ width: '70px', color: '#7c3aed' }}>Quest</th>}
              <th style={{ width: '60px' }}>Indice</th>
            </tr>
          </thead>
          <tbody>
            {editedRanking.map((ranking, index) => (
              <tr key={ranking.fencer.id}>
                <td style={{ fontWeight: '600' }}>
                  {ranking.rank}
                  {isEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '4px' }}>
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        style={{
                          padding: '0 2px',
                          fontSize: '10px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.3 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === editedRanking.length - 1}
                        style={{
                          padding: '0 2px',
                          fontSize: '10px',
                          cursor: index === editedRanking.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === editedRanking.length - 1 ? 0.3 : 1,
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </td>
                <td className="font-medium">
                  {ranking.fencer.lastName}
                  {ranking.fencer.status === FencerStatus.ABANDONED && ' (A)'}
                  {ranking.fencer.status === FencerStatus.FORFAIT && ' (F)'}
                  {ranking.fencer.status === FencerStatus.EXCLUDED && ' (X)'}
                </td>
                <td>{ranking.fencer.firstName}</td>
                <td className="text-sm text-muted">{ranking.fencer.club || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{ranking.victories}</td>
                <td style={{ textAlign: 'center' }}>{ranking.victories + ranking.defeats}</td>
                <td style={{ textAlign: 'center' }}>{formatRatio(ranking.ratio)}</td>
                <td style={{ textAlign: 'center' }}>{ranking.touchesScored}</td>
                <td style={{ textAlign: 'center' }}>{ranking.touchesReceived}</td>
                {isLaserSabre && (
                  <td style={{ textAlign: 'center', fontWeight: '600', color: '#7c3aed' }}>
                    {ranking.questPoints || 0}
                  </td>
                )}
                <td
                  style={{
                    textAlign: 'center',
                    color: ranking.index >= 0 ? '#059669' : '#DC2626',
                    fontWeight: '600',
                  }}
                >
                  {formatIndex(ranking.index)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2rem',
        }}
      >
        <div className="text-sm text-muted">
          <strong>Légende :</strong> V = Victoires, M = Matchs, V/M = Ratio Victoires/Matchs, TD =
          Touches Données, TR = Touches Reçues
          {isLaserSabre && ', Quest = Points Quest (Sabre Laser)'}
          {', Indice = TD - TR'}
          {' • (A) = Abandon • (F) = Forfait • (X) = Exclu'}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasDirectElimination ? (
            <button className="btn btn-primary" onClick={onGoToTableau}>
              Passer au tableau →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onGoToResults}>
              Voir les résultats →
            </button>
          )}
        </div>
      </div>

      {/* CSS pour l'impression */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .btn {
              display: none !important;
            }
            .card {
              border: none !important;
              box-shadow: none !important;
            }
            table {
              font-size: 12pt !important;
            }
            th, td {
              padding: 4px !important;
            }
          }
        `,
        }}
      />
    </div>
  );
};

export default PoolRankingView;
