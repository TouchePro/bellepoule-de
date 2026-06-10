/**
 * BellePoule Modern - TableauRefereeModal
 * Modal d'assignation d'un arbitre à un match du tableau
 * Licensed under GPL-3.0
 */

import React from 'react';

type RefereeInfo = { id: string; firstName: string; lastName: string };

interface TableauRefereeModalProps {
  currentReferee: RefereeInfo | null;
  referees: Array<RefereeInfo & { club?: string }>;
  onAssign: (referee: RefereeInfo | null) => void;
  onClose: () => void;
}

const TableauRefereeModal: React.FC<TableauRefereeModalProps> = ({
  currentReferee,
  referees,
  onAssign,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Assigner un arbitre</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Sélectionnez l'arbitre pour ce match :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              className={`btn ${!currentReferee ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onAssign(null)}
              style={{ padding: '0.75rem', fontSize: '0.875rem' }}
            >
              ✕ Aucun arbitre
            </button>
            {referees.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center' }}>
                Aucun arbitre enregistré pour cette compétition
              </p>
            )}
            {referees.map(ref => (
              <button
                key={ref.id}
                className={`btn ${currentReferee?.id === ref.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onAssign(ref)}
                style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'left' }}
              >
                🧑‍⚖️ {ref.lastName} {ref.firstName}
                {ref.club && <span style={{ marginLeft: '0.5rem', opacity: 0.6, fontSize: '0.8rem' }}>({ref.club})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableauRefereeModal;
