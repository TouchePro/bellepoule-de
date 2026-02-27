/**
 * BellePoule Modern - Fencer List Component
 * Licensed under GPL-3.0
 */

import React, { useState } from 'react';
import { Fencer, FencerStatus } from '../../shared/types';
import EditFencerModal from './EditFencerModal';
import { useTranslation } from '../hooks/useTranslation';
import { exportFencersToTXT, exportFencersToFFF } from '../../shared/utils/fencerExport';
import { useConfirm } from './ConfirmDialog';

interface FencerListProps {
  fencers: Fencer[];
  onCheckIn: (id: string) => void;
  onAddFencer: () => void;
  onEditFencer?: (id: string, updates: Partial<Fencer>) => void;
  onDeleteFencer?: (id: string) => void;
  onDeleteAllFencers?: () => void;
  onCheckInAll?: () => void;
  onUncheckAll?: () => void;
  onSetFencerStatus?: (id: string, status: FencerStatus) => void;
  onImport?: () => void;
}

const FencerListComponent: React.FC<FencerListProps> = ({
  fencers,
  onCheckIn,
  onAddFencer,
  onEditFencer,
  onDeleteFencer,
  onDeleteAllFencers,
  onCheckInAll,
  onUncheckAll,
  onSetFencerStatus,
  onImport,
}) => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();

  const statusLabels: Record<FencerStatus, { label: string; color: string }> = {
    [FencerStatus.CHECKED_IN]: { label: t('status.checked_in'), color: 'badge-success' },
    [FencerStatus.NOT_CHECKED_IN]: { label: t('status.not_checked_in'), color: 'badge-warning' },
    [FencerStatus.QUALIFIED]: { label: t('status.qualified'), color: 'badge-success' },
    [FencerStatus.ELIMINATED]: { label: t('status.eliminated'), color: 'badge-danger' },
    [FencerStatus.ABANDONED]: { label: t('status.abandoned'), color: 'badge-danger' },
    [FencerStatus.EXCLUDED]: { label: t('status.excluded'), color: 'badge-danger' },
    [FencerStatus.FORFAIT]: { label: t('status.forfeit'), color: 'badge-danger' },
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'club' | 'ranking' | 'age'>('ranking');
  const [editingFencer, setEditingFencer] = useState<Fencer | null>(null);
  const filteredFencers = fencers
    .filter(f => {
      const search = searchTerm.toLowerCase();
      return (
        f.lastName.toLowerCase().includes(search) ||
        f.firstName.toLowerCase().includes(search) ||
        f.club?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.lastName.localeCompare(b.lastName);
        case 'club':
          return (a.club || '').localeCompare(b.club || '');
        case 'ranking':
          return (a.ranking ?? 99999) - (b.ranking ?? 99999);
        case 'age':
          return new Date(a.birthDate ?? 0).getTime() - new Date(b.birthDate ?? 0).getTime();
        default:
          return 0;
      }
    });

  const checkedInCount = fencers.filter(f => f.status === FencerStatus.CHECKED_IN).length;
  const notCheckedInCount = fencers.filter(f => f.status === FencerStatus.NOT_CHECKED_IN).length;

  const handleEditSave = (id: string, updates: Partial<Fencer>) => {
    if (onEditFencer) {
      onEditFencer(id, updates);
    }
    setEditingFencer(null);
  };

  const handleExportFencers = async (format: 'txt' | 'fff') => {
    const extension = format === 'fff' ? 'fff' : 'txt';
    const filterName = format === 'fff' ? 'Fichier FFE' : 'Fichier texte';

    const result = await window.electronAPI.dialog.saveFile({
      title: `Exporter les tireurs (.${extension})`,
      defaultPath: `tireurs.${extension}`,
      filters: [
        { name: filterName, extensions: [extension] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    });

    if (result && !result.canceled && result.filePath) {
      const content = format === 'fff' ? exportFencersToFFF(fencers) : exportFencersToTXT(fencers);
      await window.electronAPI.file.writeContent(result.filePath, content);
    }
  };

  const handleImportFencers = () => {
    if (onImport) {
      onImport();
    }
  };

  const handleDeleteFencer = async (id: string) => {
    if (await confirm(t('messages.confirm_delete_fencer'))) {
      if (editingFencer && editingFencer.id === id) {
        setEditingFencer(null);
      }
      if (onDeleteFencer) {
        onDeleteFencer(id);
      }
    }
  };

  const handleSetFencerStatus = async (
    id: string,
    status: FencerStatus,
    confirmationMessage?: string
  ) => {
    if (confirmationMessage) {
      if (await confirm(confirmationMessage)) {
        if (onSetFencerStatus) {
          onSetFencerStatus(id, status);
        }
      }
    } else {
      if (onSetFencerStatus) {
        onSetFencerStatus(id, status);
      }
    }
  };

  return (
    <div className="content">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{t('fencer.add')}</h2>
          <p className="text-sm text-muted">
            {checkedInCount} / {fencers.length} {t('fencer.points').toLowerCase()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {notCheckedInCount > 0 && onCheckInAll && (
            <button
              className="btn btn-secondary"
              onClick={onCheckInAll}
              title={`Pointer les ${notCheckedInCount} tireurs non pointés`}
            >
              ✓ {t('actions.check_in_all')}
            </button>
          )}
          {checkedInCount > 0 && onUncheckAll && (
            <button
              className="btn btn-secondary"
              onClick={onUncheckAll}
              title={t('fencer.uncheck_all')}
            >
              ✗ {t('actions.uncheck_all')}
            </button>
          )}
          {fencers.length > 0 && onDeleteAllFencers && (
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (await confirm(t('messages.confirm_delete_fencer'))) {
                  onDeleteAllFencers();
                }
              }}
              title={`Supprimer les ${fencers.length} tireurs`}
            >
              🗑️ {t('actions.delete')}
            </button>
          )}
          {onImport && (
            <button
              className="btn btn-secondary"
              onClick={handleImportFencers}
              title="Importer depuis un fichier (.ffe, .csv, .txt)"
            >
              📥 Importer
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => handleExportFencers('txt')}
            title="Exporter en TXT"
          >
            TXT
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExportFencers('fff')}
            title="Exporter en FFF"
          >
            FFF
          </button>
          <button className="btn btn-primary" onClick={onAddFencer}>
            + {t('fencer.add')}
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body flex gap-4">
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select
            className="form-input form-select"
            style={{ width: '200px' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
          >
            <option value="ranking">Par classement</option>
            <option value="name">Par nom</option>
            <option value="age">Par âge</option>
            <option value="club">Par club</option>
          </select>
        </div>
      </div>

      {filteredFencers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤺</div>
          <h2 className="empty-state-title">Aucun tireur</h2>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>N°</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Né(e)</th>
                <th>Club</th>
                <th>Classement</th>
                <th>Statut</th>
                <th style={{ width: '250px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFencers.map(fencer => (
                <tr key={fencer.id}>
                  <td className="text-muted">{fencer.ref}</td>
                  <td className="font-medium">{fencer.lastName}</td>
                  <td>{fencer.firstName}</td>
                  <td className="text-sm text-muted">
                    {fencer.birthDate ? new Date(fencer.birthDate).getFullYear() : '-'}
                  </td>
                  <td className="text-sm text-muted">{fencer.club || '-'}</td>
                  <td className="text-sm">{fencer.ranking ? `#${fencer.ranking}` : '-'}</td>
                  <td>
                    <span className={`badge ${statusLabels[fencer.status].color}`}>
                      {statusLabels[fencer.status].label}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.25rem',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingFencer(fencer)}
                        title="Modifier"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn btn-sm ${fencer.status === FencerStatus.CHECKED_IN ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => onCheckIn(fencer.id)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        {fencer.status === FencerStatus.CHECKED_IN ? 'Annuler' : 'Pointer'}
                      </button>
                      {onSetFencerStatus && fencer.status === FencerStatus.CHECKED_IN && (
                        <>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() =>
                              handleSetFencerStatus(
                                fencer.id,
                                FencerStatus.ABANDONED,
                                t('messages.confirm_abandon', {
                                  name: `${fencer.lastName} ${fencer.firstName}`,
                                })
                              )
                            }
                            title="Abandonner"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            🚶
                          </button>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() =>
                              handleSetFencerStatus(
                                fencer.id,
                                FencerStatus.FORFAIT,
                                t('messages.confirm_forfait', {
                                  name: `${fencer.lastName} ${fencer.firstName}`,
                                })
                              )
                            }
                            title="Forfait"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            📋
                          </button>
                        </>
                      )}
                      {onSetFencerStatus &&
                        (fencer.status === FencerStatus.ABANDONED ||
                          fencer.status === FencerStatus.FORFAIT) && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() =>
                              handleSetFencerStatus(
                                fencer.id,
                                FencerStatus.CHECKED_IN,
                                t('messages.confirm_reactivate', {
                                  name: `${fencer.lastName} ${fencer.firstName}`,
                                })
                              )
                            }
                            title="Réactiver"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            ✅
                          </button>
                        )}
                      {onDeleteFencer && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteFencer(fencer.id)}
                          title="Supprimer"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingFencer && (
        <EditFencerModal
          fencer={editingFencer}
          onSave={handleEditSave}
          onClose={() => setEditingFencer(null)}
        />
      )}
    </div>
  );
};

const FencerList = React.memo(FencerListComponent);
export default FencerList;
