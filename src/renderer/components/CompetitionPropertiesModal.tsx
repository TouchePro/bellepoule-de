/**
 * BellePoule Modern - Competition Properties Modal
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import { Competition, Weapon, Gender, Category, CompetitionSettings } from '../../shared/types';
import { useTranslation } from '../hooks/useTranslation';

interface CompetitionPropertiesModalProps {
  competition: Competition;
  onSave: (updates: Partial<Competition>) => void;
  onClose: () => void;
}

const CompetitionPropertiesModal: React.FC<CompetitionPropertiesModalProps> = ({
  competition,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(competition.title);
  const [date, setDate] = useState(new Date(competition.date).toISOString().split('T')[0]);
  const [location, setLocation] = useState(competition.location || '');
  const [organizer, setOrganizer] = useState(competition.organizer || '');
  const [weapon, setWeapon] = useState<Weapon>(competition.weapon);
  const [gender, setGender] = useState<Gender>(competition.gender);
  const [category, setCategory] = useState<Category>(competition.category);

  // Paramètres de compétition
  const [poolRounds, setPoolRounds] = useState(competition.settings?.poolRounds ?? 1);
  const [hasDirectElimination, setHasDirectElimination] = useState(
    competition.settings?.hasDirectElimination ?? true
  );
  const [poolMaxScore, setPoolMaxScore] = useState(competition.settings?.defaultPoolMaxScore ?? 21);
  const [tableMaxScore, setTableMaxScore] = useState(
    competition.settings?.defaultTableMaxScore ?? 21
  );
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(
    competition.settings?.thirdPlaceMatch ?? false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settings: CompetitionSettings = {
      ...(competition.settings || {}),
      poolRounds,
      hasDirectElimination,
      thirdPlaceMatch,
      defaultPoolMaxScore: poolMaxScore,
      defaultTableMaxScore: tableMaxScore,
      manualRanking: competition.settings?.manualRanking ?? false,
      defaultRanking: competition.settings?.defaultRanking ?? 9999,
      randomScore: competition.settings?.randomScore ?? false,
      minTeamSize: competition.settings?.minTeamSize ?? 3,
    };

    onSave({
      title,
      date: new Date(date),
      location,
      organizer,
      weapon,
      gender,
      category,
      settings,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2>{t('menu.competition_properties')}</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Informations générales */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              {t('competition.general_info')}
            </h3>

            <div className="form-group">
              <label htmlFor="title">{t('competition.title')}</label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="date">{t('competition.date')}</label>
                <input
                  type="date"
                  id="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">{t('competition.location')}</label>
                <input
                  type="text"
                  id="location"
                  className="form-input"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="organizer">{t('competition.organizer')}</label>
              <input
                type="text"
                id="organizer"
                className="form-input"
                value={organizer}
                onChange={e => setOrganizer(e.target.value)}
              />
            </div>
          </div>

          {/* Configuration */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              {t('competition.settings')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="weapon">{t('competition.weapon')}</label>
                <select
                  id="weapon"
                  className="form-input form-select"
                  value={weapon}
                  onChange={e => setWeapon(e.target.value as Weapon)}
                >
                  <option value="E">{t('weapons.epee')}</option>
                  <option value="F">{t('weapons.foil')}</option>
                  <option value="S">{t('weapons.sabre')}</option>
                  <option value="L">{t('weapons.laser')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="gender">{t('competition.gender')}</label>
                <select
                  id="gender"
                  className="form-input form-select"
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                >
                  <option value="M">{t('genders.male')}</option>
                  <option value="F">{t('genders.female')}</option>
                  <option value="X">{t('genders.mixed')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">{t('competition.category')}</label>
                <select
                  id="category"
                  className="form-input form-select"
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                >
                  <option value="U11">{t('categories.U11')}</option>
                  <option value="U13">{t('categories.U13')}</option>
                  <option value="U15">{t('categories.U15')}</option>
                  <option value="U17">{t('categories.U17')}</option>
                  <option value="U20">{t('categories.U20')}</option>
                  <option value="SEN">{t('categories.senior')}</option>
                  <option value="V1">{t('categories.V1')}</option>
                  <option value="V2">{t('categories.V2')}</option>
                  <option value="V3">{t('categories.V3')}</option>
                  <option value="V4">{t('categories.V4')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Paramètres de formule */}
          <div style={{ marginBottom: '1rem' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              {t('competition.competition_format')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="poolRounds">{t('settings.pool_rounds')}</label>
                <select
                  id="poolRounds"
                  className="form-input form-select"
                  value={poolRounds}
                  onChange={e => setPoolRounds(parseInt(e.target.value))}
                >
                  <option value="1">{t('settings.pool_rounds_one')}</option>
                  <option value="2">{t('settings.pool_rounds_two')}</option>
                  <option value="3">{t('settings.pool_rounds_three')}</option>
                </select>
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('settings.pool_rounds_description')}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="hasDirectElimination">
                  {t('settings.has_direct_elimination')}
                </label>
                <select
                  id="hasDirectElimination"
                  className="form-input form-select"
                  value={hasDirectElimination ? 'true' : 'false'}
                  onChange={e => setHasDirectElimination(e.target.value === 'true')}
                >
                  <option value="true">{t('actions.yes')}</option>
                  <option value="false">{t('actions.no')}</option>
                </select>
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  {hasDirectElimination
                    ? t('settings.direct_elimination_enabled')
                    : t('settings.direct_elimination_disabled')}
                </small>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1rem',
              }}
            >
              <div className="form-group">
                <label htmlFor="poolMaxScore">{t('settings.default_pool_max_score')}</label>
                <input
                  type="number"
                  id="poolMaxScore"
                  className="form-input"
                  value={poolMaxScore}
                  onChange={e => setPoolMaxScore(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  placeholder="21"
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('settings.pool_max_score_description')}
                </small>
              </div>

              {hasDirectElimination && (
                <>
                  <div className="form-group">
                    <label htmlFor="tableMaxScore">{t('settings.default_table_max_score')}</label>
                    <input
                      type="number"
                      id="tableMaxScore"
                      className="form-input"
                      value={tableMaxScore}
                      onChange={e => setTableMaxScore(parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="21"
                    />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {tableMaxScore === 0
                        ? t('settings.unlimited')
                        : `${tableMaxScore} ${t('settings.touches_to_win')}`}
                    </small>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={thirdPlaceMatch}
                        onChange={e => setThirdPlaceMatch(e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      {t('competition.third_place_match_label')}
                    </label>
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '1.5rem' }}>
                      {t('competition.third_place_match_description')}
                    </small>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('actions.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompetitionPropertiesModal;
