/**
 * BellePoule Modern - Remote Score Management Component
 * Interface for managing remote score entry
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Competition, Pool } from '../../shared/types';
import { TableauMatch } from './TableauView';
import { useToast } from './Toast';
import { useTranslation } from '../contexts/TranslationContext';

interface RemoteScoreManagerProps {
  competition: Competition;
  pools: Pool[];
  tableauMatches?: TableauMatch[];
  onArenaCountChange?: (count: number) => void;
  onStartRemote: () => void;
  onStopRemote: () => void;
  isRemoteActive?: boolean;
  initialStripCount?: number;
}

interface RemoteSession {
  competitionId: string;
  strips: Array<{
    number: number;
    status: 'available' | 'occupied' | 'maintenance';
    currentMatch?: any;
    assignedReferee?: string;
  }>;
  isRunning: boolean;
  startTime?: Date;
}

const RemoteScoreManager: React.FC<RemoteScoreManagerProps> = ({
  competition,
  pools,
  tableauMatches,
  onArenaCountChange,
  onStartRemote,
  onStopRemote,
  isRemoteActive = false,
  initialStripCount,
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:8066');
  // pendingCount : valeur affichée (modifiée par +/−, non encore appliquée)
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  // committedCount : valeur appliquée au serveur ou confirmée par l'utilisateur
  const [committedCount, setCommittedCount] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeQR, setActiveQR] = useState<{ url: string; label: string } | null>(null);
  const [arenaPasswords, setArenaPasswords] = useState<Record<string, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showPhotos, setShowPhotos] = useState(false);

  useEffect(() => {
    if (!activeQR) { setQrDataUrl(null); return; }
    QRCode.toDataURL(activeQR.url, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [activeQR]);

  // Initialisation : priorité à initialStripCount (persisté depuis parent), puis nombre de poules
  useEffect(() => {
    if (pendingCount !== null) return;
    const initial = initialStripCount ?? (pools.length > 0 ? pools.length : 1);
    setPendingCount(initial);
    setCommittedCount(initial);
  }, [initialStripCount, pools.length]);

  const effectivePending = pendingCount ?? pools.length ?? 1;
  const effectiveCommitted = committedCount ?? pools.length ?? 1;
  const hasPendingChanges = effectivePending !== effectiveCommitted;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isRemoteActive) return;
    // Si une session est déjà active (retour sur l'onglet après navigation), on reconnecte
    // sans redémarrer le serveur pour ne pas perdre l'état des pistes configurées.
    window.electronAPI.remote.getSession().then(async (result: any) => {
      if (result.success && result.session) {
        // Récupérer l'IP réseau réelle (éviter localhost)
        const info = await window.electronAPI.remote.getServerInfo();
        if (info.success && info.serverInfo) setServerUrl(info.serverInfo.url);
        setSession(result.session);
        const existingCount = result.session.strips.length;
        setPendingCount(existingCount);
        setCommittedCount(existingCount);
      } else {
        startRemoteServer();
      }
    });
  }, [isRemoteActive]);

  const startRemoteServer = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.remote.startServer();

      if (result.success && result.serverInfo) {
        setServerUrl(result.serverInfo.url);
        await startSession(result.serverInfo.url, effectivePending);
      } else {
        showToast(`${t('messages.error')}: ${result.error || t('remote_score.server_start_error')}`, 'error');
      }
    } catch (error) {
      console.error('Failed to start remote server:', error);
      showToast(t('remote_score.server_start_error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startSession = async (baseUrl: string, count: number) => {
    try {
      // Prepend fencer-order markers so the server can rebuild poolFencersCache correctly.
      // The FIE match order for 4-fencer pools starts with [1,4] not [1,2], so naively
      // extracting fencers from match pairs produces the wrong order.
      const poolMatches = pools.flatMap(pool => [
        { __poolFencers: true, poolId: pool.id, fencers: pool.fencers || [] },
        ...(pool.matches || []),
      ]);
      const deMatches = (tableauMatches || [])
        .filter(m => m.winner === null && m.fencerA && m.fencerB)
        .map(m => ({ ...m, isTableau: true }));
      const allMatches = [...poolMatches, ...deMatches];
      console.log(
        '[RemoteScoreManager] Passing matches to server:',
        poolMatches.length,
        'pool +',
        deMatches.length,
        'DE'
      );
      const result = await window.electronAPI.remote.startSession(
        competition.id,
        count,
        allMatches,
        showPhotos
      );
      if (result.success && result.session) {
        setSession(result.session);
        setCommittedCount(count);
        onArenaCountChange?.(count);
        showToast(t('remote_score.started'), 'success');
      } else {
        showToast(`${t('messages.error')} ${t('remote_score.session')}: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleSaveStripCount = async () => {
    const newCount = effectivePending;
    if (newCount < 1 || newCount > 20) return;

    if (session) {
      // Serveur actif : appliquer via IPC
      try {
        const result = await window.electronAPI.remote.updateStripCount(newCount);
        if (result.success && result.session) {
          setSession(result.session);
          setCommittedCount(newCount);
          onArenaCountChange?.(newCount);
          showToast(t('remote_score.strip_count_updated'), 'success');
        } else {
          showToast(`${t('messages.error')}: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Failed to update strip count:', error);
      }
    } else {
      // Serveur non démarré : persister la préférence
      setCommittedCount(newCount);
      onArenaCountChange?.(newCount);
      showToast(t('remote_score.preference_saved'), 'success');
    }
  };

  const handleStopRemote = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.remote.stopServer();

      if (result.success) {
        setSession(null);
        showToast(t('remote_score.stopped'), 'success');
        onStopRemote();
      } else {
        showToast(`${t('messages.error')}: ${result.error || t('remote_score.server_stop_error')}`, 'error');
      }
    } catch (error) {
      console.error('Failed to stop remote server:', error);
      showToast(t('remote_score.server_stop_error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }, []);

  // La grille d'URLs reflète l'état réel du serveur (committedCount) ou la session active
  const arenaCount = session ? session.strips.length : effectiveCommitted;
  const kioskUrl = `${serverUrl}/kiosk`;
  const arenaUrls = Array.from({ length: arenaCount }, (_, i) => ({
    number: i + 1,
    refereeUrl: `${serverUrl}/arene${i + 1}/arbitre`,
    displayUrl: `${serverUrl}/arene${i + 1}`,
    poolUrl: `${serverUrl}/arene${i + 1}/poule`,
    publicUrl: `${serverUrl}/arene${i + 1}/public`,
  }));

  // Contrôles +/− communs aux deux vues (pending uniquement, sans appel IPC direct)
  const stripCountControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setPendingCount(Math.max(1, effectivePending - 1))}
        disabled={effectivePending <= 1 || isLoading}
        style={{ padding: '0.2rem 0.5rem', fontSize: '1rem' }}
      >
        −
      </button>
      <strong style={{ minWidth: '1.5rem', textAlign: 'center' }}>{effectivePending}</strong>
      <button
        className="btn btn-secondary"
        onClick={() => setPendingCount(Math.min(20, effectivePending + 1))}
        disabled={effectivePending >= 20 || isLoading}
        style={{ padding: '0.2rem 0.5rem', fontSize: '1rem' }}
      >
        +
      </button>
      {hasPendingChanges && (
        <span
          style={{ color: 'var(--warning-color, orange)', fontSize: '0.85rem' }}
          title={t('remote_score.unsaved_changes')}
        >
          ●
        </span>
      )}
      <button
        className="btn btn-primary"
        onClick={handleSaveStripCount}
        disabled={!hasPendingChanges || isLoading}
        style={{ padding: '0.2rem 0.6rem' }}
      >
        {t('actions.save')}
      </button>
    </div>
  );

  if (!isRemoteActive) {
    return (
      <div className="remote-score-manager">
        <div className="remote-status inactive">
          <h3>🔴 {t('remote_score.inactive_title')}</h3>
          <p>
            {t('remote_score.inactive_description')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.75rem 0' }}>
            <span>{t('remote.arena')}:</span>
            {stripCountControls}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPhotos}
              onChange={e => setShowPhotos(e.target.checked)}
            />
            {t('remote_score.show_photos')}
          </label>
          <button className="btn-primary" onClick={onStartRemote}>
            ⚡ {t('remote_score.start_button')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="remote-score-manager">
      <div className="remote-header">
        <div className="remote-status active">
          <h3>🟢 {t('remote_score.active_title')}</h3>
          <p>
            {t('remote_score.server')}: <strong>{serverUrl}</strong>
          </p>
        </div>
        <button className="btn-secondary" onClick={handleStopRemote} disabled={isLoading}>
          🛑 {t('remote_score.stop_button')}
        </button>
      </div>

      <div className="arena-urls-section">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}
        >
          <h4 style={{ margin: 0 }}>{t('remote.arena')} ({arenaCount})</h4>
          {stripCountControls}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showPhotos}
            onChange={async e => {
              setShowPhotos(e.target.checked);
              await window.electronAPI.remote.updateShowPhotos(e.target.checked);
            }}
          />
          {t('remote_score.show_photos')}
        </label>

        <div className="arena-url-grid">
          {arenaUrls.map(arena => (
            <div key={arena.number} className="arena-url-card">
              <div className="arena-url-header">
                <strong>{t('remote_score.arena_label')} {arena.number}</strong>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">{t('remote_score.referee_label')}</span>
                <code className="arena-url-value">{arena.refereeUrl}</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(arena.refereeUrl, arena.number * 10)}
                  title="Copier l'URL"
                >
                  {copiedIndex === arena.number * 10 ? '✓' : '📋'}
                </button>
                <button
                  className="btn-qr"
                  onClick={() =>
                    setActiveQR({ url: arena.refereeUrl, label: `${t('remote_score.arena_label')} ${arena.number} – ${t('remote_score.referee_label')}` })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">{t('remote_score.display_label')}</span>
                <code className="arena-url-value">{arena.displayUrl}</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(arena.displayUrl, arena.number * 10 + 1)}
                  title="Copier l'URL"
                >
                  {copiedIndex === arena.number * 10 + 1 ? '✓' : '📋'}
                </button>
                <button
                  className="btn-qr"
                  onClick={() =>
                    setActiveQR({
                      url: arena.displayUrl,
                      label: `${t('remote_score.arena_label')} ${arena.number} – ${t('remote_score.display_label')}`,
                    })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">{t('remote_score.pool_label')}</span>
                <code className="arena-url-value">{arena.poolUrl}</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(arena.poolUrl, arena.number * 10 + 2)}
                  title="Copier l'URL"
                >
                  {copiedIndex === arena.number * 10 + 2 ? '✓' : '📋'}
                </button>
                <button
                  className="btn-qr"
                  onClick={() =>
                    setActiveQR({
                      url: arena.poolUrl,
                      label: `${t('remote_score.arena_label')} ${arena.number} – ${t('remote_score.pool_label')}`,
                    })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">{t('remote_score.public_label')}</span>
                <code className="arena-url-value">{arena.publicUrl}</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(arena.publicUrl, arena.number * 10 + 3)}
                  title="Copier l'URL"
                >
                  {copiedIndex === arena.number * 10 + 3 ? '✓' : '📋'}
                </button>
                <button
                  className="btn-qr"
                  onClick={() =>
                    setActiveQR({
                      url: arena.publicUrl,
                      label: `${t('remote_score.arena_label')} ${arena.number} – ${t('remote_score.public_label')}`,
                    })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">🔒 {t('remote_score.password_label')}</span>
                <input
                  type="password"
                  className="arena-password-input"
                  placeholder={t('remote_score.password_placeholder')}
                  value={arenaPasswords[`arena${arena.number}`] ?? ''}
                  onChange={e =>
                    setArenaPasswords(p => ({
                      ...p,
                      [`arena${arena.number}`]: e.target.value,
                    }))
                  }
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      const pwd = arenaPasswords[`arena${arena.number}`] ?? '';
                      const result = await window.electronAPI.remote.setArenaPassword(
                        `arena${arena.number}`,
                        pwd
                      );
                      if (result.success) {
                        showToast(
                          pwd
                            ? t('remote_score.password_set', { arenaNumber: arena.number })
                            : t('remote_score.password_removed', { arenaNumber: arena.number }),
                          'success'
                        );
                      } else {
                        showToast(result.error ?? t('messages.error'), 'error');
                      }
                    }
                  }}
                />
                <button
                  className="btn-copy"
                  title="Définir le mot de passe"
                  onClick={async () => {
                    const pwd = arenaPasswords[`arena${arena.number}`] ?? '';
                    const result = await window.electronAPI.remote.setArenaPassword(
                      `arena${arena.number}`,
                      pwd
                    );
                    if (result.success) {
                      showToast(
                        pwd
                          ? t('remote_score.password_set', { arenaNumber: arena.number })
                          : t('remote_score.password_removed', { arenaNumber: arena.number }),
                        'success'
                      );
                    } else {
                      showToast(result.error ?? t('messages.error'), 'error');
                    }
                  }}
                >
                  ✓
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="arena-url-card" style={{ marginTop: '1rem' }}>
          <div className="arena-url-header">
            <strong>🖥️ {t('remote_score.kiosk_label')} ({t('remote_score.public_display')})</strong>
          </div>
          <div className="arena-url-row">
            <span className="arena-url-label">{t('remote_score.url_label')}</span>
            <code className="arena-url-value">{kioskUrl}</code>
            <button
              className="btn-copy"
              onClick={() => copyToClipboard(kioskUrl, 999)}
              title="Copier l'URL"
            >
              {copiedIndex === 999 ? '✓' : '📋'}
            </button>
            <button
              className="btn-qr"
              onClick={() => setActiveQR({ url: kioskUrl, label: `${t('remote_score.kiosk_label')} – ${t('remote_score.public_display')}` })}
              title="QR code"
            >
              📱
            </button>
          </div>
        </div>
      </div>

      <div className="remote-instructions">
        <h5>{t('remote_score.instructions_title')}</h5>
        <ol>
          <li>{t('remote_score.instruction_step_1')}</li>
          <li>
            {t('remote_score.instruction_step_2')} <strong>{t('remote_score.referee_label')}</strong> {t('remote_score.instruction_step_2_end')}
          </li>
          <li>{t('remote_score.instruction_step_3')}</li>
          <li>{t('remote_score.instruction_step_4')}</li>
        </ol>
      </div>

      {activeQR && (
        <div className="qr-popup-overlay" onClick={() => setActiveQR(null)}>
          <div className="qr-popup" onClick={e => e.stopPropagation()}>
            <strong>{activeQR.label}</strong>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code" width={220} height={220} />
            ) : (
              <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('remote_score.generating')}
              </div>
            )}
            <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', textAlign: 'center' }}>
              {activeQR.url}
            </code>
            <button className="btn btn-secondary" onClick={() => setActiveQR(null)}>
              {t('actions.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteScoreManager;
