import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { PoolRanking } from '../../../shared/types';

interface SeedingTableProps {
  ranking: PoolRanking[];
  tableauSize: number;
}

const SeedingTable: React.FC<SeedingTableProps> = ({ ranking, tableauSize }) => {
  const { t } = useTranslation();
  return (
  <div style={{ marginTop: '2rem' }}>
    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
      {t('seedingTable.after_pools')}
    </h3>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.5rem',
        maxHeight: '200px',
        overflowY: 'auto',
      }}
    >
      {ranking.slice(0, tableauSize).map((r, idx) => (
        <div
          key={r.fencer.id}
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.25rem 0.5rem',
            background: idx < 8 ? '#dbeafe' : 'white',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ fontWeight: '600', minWidth: '24px' }}>{idx + 1}.</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            <span>
              {r.fencer.lastName} {r.fencer.firstName}
            </span>
            <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>
              {r.fencer.club && r.fencer.club}
              {r.fencer.birthDate && ` • ${new Date(r.fencer.birthDate).getFullYear()}`}
              {r.fencer.ranking && ` • #${r.fencer.ranking}`}
            </span>
          </div>
          <span style={{ marginLeft: 'auto', color: '#6b7280' }}>
            {(r.ratio * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  </div>
  );
};

export default React.memo(SeedingTable);
