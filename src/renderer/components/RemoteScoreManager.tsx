/**
 * BellePoule Modern - Remote Score Management Component
 * Interface for managing remote score entry
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { Competition, Pool } from '../../shared/types';
import { logger, LogCategory } from '@shared/services/logger';
import { TableauMatch } from './TableauView';
import { useToast } from './Toast';

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
    if (!activeQR) {
      setQrDataUrl(null);
      return;
    }
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

  // Synchroniser le cache poolFencersCache du serveur distant quand les poules changent
  // (interversion de combattants entre poules pendant une session active).
  const sessionPoolsFingerprintRef = useRef<string>('');
  useEffect(() => {
    const fingerprint = pools
      .map(p => `${p.id}:${(p.fencers ?? []).map((f: any) => f.id).join(',')}`)
      .join('|');
    if (!isRemoteActive || !session) {
      sessionPoolsFingerprintRef.current = fingerprint;
      return;
    }
    if (fingerprint === sessionPoolsFingerprintRef.current) return;
    sessionPoolsFingerprintRef.current = fingerprint;
    const updates = pools.map(pool => ({ poolId: pool.id, fencers: pool.fencers ?? [] }));
    window.electronAPI.remote.updatePoolFencers(updates).catch(() => {});
  }, [pools, isRemoteActive, session]);

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
        showToast(`Erreur: ${result.error || 'Impossible de démarrer le serveur'}`, 'error');
      }
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to start remote server', error as Error);
      showToast('Impossible de démarrer le serveur distant', 'error');
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
      logger.debug(LogCategory.UI, '[RemoteScoreManager] Passing matches to server', {
        pool: poolMatches.length,
        de: deMatches.length,
      });
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
        showToast('Saisie distante démarrée', 'success');
      } else {
        showToast(`Erreur session: ${result.error}`, 'error');
      }
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to start session', error as Error);
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
          showToast('Nombre de pistes mis à jour', 'success');
        } else {
          showToast(`Erreur: ${result.error}`, 'error');
        }
      } catch (error) {
        logger.error(LogCategory.UI, 'Failed to update strip count', error as Error);
      }
    } else {
      // Serveur non démarré : persister la préférence
      setCommittedCount(newCount);
      onArenaCountChange?.(newCount);
      showToast('Préférence sauvegardée', 'success');
    }
  };

  const handleStopRemote = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.remote.stopServer();

      if (result.success) {
        setSession(null);
        showToast('Saisie distante arrêtée', 'success');
        onStopRemote();
      } else {
        showToast(`Erreur: ${result.error || "Impossible d'arrêter le serveur"}`, 'error');
      }
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to stop remote server', error as Error);
      showToast("Impossible d'arrêter le serveur distant", 'error');
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
          title="Modifications non sauvegardées"
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
        Sauvegarder
      </button>
    </div>
  );

  if (!isRemoteActive) {
    return (
      <div className="remote-score-manager">
        <div className="remote-status inactive">
          <h3>🔴 Saisie distante inactive</h3>
          <p>
            La saisie distante permet aux arbitres de saisir les scores depuis une tablette. Les
            arbitres se connectent via un navigateur web sur le réseau local.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.75rem 0' }}>
            <span>Pistes :</span>
            {stripCountControls}
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0.5rem 0',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showPhotos}
              onChange={e => setShowPhotos(e.target.checked)}
            />
            Afficher les photos des combattants avant le combat
          </label>
          <button className="btn-primary" onClick={onStartRemote}>
            ⚡ Démarrer la saisie distante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="remote-score-manager">
      <div className="remote-header">
        <div className="remote-status active">
          <h3>🟢 Saisie distante active</h3>
          <p>
            Serveur: <strong>{serverUrl}</strong>
          </p>
        </div>
        <button className="btn-secondary" onClick={handleStopRemote} disabled={isLoading}>
          🛑 Arrêter
        </button>
      </div>

      <div className="arena-urls-section">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}
        >
          <h4 style={{ margin: 0 }}>Pistes ({arenaCount})</h4>
          {stripCountControls}
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0.5rem 0',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showPhotos}
            onChange={async e => {
              setShowPhotos(e.target.checked);
              await window.electronAPI.remote.updateShowPhotos(e.target.checked);
            }}
          />
          Afficher les photos des combattants avant le combat
        </label>

        <div className="arena-url-grid">
          {arenaUrls.map(arena => (
            <div key={arena.number} className="arena-url-card">
              <div className="arena-url-header">
                <strong>Piste {arena.number}</strong>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">Arbitre</span>
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
                    setActiveQR({ url: arena.refereeUrl, label: `Piste ${arena.number} – Arbitre` })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">Affichage</span>
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
                      label: `Piste ${arena.number} – Affichage`,
                    })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">Poule</span>
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
                      label: `Piste ${arena.number} – Poule`,
                    })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">Public</span>
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
                      label: `Piste ${arena.number} – Public`,
                    })
                  }
                  title="QR code"
                >
                  📱
                </button>
              </div>
              <div className="arena-url-row">
                <span className="arena-url-label">🔒 MDP</span>
                <input
                  type="password"
                  className="arena-password-input"
                  placeholder="Aucun (accès libre)"
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
                            ? `Mot de passe défini pour la piste ${arena.number}`
                            : `Mot de passe supprimé pour la piste ${arena.number}`,
                          'success'
                        );
                      } else {
                        showToast(result.error ?? 'Erreur', 'error');
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
                          ? `Mot de passe défini pour la piste ${arena.number}`
                          : `Mot de passe supprimé pour la piste ${arena.number}`,
                        'success'
                      );
                    } else {
                      showToast(result.error ?? 'Erreur', 'error');
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
            <strong>🖥️ Kiosk (affichage public)</strong>
          </div>
          <div className="arena-url-row">
            <span className="arena-url-label">URL</span>
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
              onClick={() => setActiveQR({ url: kioskUrl, label: 'Kiosk – Affichage public' })}
              title="QR code"
            >
              📱
            </button>
          </div>
        </div>
      </div>

      <div className="remote-instructions">
        <h5>Instructions pour les arbitres</h5>
        <ol>
          <li>Ouvrir un navigateur web sur la tablette</li>
          <li>
            Aller à l'URL <strong>Arbitre</strong> correspondant à sa piste
          </li>
          <li>Saisir les scores du match en cours</li>
          <li>Cliquer sur "Match suivant" pour passer au match suivant</li>
        </ol>
      </div>

      {activeQR && (
        <div className="qr-popup-overlay" onClick={() => setActiveQR(null)}>
          <div className="qr-popup" onClick={e => e.stopPropagation()}>
            <strong>{activeQR.label}</strong>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code" width={220} height={220} />
            ) : (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Génération…
              </div>
            )}
            <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', textAlign: 'center' }}>
              {activeQR.url}
            </code>
            <button className="btn btn-secondary" onClick={() => setActiveQR(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteScoreManager;
