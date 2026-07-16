/**
 * BellePoule Modern - Edit Fencer Modal Component
 * Licensed under GPL-3.0
 */

import React, { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Fencer, Gender, FencerStatus } from '../../shared/types';
import FencerPhoto from './FencerPhoto';
import { useTranslation } from '../hooks/useTranslation';

interface EditFencerModalProps {
  fencer: Fencer;
  onSave: (id: string, updates: Partial<Fencer>) => void;
  onClose: () => void;
}

const EditFencerModal: React.FC<EditFencerModalProps> = ({ fencer, onSave, onClose }) => {
  const modalRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const { t } = useTranslation();
  const [lastName, setLastName] = useState(fencer.lastName);
  const [firstName, setFirstName] = useState(fencer.firstName);
  const [gender, setGender] = useState<Gender>(fencer.gender);
  const [club, setClub] = useState(fencer.club || '');
  const [region, setRegion] = useState(fencer.region || '');
  const [nationality, setNationality] = useState(fencer.nationality || 'FRA');
  const [license, setLicense] = useState(fencer.license || '');
  const [ranking, setRanking] = useState(fencer.ranking?.toString() || '');
  const [status, setStatus] = useState<FencerStatus>(fencer.status);
  const [photo, setPhoto] = useState<string | undefined>(fencer.photo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave(fencer.id, {
      lastName: lastName.toUpperCase(),
      firstName,
      gender,
      club: club || undefined,
      region: region || undefined,
      nationality,
      license: license || undefined,
      ranking: ranking ? parseInt(ranking) : undefined,
      status,
      photo,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{t('editFencer.title')}</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <FencerPhoto
              photo={photo}
              firstName={firstName}
              lastName={lastName}
              onPhotoChange={setPhoto}
              editable
              size="medium"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('editFencer.last_name')}</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('editFencer.first_name')}</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('fencer.gender')}</label>
              <select
                className="form-input form-select"
                value={gender}
                onChange={e => setGender(e.target.value as Gender)}
              >
                <option value={Gender.MALE}>{t('genders.male')}</option>
                <option value={Gender.FEMALE}>{t('genders.female')}</option>
                <option value={Gender.MIXED}>{t('genders.mixed')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('editFencer.status')}</label>
              <select
                className="form-input form-select"
                value={status}
                onChange={e => setStatus(e.target.value as FencerStatus)}
              >
                <option value={FencerStatus.NOT_CHECKED_IN}>{t('editFencer.not_ranked')}</option>
                <option value={FencerStatus.CHECKED_IN}>{t('editFencer.ranked_present')}</option>
                <option value={FencerStatus.FORFAIT}>{t('status.forfeit')}</option>
                <option value={FencerStatus.ABANDONED}>{t('status.abandoned')}</option>
                <option value={FencerStatus.EXCLUDED}>{t('status.excluded')}</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('fencer.club')}</label>
            <input
              type="text"
              className="form-input"
              value={club}
              onChange={e => setClub(e.target.value)}
              placeholder={t('editFencer.club_example')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('fencer.region')}</label>
              <input
                type="text"
                className="form-input"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder={t('editFencer.region_example')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('fencer.nationality')}</label>
              <input
                type="text"
                className="form-input"
                value={nationality}
                onChange={e => setNationality(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="FRA"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('fencer.license')}</label>
              <input
                type="text"
                className="form-input"
                value={license}
                onChange={e => setLicense(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('fencer.ranking')}</label>
              <input
                type="number"
                className="form-input"
                value={ranking}
                onChange={e => setRanking(e.target.value)}
                min="1"
                placeholder={t('fencer.unranked')}
              />
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

export default React.memo(EditFencerModal);
