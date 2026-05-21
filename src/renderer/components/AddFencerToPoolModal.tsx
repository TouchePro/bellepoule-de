/**
 * BellePoule Modern - Add Fencer To Pool Modal
 * Allows adding an unassigned fencer to a pool mid-competition
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Fencer, Pool } from '../../shared/types';
import { useToast } from './Toast';

interface AddFencerToPoolModalProps {
  pool: Pool;
  competitionId: string;
  maxScore?: number;
  onConfirm: (updatedPool: Pool) => void;
  onClose: () => void;
}

const AddFencerToPoolModalComponent: React.FC<AddFencerToPoolModalProps> = ({
  pool,
  competitionId,
  maxScore = 5,
  onConfirm,
  onClose,
}) => {
  const { showToast } = useToast();
  const [allFencers, setAllFencers] = useState<Fencer[]>([]);
  const [allPoolFencerIds, setAllPoolFencerIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedFencer, setSelectedFencer] = useState<Fencer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      window.electronAPI.db.getFencersByCompetition(competitionId),
      window.electronAPI.db.getPhasesByCompetition(competitionId).then(phases =>
        Promise.all(
          phases
            .filter((p: { type: string }) => p.type === 'pool')
            .map((p: { id: string }) => window.electronAPI.db.getPoolFencers(p.id))
        )
      ),
    ]).then(([fencers, poolFencerArrays]) => {
      setAllFencers(fencers);
      const ids = new Set<string>();
      for (const arr of poolFencerArrays) {
        for (const f of arr as Fencer[]) ids.add(f.id);
      }
      setAllPoolFencerIds(ids);
    });
  }, [competitionId]);

  const available = useMemo(() => {
    const poolFencerIds = new Set(pool.fencers.map(f => f.id));
    const q = search.toLowerCase();
    return allFencers.filter(
      f =>
        !poolFencerIds.has(f.id) &&
        !allPoolFencerIds.has(f.id) &&
        (`${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
          f.lastName.toLowerCase().includes(q))
    );
  }, [allFencers, allPoolFencerIds, pool.fencers, search]);

  const handleAdd = async () => {
    if (!selectedFencer) return;
    setIsLoading(true);
    try {
      const updatedPool = await window.electronAPI.db.addFencerToPoolMidCompetition(
        pool.id,
        selectedFencer.id,
        maxScore
      );
      onConfirm(updatedPool);
    } catch (err) {
      showToast(
        "Erreur lors de l'ajout : " + (err instanceof Error ? err.message : 'Erreur inconnue'),
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>Ajouter un tireur – Poule {pool.number}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: '0.75rem',
              background: '#fef3c7',
              borderRadius: '6px',
              marginBottom: '1rem',
              color: '#92400e',
              fontSize: '0.875rem',
            }}
          >
            ⚠️ <strong>Opération de sauvetage :</strong> le tireur sera ajouté sans rééquilibrage.
            Des matchs contre tous les tireurs présents seront créés.
          </div>

          <input
            type="text"
            placeholder="Rechercher par nom…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          >
            {available.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                }}
              >
                Aucun tireur disponible
              </div>
            ) : (
              available.map(f => {
                const isSelected = selectedFencer?.id === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFencer(isSelected ? null : f)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f9fafb';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                      {f.lastName} {f.firstName}
                    </span>
                    {f.club && (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{f.club}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!selectedFencer || isLoading}
          >
            {isLoading ? 'Ajout…' : 'Ajouter le tireur'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AddFencerToPoolModal = React.memo(AddFencerToPoolModalComponent);
export default AddFencerToPoolModal;
