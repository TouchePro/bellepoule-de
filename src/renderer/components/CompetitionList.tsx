/**
 * BellePoule Modern - Competition List Component
 * Licensed under GPL-3.0
 */

import React from 'react';
import { Competition, Weapon, Gender, Category } from '../../shared/types';
import { useTranslation } from '../hooks/useTranslation';

interface CompetitionListProps {
  competitions: Competition[];
  isLoading: boolean;
  onSelect: (competition: Competition) => void;
  onDelete: (id: string) => void;
  onNewCompetition: () => void;
}

const CompetitionListComponent: React.FC<CompetitionListProps> = ({
  competitions,
  isLoading,
  onSelect,
  onDelete,
  onNewCompetition,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="content">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <div className="text-muted">{t('messages.loading')}</div>
        </div>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="content">
        <div className="flex justify-between items-center mb-4">
          <h1 className="page-title">{t('app.title')}</h1>
          <button className="btn btn-primary btn-lg" onClick={onNewCompetition}>
            + {t('menu.new_competition')}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <div className="empty-state">
            <div className="empty-state-icon">🤺</div>
            <h2 className="empty-state-title">{t('messages.no_competitions')}</h2>
            <p className="empty-state-description">
              {t('messages.no_competitions')} {t('messages.create_competition')} &quot;+{' '}
              {t('menu.new_competition')}&quot;.
            </p>
            <button className="btn btn-primary btn-lg" onClick={onNewCompetition}>
              + {t('menu.new_competition')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="content">
      <div className="flex justify-between items-center mb-4">
        <h1 className="page-title">{t('app.title')}</h1>
        <button className="btn btn-primary btn-lg" onClick={onNewCompetition}>
          + {t('menu.new_competition')}
        </button>
      </div>

      <div className="competition-grid">
        {competitions.map(competition => (
          <div
            key={competition.id}
            className="card competition-card"
            onClick={() => onSelect(competition)}
            style={{
              background: competition.color || '#3B82F6',
              borderLeft: `4px solid ${competition.color || '#3B82F6'}`,
            }}
          >
            <div className="card-body">
              <div className="card-header">
                <h3 className="card-title">{competition.title}</h3>
                <div className="card-actions">
                  <button
                    className="btn btn-icon btn-secondary"
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(competition.id);
                    }}
                    title={t('actions.delete')}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="card-content">
                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-label">{t('competition.date')}:</span>
                    <span>{formatDate(competition.date)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">{t('competition.location')}:</span>
                    <span>{competition.location || t('actions.default')}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">{t('competition.weapon')}:</span>
                    <span>{competition.weapon}</span>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="card-status">{t('actions.view')} →</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CompetitionList = React.memo(CompetitionListComponent);
export default CompetitionList;
