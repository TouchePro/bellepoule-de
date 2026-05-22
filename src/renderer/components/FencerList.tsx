/**
 * BellePoule Modern - Fencer List Component
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useVirtualList } from '../../shared/services/performanceService';
import QRCode from 'qrcode';
import { Fencer, FencerStatus } from '../../shared/types';
import EditFencerModal from './EditFencerModal';
import { useTranslation } from '../hooks/useTranslation';
import { exportFencersToTXT, exportFencersToFFF } from '../../shared/utils/fencerExport';
import { useConfirm } from './ConfirmDialog';

interface FencerListProps {
  fencers: Fencer[];
  competitionId?: string;
  onCheckIn: (id: string) => void;
  onAddFencer: () => void;
  onEditFencer?: (id: string, updates: Partial<Fencer>) => void;
  onDeleteFencer?: (id: string) => void;
  onDeleteAllFencers?: () => void;
  onCheckInAll?: () => void;
  onUncheckAll?: () => void;
  onSetFencerStatus?: (id: string, status: FencerStatus) => void;
  onImport?: (type: 'xml' | 'fff' | 'ranking') => void;
  onFencersImported?: () => void;
  /** URL de la page d'inscription distante (ex: http://192.168.x.x:8066/register) */
  registerUrl?: string;
  /** Callback pour recharger la liste après inscription distante */
  onFencersChanged?: () => void;
}

const FencerListComponent: React.FC<FencerListProps> = ({
  fencers,
  competitionId,
  onCheckIn,
  onAddFencer,
  onEditFencer,
  onDeleteFencer,
  onDeleteAllFencers,
  onCheckInAll,
  onUncheckAll,
  onSetFencerStatus,
  onImport,
  onFencersImported,
  registerUrl,
  onFencersChanged,
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
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [editingFencer, setEditingFencer] = useState<Fencer | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const [showRegisterQR, setShowRegisterQR] = useState(false);
  const [registerQRDataUrl, setRegisterQRDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Générer le QR code quand l'URL d'inscription change
  useEffect(() => {
    if (!registerUrl) { setRegisterQRDataUrl(null); return; }
    QRCode.toDataURL(registerUrl, { width: 220, margin: 1 })
      .then(setRegisterQRDataUrl)
      .catch(() => setRegisterQRDataUrl(null));
  }, [registerUrl]);

  // Recharger la liste toutes les 5 s si le modal QR est ouvert (inscription en cours)
  useEffect(() => {
    if (!showRegisterQR || !onFencersChanged) return;
    const id = setInterval(onFencersChanged, 5000);
    return () => clearInterval(id);
  }, [showRegisterQR, onFencersChanged]);
  const filteredFencers = useMemo(() => fencers
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
    }), [fencers, searchTerm, sortBy]);

  const VIRTUAL_THRESHOLD = 50;
  const ROW_HEIGHT = 52;
  const CONTAINER_HEIGHT = 520;

  const virtual = useVirtualList(filteredFencers, {
    itemHeight: ROW_HEIGHT,
    overscan: 5,
    containerHeight: CONTAINER_HEIGHT,
  });

  const useVirtual = filteredFencers.length > VIRTUAL_THRESHOLD;

  const checkedInCount = useMemo(
    () => fencers.filter(f => f.status === FencerStatus.CHECKED_IN).length,
    [fencers]
  );
  const notCheckedInCount = useMemo(
    () => fencers.filter(f => f.status === FencerStatus.NOT_CHECKED_IN).length,
    [fencers]
  );

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

  const handleImportFencers = (type: 'xml' | 'fff' | 'ranking') => {
    if (onImport) {
      onImport(type);
    }
  };

  const showPhotoMessage = (msg: string) => {
    setPhotoMessage(msg);
    setTimeout(() => setPhotoMessage(null), 4000);
  };

  const handleExportPhotos = async () => {
    if (!competitionId) return;
    const result = await window.electronAPI.dialog.saveFile({
      title: 'Exporter les photos (.zip)',
      defaultPath: 'photos-tireurs.zip',
      filters: [{ name: 'Archive ZIP', extensions: ['zip'] }],
    });
    if (result && !result.canceled && result.filePath) {
      try {
        const { count } = await window.electronAPI.file.exportPhotos(
          competitionId,
          result.filePath
        );
        showPhotoMessage(
          `${count} photo${count !== 1 ? 's' : ''} exportée${count !== 1 ? 's' : ''}`
        );
      } catch {
        showPhotoMessage("Erreur lors de l'export");
      }
    }
  };

  const handleImportPhotos = async () => {
    if (!competitionId) return;
    const result = await window.electronAPI.dialog.openFile({
      title: 'Importer les photos (.zip)',
      filters: [{ name: 'Archive ZIP', extensions: ['zip'] }],
    });
    if (result && result.filePath) {
      try {
        const { matched, total } = await window.electronAPI.file.importPhotos(
          competitionId,
          result.filePath
        );
        showPhotoMessage(
          `${matched}/${total} photo${total !== 1 ? 's' : ''} importée${total !== 1 ? 's' : ''}`
        );
      } catch {
        showPhotoMessage("Erreur lors de l'import");
      }
    }
  };

  const handleExportFencersArchive = async () => {
    if (!competitionId) return;
    const result = await window.electronAPI.dialog.saveFile({
      title: 'Exporter tireurs + photos (.bpf)',
      defaultPath: 'tireurs.bpf',
      filters: [{ name: 'BellePoule Fencers', extensions: ['bpf'] }],
    });
    if (result && !result.canceled && result.filePath) {
      try {
        const { count } = await window.electronAPI.file.exportFencersArchive(
          competitionId,
          result.filePath
        );
        showPhotoMessage(
          `${count} tireur${count !== 1 ? 's' : ''} exporté${count !== 1 ? 's' : ''} (.bpf)`
        );
      } catch {
        showPhotoMessage("Erreur lors de l'export .bpf");
      }
    }
  };

  const handleImportFencersArchive = async () => {
    if (!competitionId) return;
    const result = await window.electronAPI.dialog.openFile({
      title: 'Importer tireurs + photos (.bpf)',
      filters: [{ name: 'BellePoule Fencers', extensions: ['bpf'] }],
    });
    if (result && result.filePath) {
      try {
        const { added, updated } = await window.electronAPI.file.importFencersArchive(
          competitionId,
          result.filePath
        );
        showPhotoMessage(`${added} ajouté${added !== 1 ? 's' : ''}, ${updated} mis à jour (.bpf)`);
        if (onFencersImported) onFencersImported();
      } catch {
        showPhotoMessage("Erreur lors de l'import .bpf");
      }
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
      <div className="flex justify-between items-center mb-4" style={{ position: 'relative', zIndex: 2 }}>
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
            <div ref={importMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setImportMenuOpen(o => !o)}
                title="Importer"
              >
                📥 Importer ▾
              </button>
              {importMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  zIndex: 9999,
                  background: 'var(--bg-secondary, #2a2a3e)',
                  border: '1px solid var(--border-color, #444)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  minWidth: '230px',
                  padding: '4px 0',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}>
                  <button
                    className="btn btn-ghost"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                    onClick={() => { handleImportFencers('xml'); setImportMenuOpen(false); }}
                  >
                    Importer XML (BellePoule)
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                    onClick={() => { handleImportFencers('fff'); setImportMenuOpen(false); }}
                  >
                    Importer liste FFE (.fff)
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                    onClick={() => { handleImportFencers('ranking'); setImportMenuOpen(false); }}
                  >
                    Importer classement FFE
                  </button>
                  {competitionId && (
                    <>
                      <button
                        className="btn btn-ghost"
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                        onClick={() => { handleImportFencersArchive(); setImportMenuOpen(false); }}
                      >
                        Importer tireurs + photos (.bpf)
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                        onClick={() => { handleImportPhotos(); setImportMenuOpen(false); }}
                      >
                        Importer photos (.zip)
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setExportMenuOpen(o => !o)}
              title="Exporter"
            >
              📤 Exporter ▾
            </button>
            {exportMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                zIndex: 9999,
                background: 'var(--bg-secondary, #2a2a3e)',
                border: '1px solid var(--border-color, #444)',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                minWidth: '160px',
                padding: '4px 0',
                maxHeight: '60vh',
                overflowY: 'auto',
              }}>
                <button
                  className="btn btn-ghost"
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                  onClick={() => { handleExportFencers('txt'); setExportMenuOpen(false); }}
                >
                  Exporter TXT
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                  onClick={() => { handleExportFencers('fff'); setExportMenuOpen(false); }}
                >
                  Exporter FFF
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                  onClick={() => { handleExportFencersArchive(); setExportMenuOpen(false); }}
                >
                  Exporter tireurs + photos (.bpf)
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', borderRadius: 0 }}
                  onClick={() => { handleExportPhotos(); setExportMenuOpen(false); }}
                >
                  Exporter photos (.zip)
                </button>
              </div>
            )}
          </div>
          {registerUrl && (
            <button
              className="btn btn-secondary"
              title={`Inscription tablette : ${registerUrl}`}
              onClick={() => setShowRegisterQR(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>📱</span> QR Inscription
            </button>
          )}
          <button className="btn btn-primary" onClick={onAddFencer}>
            + {t('fencer.add')}
          </button>
        </div>
      </div>

      {/* Modal QR code inscription distante */}
      {showRegisterQR && registerUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowRegisterQR(false)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)', borderRadius: 16, padding: '2rem',
              textAlign: 'center', maxWidth: 300, width: '90%',
              border: '1px solid var(--border-color, #334155)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>
              📱 Inscription tireur
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '1rem' }}>
              Scannez ce QR code avec la tablette pour accéder au formulaire d&apos;inscription
            </p>
            {registerQRDataUrl
              ? <img src={registerQRDataUrl} alt="QR code inscription" width={220} height={220} style={{ borderRadius: 8 }} />
              : <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>Génération…</div>
            }
            <code style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.7rem', wordBreak: 'break-all', color: 'var(--text-muted, #94a3b8)' }}>
              {registerUrl}
            </code>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setShowRegisterQR(false)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {photoMessage && (
        <div
          className="alert alert-success mb-4"
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {photoMessage}
        </div>
      )}

      {fencers.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', marginBottom: '4px' }}>
            <span>Pointage</span>
            <span>{checkedInCount} / {fencers.length}</span>
          </div>
          <div style={{ height: '6px', background: 'var(--border-color, #e5e7eb)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: fencers.length > 0 ? `${(checkedInCount / fencers.length) * 100}%` : '0%',
              background: checkedInCount === fencers.length && fencers.length > 0 ? '#22c55e' : '#3b82f6',
              borderRadius: '3px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

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
          <table className="table" style={useVirtual ? { tableLayout: 'fixed' } : undefined}>
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
          </table>
          <div
            ref={useVirtual ? virtual.containerRef : undefined}
            onScroll={useVirtual ? virtual.onScroll : undefined}
            style={useVirtual ? { height: CONTAINER_HEIGHT, overflowY: 'auto' } : undefined}
          >
            <table className="table" style={useVirtual ? { tableLayout: 'fixed' } : undefined}>
            <tbody>
              {useVirtual && virtual.state.offsetY > 0 && (
                <tr style={{ height: virtual.state.offsetY }}><td colSpan={8} /></tr>
              )}
              {(useVirtual ? virtual.visibleItems : filteredFencers).map(fencer => (
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
              {useVirtual && (() => {
                const bottomHeight = virtual.state.totalHeight - virtual.state.offsetY - (virtual.visibleItems.length * ROW_HEIGHT);
                return bottomHeight > 0 ? <tr style={{ height: bottomHeight }}><td colSpan={8} /></tr> : null;
              })()}
            </tbody>
          </table>
          </div>
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
