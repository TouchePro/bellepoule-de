import React, { useState } from 'react';
import { X, Swords, Minus, Plus } from 'lucide-react';
import { Weapon } from '../../../shared/types';

interface Props {
  onClose: () => void;
  onLaunch: (weapon: string, strips: number) => void;
  isLoading: boolean;
}

const WEAPON_LABELS: Record<string, string> = {
  [Weapon.EPEE]: 'Épée',
  [Weapon.FOIL]: 'Fleuret',
  [Weapon.SABRE]: 'Sabre',
  [Weapon.LASER]: 'Laser Sabre',
};

const TrainingLauncherModal: React.FC<Props> = ({ onClose, onLaunch, isLoading }) => {
  const [weapon, setWeapon] = useState<string>(Weapon.EPEE);
  const [strips, setStrips] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunch(weapon, strips);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-xl)',
          width: '420px',
          padding: '1.5rem',
          color: 'var(--color-text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Swords size={18} /> Mode Entraînement
          </h2>
          <button className="btn btn-icon" onClick={onClose} title="Fermer"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Arme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.entries(WEAPON_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWeapon(key)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '8px',
                    border: weapon === key ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                    background: weapon === key ? 'var(--color-primary-soft, rgba(99,102,241,0.1))' : 'transparent',
                    color: weapon === key ? 'var(--color-primary)' : 'var(--color-text)',
                    fontWeight: weapon === key ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Nombre de pistes
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => setStrips(s => Math.max(1, s - 1))}
                disabled={strips <= 1}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, minWidth: '2rem', textAlign: 'center' }}>
                {strips}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => setStrips(s => Math.min(20, s + 1))}
                disabled={strips >= 20}
              >
                <Plus size={14} />
              </button>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                piste{strips > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Démarrage…' : 'Lancer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainingLauncherModal;
