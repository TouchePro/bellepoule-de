/**
 * BellePoule Modern - Remote Score Management Component
 * Interface for managing remote score entry
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import { Competition, Match, Fencer, Pool, MatchStatus } from '../../shared/types';
import { useToast } from './Toast';
import { usePoolStore } from '../../features/pools/hooks/usePoolStore';

interface RemoteScoreManagerProps {
  competition: Competition;
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
  referees: Array<{
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    currentMatch?: string;
    lastActivity: Date;
  }>;
  activeMatches: any[];
  isRunning: boolean;
  startTime?: Date;
}

const RemoteScoreManager: React.FC<RemoteScoreManagerProps> = ({
  competition,
  onStartRemote,
  onStopRemote,
  isRemoteActive = false,
}) => {
  const { showToast } = useToast();
  const { pools, loadPools } = usePoolStore();
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refereeName, setRefereeName] = useState('');
  const [stripCount, setStripCount] = useState(4);
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:8066');

  // Charger les poules et définir le nombre de pistes par défaut
  useEffect(() => {
    if (competition?.id) {
      console.log(
        '[RemoteScoreManager] Chargement des poules pour la compétition:',
        competition.id
      );
      loadPools(competition.id);
    }
  }, [competition?.id]);

  // Mettre à jour le nombre de pistes quand les poules sont chargées
  useEffect(() => {
    if (pools && pools.length > 0) {
      console.log(
        `[RemoteScoreManager] ${pools.length} poules trouvées, mise à jour du nombre de pistes`
      );
      setStripCount(pools.length);
    }
  }, [pools]);

  useEffect(() => {
    if (isRemoteActive) {
      // Démarrer le serveur via IPC quand on active la saisie distante
      startRemoteServer();
    }
  }, [isRemoteActive]);

  const startRemoteServer = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.remote.startServer();

      if (result.success && result.serverInfo) {
        setServerUrl(result.serverInfo.url);
        showToast('Serveur de saisie distante démarré', 'success');
        // Vérifier le statut de la session après le démarrage
        checkSessionStatus();
        // Rafraîchir périodiquement
        const interval = setInterval(checkSessionStatus, 5000);
        return () => clearInterval(interval);
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

  const checkSessionStatus = async () => {
    try {
      const response = await fetch('http://localhost:8066/api/session');
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.remote.startSession(competition.id, stripCount);

      if (result.success) {
        setSession(result.session);
        showToast('Session de saisie distante démarrée', 'success');
        fetchArenas();
      } else {
        showToast(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast('Impossible de démarrer la session distante', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArenas = async () => {
    try {
      const result = await window.electronAPI.remote.getArenas();
      if (result.success) {
        console.log('[RemoteScoreManager] Arènes:', result.arenas);
      }
    } catch (error) {
      console.error('Failed to fetch arenas:', error);
    }
  };

  const handleStopSession = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.remote.stopSession();

      if (result.success) {
        setSession(null);
        showToast('Session de saisie distante arrêtée', 'success');
      } else {
        showToast(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast("Impossible d'arrêter la session distante", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRemote = async () => {
    setIsLoading(true);
    try {
      // Arrêter le serveur via IPC
      const result = await window.electronAPI.remote.stopServer();

      if (result.success) {
        setSession(null);
        showToast('Serveur de saisie distante arrêté', 'success');
        onStopRemote(); // Notifier le parent
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

  const handleAddReferee = async () => {
    if (!refereeName.trim()) {
      showToast("Veuillez entrer un nom d'arbitre", 'error');
      return;
    }

    if (!session) {
      showToast("Veuillez d'abord démarrer une session", 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:8066/api/referees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: refereeName }),
      });

      if (response.ok) {
        const referee = await response.json();
        showToast(`Arbitre ${referee.name} ajouté avec le code ${referee.code}`, 'success');
        setRefereeName('');
        checkSessionStatus();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        showToast(`Erreur: ${errorData.error || "Impossible d'ajouter l'arbitre"}`, 'error');
      }
    } catch (error) {
      console.error('Failed to add referee:', error);
      showToast("Impossible d'ajouter l'arbitre - serveur peut-être non démarré", 'error');
    }
  };

  const generateMatchesForRemote = () => {
    const matches: Match[] = [];

    // Générer les matchs de poules
    // Note: À adapter selon la structure réelle de la compétition
    // competition.pools?.forEach(pool => {
    //   pool.matches.forEach(match => {
    //     if (match.status !== MatchStatus.FINISHED) {
    //       matches.push(match);
    //     }
    //   });
    // });

    // Générer les matchs de tableau
    // competition.tableau?.matches.forEach(match => {
    //   if (match.status !== MatchStatus.FINISHED) {
    //     matches.push(match);
    //   }
    // });

    return matches;
  };

  const assignMatchesToStrips = () => {
    if (!session) return;

    const matches = generateMatchesForRemote();
    const availableStrips = session.strips.filter(strip => strip.status === 'available');

    // Logique simple d'assignation des matchs aux pistes
    matches.slice(0, availableStrips.length).forEach((match, index) => {
      if (index < availableStrips.length) {
        // Assigner le match à la piste
        console.log(`Assigning match ${match.id} to strip ${availableStrips[index].number}`);
      }
    });
  };

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
            Les arbitres peuvent se connecter sur: <strong>{serverUrl}</strong>
          </p>
        </div>
        <button className="btn-secondary" onClick={handleStopRemote} disabled={isLoading}>
          🛑 Arrêter
        </button>
      </div>

      {!session ? (
        <div className="session-setup">
          <h4>Configuration de la session</h4>
          <div className="setup-form">
            <div className="form-group">
              <label>Nombre de pistes (automatique = nombre de poules):</label>
              <input
                type="number"
                min="1"
                max="20"
                value={stripCount}
                onChange={e => setStripCount(parseInt(e.target.value) || 1)}
              />
              {pools && pools.length > 0 && (
                <small className="help-text">
                  {pools.length} poules générées → {pools.length} pistes configurées par défaut
                </small>
              )}
            </div>
            <button className="btn-primary" onClick={handleStartSession} disabled={isLoading}>
              {isLoading ? 'Démarrage...' : 'Démarrer la session'}
            </button>
          </div>
        </div>
      ) : (
        <div className="session-active">
          <div className="session-info">
            <h4>Session active</h4>
            <p>
              Démarrée:{' '}
              {session.startTime ? new Date(session.startTime).toLocaleString() : 'Inconnue'}
            </p>
            <p>Pistes: {session.strips.length}</p>
            <p>Arbitres: {session.referees.length}</p>
          </div>

          <div className="referee-management">
            <h5>Ajouter un arbitre</h5>
            <div className="add-referee">
              <input
                type="text"
                placeholder="Nom de l'arbitre"
                value={refereeName}
                onChange={e => setRefereeName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddReferee()}
                disabled={!session}
              />
              <button className="btn-primary" onClick={handleAddReferee} disabled={!session}>
                Ajouter
              </button>
            </div>
            {!session && (
              <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
                Démarrez d'abord une session pour ajouter des arbitres
              </p>
            )}
          </div>

          <div className="referees-list">
            <h5>Arbitres ({session.referees.length})</h5>
            {session.referees.length === 0 ? (
              <p className="no-referees">Aucun arbitre ajouté</p>
            ) : (
              <div className="referee-grid">
                {session.referees.map(referee => (
                  <div
                    key={referee.id}
                    className={`referee-card ${referee.isActive ? 'active' : 'inactive'}`}
                  >
                    <h6>{referee.name}</h6>
                    <p>
                      <strong>Code:</strong> {referee.code}
                    </p>
                    <p>
                      <strong>Statut:</strong> {referee.isActive ? '🟢 Connecté' : '🔴 Déconnecté'}
                    </p>
                    {referee.currentMatch && (
                      <p>
                        <strong>Match actuel:</strong> {referee.currentMatch}
                      </p>
                    )}
                    <p>
                      <small>
                        Dernière activité: {new Date(referee.lastActivity).toLocaleTimeString()}
                      </small>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="strips-status">
            <h5>État des pistes</h5>
            <div className="strip-grid">
              {session.strips.map(strip => (
                <div key={strip.number} className={`strip-card ${strip.status}`}>
                  <h6>Piste {strip.number}</h6>
                  <p>
                    <strong>Statut:</strong>{' '}
                    {strip.status === 'available'
                      ? '✅ Disponible'
                      : strip.status === 'occupied'
                        ? '🔄 Occupée'
                        : '🔧 Maintenance'}
                  </p>
                  {strip.currentMatch && (
                    <p>
                      <strong>Match:</strong> {strip.currentMatch}
                    </p>
                  )}
                  {strip.assignedReferee && (
                    <p>
                      <strong>Arbitre:</strong> {strip.assignedReferee}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="session-actions">
            <button className="btn-secondary" onClick={assignMatchesToStrips}>
              📋 Assigner les matchs
            </button>
            <button className="btn-danger" onClick={handleStopSession} disabled={isLoading}>
              🛑 Arrêter la session
            </button>
          </div>
        </div>
      )}

      <div className="remote-instructions">
        <h5>Instructions pour les arbitres</h5>
        <ol>
          <li>Ouvrir un navigateur web sur la tablette</li>
          <li>
            Aller à l'adresse: <strong>{serverUrl}</strong>
          </li>
          <li>Entrer le code d'accès fourni par l'organisateur</li>
          <li>Saisir les scores du match en cours</li>
          <li>Cliquer sur "Match suivant" pour passer au match suivant</li>
        </ol>
      </div>
    </div>
  );
};

export default RemoteScoreManager;
