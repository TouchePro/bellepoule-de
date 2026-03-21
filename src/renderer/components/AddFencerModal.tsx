/**
 * BellePoule Modern - Add Fencer Modal
 * Licensed under GPL-3.0
 */

import React, { useState } from 'react';
import { Fencer, Gender, FencerStatus } from '../../shared/types';
import { useToast } from './Toast';
import FencerPhoto from './FencerPhoto';

interface AddFencerModalProps {
  onClose: () => void;
  onAdd: (fencer: Partial<Fencer>) => void;
}

const AddFencerModal: React.FC<AddFencerModalProps> = ({ onClose, onAdd }) => {
  const { showToast } = useToast();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [club, setClub] = useState('');
  const [league, setLeague] = useState('');
  const [license, setLicense] = useState('');
  const [ranking, setRanking] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [nationality, setNationality] = useState('FRA');
  const [photo, setPhoto] = useState<string | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!lastName.trim() || !firstName.trim()) {
      showToast('Le nom et le prénom sont obligatoires', 'warning');
      return;
    }

    onAdd({
      lastName: lastName.trim().toUpperCase(),
      firstName: firstName.trim(),
      club: club.trim() || undefined,
      league: league.trim() || undefined,
      license: license.trim() || undefined,
      ranking: ranking ? parseInt(ranking, 10) : undefined,
      gender,
      nationality,
      status: FencerStatus.NOT_CHECKED_IN,
      photo,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ajouter un tireur</h2>
          <button
            className="btn btn-icon btn-secondary"
            onClick={onClose}
            style={{ padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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
                <label className="form-label">Nom *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="DUPONT"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Prénom *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Jean"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Sexe</label>
                <select
                  className="form-input form-select"
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                >
                  <option value={Gender.MALE}>Masculin</option>
                  <option value={Gender.FEMALE}>Féminin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nationalité</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="FRA"
                  value={nationality}
                  onChange={e => setNationality(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Club</label>
              <input
                type="text"
                className="form-input"
                placeholder="PARIS USM"
                value={club}
                onChange={e => setClub(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Ligue</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Île-de-France"
                  value={league}
                  onChange={e => setLeague(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Licence</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="123456789"
                  value={license}
                  onChange={e => setLicense(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Classement</label>
              <input
                type="number"
                className="form-input"
                placeholder="1000"
                value={ranking}
                onChange={e => setRanking(e.target.value)}
                min="1"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Ajouter le tireur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFencerModal;
