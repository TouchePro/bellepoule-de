/**
 * BellePoule Modern - Remote Score Management Component
 * Interface for managing remote score entry
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Competition, Pool } from '../../shared/types';
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
}) => {
  const { showToast } = useToast();
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:8066');
  const [stripCount, setStripCount] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Définir le nombre de pistes par défaut = nombre de poules
  useEffect(() => {
    if (pools && pools.length > 0 && stripCount === null) {
      setStripCount(pools.length);
      console.log('[RemoteScoreManager] Nombre de pistes défini depuis les props:', pools.length);
    }
  }, [pools, stripCount]);

  // Valeur par défaut si pas de poules
  useEffect(() => {
    if (stripCount === null) {
      setStripCount(1);
    }
  }, [stripCount]);

  const effectiveStripCount = stripCount ?? 1;

  useEffect(() => {
    if (isRemoteActive) {
      startRemoteServer();
    }
  }, [isRemoteActive]);

  const startRemoteServer = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.remote.startServer();

      if (result.success && result.serverInfo) {
        setServerUrl(result.serverInfo.url);
        // Auto-démarrer la session
        await startSession(result.serverInfo.url, effectiveStripCount);
      } else {
        showToast(`Erreur: ${result.error || 'Impossible de démarrer le serveur'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to start remote server:', error);
      showToast('Impossible de démarrer le serveur distant', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startSession = async (baseUrl: string, count: number) => {
    try {
      const poolMatches = pools.flatMap(pool => pool.matches || []);
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
        allMatches
      );
      if (result.success && result.session) {
        setSession(result.session);
        onArenaCountChange?.(count);
        showToast('Saisie distante démarrée', 'success');
      } else {
        showToast(`Erreur session: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleUpdateStripCount = async (newCount: number) => {
    if (newCount < 1 || newCount > 20) return;

    try {
      const result = await window.electronAPI.remote.updateStripCount(newCount);
      if (result.success && result.session) {
        setSession(result.session);
        setStripCount(newCount);
        onArenaCountChange?.(newCount);
      } else {
        showToast(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update strip count:', error);
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
      console.error('Failed to stop remote server:', error);
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

  const arenaCount = session ? session.strips.length : effectiveStripCount;
  const arenaUrls = Array.from({ length: arenaCount }, (_, i) => ({
    number: i + 1,
    refereeUrl: `${serverUrl}/arene${i + 1}/arbitre`,
    displayUrl: `${serverUrl}/arene${i + 1}`,
  }));

  if (!isRemoteActive) {
    return (
      <div className="remote-score-manager">
        <div className="remote-status inactive">
          <h3>🔴 Saisie distante inactive</h3>
          <p>
            La saisie distante permet aux arbitres de saisir les scores depuis une tablette. Les
            arbitres se connectent via un navigateur web sur le réseau local.
          </p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleUpdateStripCount(arenaCount - 1)}
              disabled={arenaCount <= 1 || isLoading}
              style={{ padding: '0.2rem 0.5rem', fontSize: '1rem' }}
            >
              −
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleUpdateStripCount(arenaCount + 1)}
              disabled={arenaCount >= 20 || isLoading}
              style={{ padding: '0.2rem 0.5rem', fontSize: '1rem' }}
            >
              +
            </button>
          </div>
        </div>

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
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default RemoteScoreManager;
