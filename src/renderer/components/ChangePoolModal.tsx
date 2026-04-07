/**
 * BellePoule Modern - Change Pool Modal Component
 * Allows moving a fencer from one pool to another
 * Licensed under GPL-3.0
 */

import React, { useState } from 'react';
import { Fencer, Pool, MatchStatus } from '../../shared/types';
import { useTranslation } from '../hooks/useTranslation';

interface ChangePoolModalProps {
  fencer: Fencer;
  currentPool: Pool;
  allPools: Pool[];
  onMove: (fencerId: string, fromPoolIndex: number, toPoolIndex: number) => void;
  onClose: () => void;
}

const ChangePoolModal: React.FC<ChangePoolModalProps> = ({
  fencer,
  currentPool,
  allPools,
  onMove,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null);

  const currentPoolIndex = allPools.findIndex(p => p.id === currentPool.id);
  const otherPools = allPools
    .map((pool, index) => ({ pool, index }))
    .filter(({ pool }) => pool.id !== currentPool.id);

  // Vérifier si des matches ont été joués dans la poule actuelle impliquant ce tireur
  const hasPlayedMatches = currentPool.matches.some(
    m =>
      m.status === MatchStatus.FINISHED &&
      (m.fencerA?.id === fencer.id || m.fencerB?.id === fencer.id)
  );

  const handleMove = () => {
    if (selectedPoolIndex !== null) {
      onMove(fencer.id, currentPoolIndex, selectedPoolIndex);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>{t('change_pool_modal.title')}</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: '1rem',
              background: '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              {t('change_pool_modal.selected_fencer')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              {fencer.firstName} {fencer.lastName}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {t('change_pool_modal.currently_in_pool', { number: String(currentPool.number) })}
            </div>
          </div>

          {hasPlayedMatches && (
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
              ⚠️ <strong>{t('change_pool_modal.attention')}</strong>{' '}
              {t('change_pool_modal.warning_message')}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
              }}
            >
              {t('change_pool_modal.move_to')}
            </label>

            {otherPools.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '6px',
                }}
              >
                {t('change_pool_modal.no_other_pools')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {otherPools.map(({ pool, index }) => {
                  const matchesPlayed = pool.matches.filter(
                    m => m.status === MatchStatus.FINISHED
                  ).length;
                  const isSelected = selectedPoolIndex === index;

                  return (
                    <div
                      key={pool.id}
                      onClick={() => setSelectedPoolIndex(index)}
                      style={{
                        padding: '0.75rem 1rem',
                        border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'white',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '600' }}>
                            {t('pools.pool_number')} {pool.number}
                          </span>
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.875rem',
                              color: '#6b7280',
                            }}
                          >
                            ({pool.fencers.length} {t('change_pool_modal.fencers')})
                          </span>
                        </div>
                        {matchesPlayed > 0 && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.125rem 0.5rem',
                              background: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '4px',
                            }}
                          >
                            {matchesPlayed}{' '}
                            {matchesPlayed > 1
                              ? t('change_pool_modal.matches_played')
                              : t('change_pool_modal.match_played')}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          marginTop: '0.25rem',
                        }}
                      >
                        {pool.fencers.map(f => f.lastName).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedPoolIndex !== null && (
            <div
              style={{
                padding: '0.75rem',
                background: '#f0fdf4',
                borderRadius: '6px',
                color: '#166534',
                fontSize: '0.875rem',
              }}
            >
              ✓ {t('change_pool_modal.matches_will_be_recalculated')}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMove}
            disabled={selectedPoolIndex === null}
          >
            {t('change_pool_modal.move_fencer')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePoolModal;
