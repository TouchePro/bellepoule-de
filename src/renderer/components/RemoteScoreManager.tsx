/**
 * BellePoule Modern - Remote Score Management Component
 * Interface for managing remote score entry
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { Competition, Pool } from '../../shared/types';
import { logger, LogCategory } from '@shared/services/logger';
import { TableauMatch } from './TableauView';
import { useToast } from './Toast';
import ThemeEditor from './ThemeEditor';
import { CustomTheme, DisplayTheme } from '../../shared/types/remote';

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
  const [serverUrl, setServerUrl] = useState<string>('');
  const [remotePort, setRemotePort] = useState<number>(() => {
    const saved = localStorage.getItem(`bellepoule-remote-port-${competition.id}`);
    return saved ? parseInt(saved, 10) : 8066;
  });
  const [networkInterfaces, setNetworkInterfaces] = useState<{ name: string; address: string }[]>([
    { name: 'Toutes les interfaces', address: '0.0.0.0' },
  ]);
  const [selectedInterface, setSelectedInterface] = useState<string>(() => {
    return localStorage.getItem('bellepoule-remote-interface') ?? '0.0.0.0';
  });
  // pendingCount : valeur affichée (modifiée par +/−, non encore appliquée)
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  // committedCount : valeur appliquée au serveur ou confirmée par l'utilisateur
  const [committedCount, setCommittedCount] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeQR, setActiveQR] = useState<{ url: string; label: string } | null>(null);
  const [arenaPasswords, setArenaPasswords] = useState<Record<string, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showPhotos, setShowPhotos] = useState(false);
  const [cardAnnounce, setCardAnnounce] = useState(false);
  const [displayTheme, setDisplayTheme] = useState<'dark' | 'light' | 'neon'>('dark');
  const [arenaWallpaper, setArenaWallpaper] = useState<string | null>(null);
  const [kioskViews, setKioskViews] = useState({
    poules: true,
    classement: true,
    direct: true,
    suivants: true,
  });
  const [orgNoteType, setOrgNoteType] = useState<'free' | 'target_time'>('free');
  const [orgNoteMessage, setOrgNoteMessage] = useState('');
  const [orgNoteTime, setOrgNoteTime] = useState('');
  const [orgNotePrefix, setOrgNotePrefix] = useState('Reprise');
  const [orgNoteActive, setOrgNoteActive] = useState(false);
  // Thèmes par arène : arenaId → { theme, customTheme? }
  const [arenaThemes, setArenaThemes] = useState<
    Record<string, { theme: DisplayTheme; customTheme?: CustomTheme }>
  >({});
  // Éditeur de thème
  const [themeEditorTarget, setThemeEditorTarget] = useState<string | null>(null);
  // Lancement de la compétition
  const [isLaunched, setIsLaunched] = useState<boolean>(() => {
    const key = `bellepoule-remote-launched-${competition.id}`;
    return localStorage.getItem(key) === 'true';
  });

  useEffect(() => {
    window.electronAPI.remote.getNetworkInterfaces().then((res: any) => {
      if (res?.success && res.interfaces?.length) {
        setNetworkInterfaces(res.interfaces);
      }
    });
  }, []);

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
    window.electronAPI.remote.updatePoolFencers(competition.id, updates).catch((err: unknown) => {
      logger.warn(LogCategory.NETWORK, 'Échec updatePoolFencers', err instanceof Error ? err : undefined);
    });
  }, [pools, isRemoteActive, session]);

  // Quand les résultats de matchs de poule changent dans le logiciel, synchroniser le serveur distant
  const sessionMatchesFingerprintRef = useRef<string>('');
  useEffect(() => {
    const fingerprint = pools
      .map(
        p =>
          `${p.id}:${(p.matches ?? []).map((m: any) => `${m.id}=${m.status}|${m.scoreA ?? ''}-${m.scoreB ?? ''}`).join(',')}`
      )
      .join('|');
    if (!isRemoteActive || !session) {
      sessionMatchesFingerprintRef.current = fingerprint;
      return;
    }
    if (fingerprint === sessionMatchesFingerprintRef.current) return;
    sessionMatchesFingerprintRef.current = fingerprint;
    const poolsData = pools.map(pool => ({ poolId: pool.id, matches: pool.matches ?? [] }));
    window.electronAPI.remote.syncPoolMatches(competition.id, poolsData).catch((err: unknown) => {
      logger.warn(
        LogCategory.NETWORK,
        'Échec syncPoolMatches',
        err instanceof Error ? err : undefined
      );
    });
  }, [pools, isRemoteActive, session]);

  // Quand les matchs tableau changent pendant une session active, mettre à jour le serveur
  // sans avoir à arrêter/relancer la saisie distante (transition poules → tableau).
  const prevDeMatchesKeyRef = useRef<string>('');
  const pendingDeMatches = useMemo(
    () =>
      (tableauMatches || [])
        .filter(m => m.winner === null && m.fencerA && m.fencerB)
        .map(m => ({ ...m, isTableau: true })),
    [tableauMatches]
  );
  useEffect(() => {
    const key = pendingDeMatches.map(m => m.id).join(',');
    if (key === prevDeMatchesKeyRef.current) return;
    prevDeMatchesKeyRef.current = key;
    if (!isRemoteActive || !session || pendingDeMatches.length === 0) return;
    window.electronAPI.remote.refreshDeMatches(competition.id, pendingDeMatches).catch((err: unknown) => {
      logger.warn(LogCategory.NETWORK, 'Échec refreshDeMatches', err instanceof Error ? err : undefined);
    });
  }, [pendingDeMatches, isRemoteActive, session]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isRemoteActive) return;
    // Si une session est déjà active (retour sur l'onglet après navigation), on reconnecte
    // sans redémarrer le serveur pour ne pas perdre l'état des pistes configurées.
    window.electronAPI.remote.getSession(competition.id).then(async (result: any) => {
      if (result.success && result.session) {
        // Récupérer l'IP réseau réelle (éviter localhost)
        const info = await window.electronAPI.remote.getServerInfo(competition.id);
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
      const result = await window.electronAPI.remote.startServer(competition.id, remotePort, selectedInterface);

      if (result.success && result.serverInfo) {
        if (result.serverInfo.port !== remotePort) {
          setRemotePort(result.serverInfo.port);
          localStorage.setItem(`bellepoule-remote-port-${competition.id}`, String(result.serverInfo.port));
        }
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
      const sortedPools = [...pools].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      const poolMatches = sortedPools.flatMap(pool => [
        {
          __poolFencers: true,
          poolId: pool.id,
          poolNumber: pool.number,
          fencers: pool.fencers || [],
        },
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
        showPhotos,
        kioskViews,
        cardAnnounce
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
        const result = await window.electronAPI.remote.updateStripCount(competition.id, newCount);
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

  const handlePortChange = (value: number) => {
    const port = Math.max(1, Math.min(65535, value || 8066));
    setRemotePort(port);
    localStorage.setItem(`bellepoule-remote-port-${competition.id}`, String(port));
  };

  const handleChangePort = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.remote.changePort(competition.id, remotePort);
      if (result.success && result.serverInfo) {
        setServerUrl(result.serverInfo.url);
        showToast(`Port changé : ${result.serverInfo.port}`, 'success');
      } else {
        showToast(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to change port', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRemote = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.remote.stopServer(competition.id);

      if (result.success) {
        setSession(null);
        setIsLaunched(false);
        localStorage.removeItem(`bellepoule-remote-launched-${competition.id}`);
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

  // Appliquer un thème (prédéfini ou custom) à une arène
  const handleArenaThemeChange = useCallback(
    async (arenaId: string, theme: DisplayTheme, customTheme?: CustomTheme) => {
      setArenaThemes(prev => ({ ...prev, [arenaId]: { theme, customTheme } }));
      if (session) {
        await window.electronAPI.remote.updateArenaTheme(competition.id, arenaId, theme, customTheme);
      }
    },
    [session]
  );

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
              checked={cardAnnounce}
              onChange={e => setCardAnnounce(e.target.checked)}
            />
            📣 Carton avancer (afficher bandeau + raison sur les écrans)
          </label>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem', color: 'inherit' }}>
              Vues kiosk :
            </div>
            {(
              [
                { key: 'poules', label: 'Poules' },
                { key: 'classement', label: 'Classement' },
                { key: 'direct', label: 'Matchs en direct' },
                { key: 'suivants', label: 'Matchs suivants' },
              ] as const
            ).map(({ key, label }) => (
              <label
                key={key}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={kioskViews[key]}
                  onChange={e => setKioskViews(v => ({ ...v, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}
          >
            <label htmlFor="remote-interface" style={{ whiteSpace: 'nowrap' }}>
              Interface :
            </label>
            <select
              id="remote-interface"
              value={selectedInterface}
              onChange={e => {
                setSelectedInterface(e.target.value);
                localStorage.setItem('bellepoule-remote-interface', e.target.value);
              }}
              disabled={isLoading}
            >
              {networkInterfaces.map(iface => (
                <option key={iface.address} value={iface.address}>
                  {iface.name}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}
          >
            <label htmlFor="remote-port" style={{ whiteSpace: 'nowrap' }}>
              Port :
            </label>
            <input
              id="remote-port"
              type="number"
              min={1}
              max={65535}
              value={remotePort}
              onChange={e => handlePortChange(parseInt(e.target.value, 10))}
              style={{ width: '80px' }}
              disabled={isLoading}
            />
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>1–65535, défaut 8066</span>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <label htmlFor={`remote-port-active-${competition.id}`} style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
              Port :
            </label>
            <input
              id={`remote-port-active-${competition.id}`}
              type="number"
              min={1}
              max={65535}
              value={remotePort}
              onChange={e => handlePortChange(parseInt(e.target.value, 10))}
              style={{ width: '75px' }}
              disabled={isLoading}
            />
            <button
              className="btn-secondary"
              onClick={handleChangePort}
              disabled={isLoading}
              title="Redémarrer le serveur sur ce port"
              style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
            >
              🔄 Recharger
            </button>
          </div>
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
              await window.electronAPI.remote.updateShowPhotos(competition.id, e.target.checked);
            }}
          />
          Afficher les photos des combattants avant le combat
        </label>
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
            checked={cardAnnounce}
            onChange={async e => {
              setCardAnnounce(e.target.checked);
              await window.electronAPI.remote.updateCardAnnounce(competition.id, e.target.checked);
            }}
          />
          📣 Carton avancer (afficher bandeau + raison sur les écrans)
        </label>
        {!isLaunched && (
          <div style={{ margin: '0.75rem 0' }}>
            <button
              className="btn-primary"
              style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', fontWeight: 'bold' }}
              onClick={async () => {
                const result = await window.electronAPI.remote.launchCompetition(competition.id);
                if (result.success) {
                  const key = `bellepoule-remote-launched-${competition.id}`;
                  setIsLaunched(true);
                  localStorage.setItem(key, 'true');
                  showToast('Compétition lancée sur les écrans', 'success');
                } else {
                  showToast(`Erreur: ${result.error}`, 'error');
                }
              }}
            >
              🚀 Lancer la compétition
            </button>
          </div>
        )}
        <div style={{ margin: '0.5rem 0' }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.4rem', color: 'inherit' }}>
            Thème de l'affichage :
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(
              [
                { value: 'dark', label: 'Sombre', icon: '🌙' },
                { value: 'light', label: 'Clair', icon: '☀️' },
                { value: 'neon', label: 'Néon', icon: '⚡' },
              ] as const
            ).map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={async () => {
                  setDisplayTheme(value);
                  await window.electronAPI.remote.updateTheme(competition.id, value);
                }}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${displayTheme === value ? '#3b82f6' : '#475569'}`,
                  background: displayTheme === value ? '#1d4ed8' : 'transparent',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontWeight: displayTheme === value ? 700 : 400,
                  fontSize: '0.8rem',
                  transition: 'all 0.15s',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ margin: '0.5rem 0' }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.4rem', color: 'inherit' }}>
            Fond d'écran arènes (écran d'attente) :
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {arenaWallpaper && (
              <img
                src={arenaWallpaper}
                alt="Fond d'écran"
                style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: '0.25rem', border: '1px solid #475569' }}
              />
            )}
            <label
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #475569',
                background: 'transparent',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {arenaWallpaper ? '🖼 Changer' : '🖼 Importer'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async ev => {
                    const base64 = ev.target?.result as string;
                    setArenaWallpaper(base64);
                    await window.electronAPI.remote.setWallpaper(competition.id, base64);
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </label>
            {arenaWallpaper && (
              <button
                onClick={async () => {
                  setArenaWallpaper(null);
                  await window.electronAPI.remote.setWallpaper(competition.id, null);
                }}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ✕ Supprimer
              </button>
            )}
          </div>
        </div>
        <div style={{ margin: '0.5rem 0' }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem', color: 'inherit' }}>
            Vues kiosk :
          </div>
          {(
            [
              { key: 'poules', label: 'Poules' },
              { key: 'classement', label: 'Classement' },
              { key: 'direct', label: 'Matchs en direct' },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={kioskViews[key]}
                onChange={async e => {
                  const next = { ...kioskViews, [key]: e.target.checked };
                  setKioskViews(next);
                  await window.electronAPI.remote.updateKioskViews(competition.id, next);
                }}
              />
              {label}
            </label>
          ))}
        </div>

        {/* Note d'organisation */}
        <div
          style={{
            margin: '0.75rem 0',
            padding: '0.75rem',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            background: '#1e293b',
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#94a3b8',
            }}
          >
            Note d'organisation (kiosk)
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                color: '#e2e8f0',
              }}
            >
              <input
                type="radio"
                name="orgNoteType"
                checked={orgNoteType === 'free'}
                onChange={() => setOrgNoteType('free')}
              />
              Message libre
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                color: '#e2e8f0',
              }}
            >
              <input
                type="radio"
                name="orgNoteType"
                checked={orgNoteType === 'target_time'}
                onChange={() => setOrgNoteType('target_time')}
              />
              Heure de reprise
            </label>
          </div>
          <textarea
            placeholder="Message (ex: Déjeuner des arbitres)"
            value={orgNoteMessage}
            onChange={e => setOrgNoteMessage(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              borderRadius: '0.3rem',
              border: '1px solid #475569',
              background: '#0f172a',
              color: '#e2e8f0',
              boxSizing: 'border-box',
              marginBottom: '0.4rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          />
          {orgNoteType === 'target_time' && (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <select
                value={orgNotePrefix}
                onChange={e => setOrgNotePrefix(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.3rem',
                  border: '1px solid #475569',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                {['Reprise', 'Début', 'Fin', 'Pause', 'Déjeuner', 'Cérémonie'].map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={orgNoteTime}
                onChange={e => setOrgNoteTime(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.3rem',
                  border: '1px solid #475569',
                  background: '#0f172a',
                  color: '#e2e8f0',
                }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              disabled={!orgNoteMessage.trim() || (orgNoteType === 'target_time' && !orgNoteTime)}
              onClick={async () => {
                const note = {
                  type: orgNoteType,
                  message: orgNoteMessage.trim(),
                  ...(orgNoteType === 'target_time'
                    ? { targetTime: orgNoteTime, countdownPrefix: orgNotePrefix }
                    : {}),
                  createdAt: new Date().toISOString(),
                };
                await window.electronAPI.remote.setOrgNote(competition.id, note);
                setOrgNoteActive(true);
              }}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: '0.3rem',
                border: 'none',
                background: orgNoteActive ? '#1d4ed8' : '#2563eb',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {orgNoteActive ? '↻ Mettre à jour' : '▶ Afficher'}
            </button>
            {orgNoteActive && (
              <button
                onClick={async () => {
                  await window.electronAPI.remote.clearOrgNote(competition.id);
                  setOrgNoteActive(false);
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.3rem',
                  border: 'none',
                  background: '#475569',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                ✕ Masquer
              </button>
            )}
          </div>
          {orgNoteActive && (
            <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.4rem' }}>
              ● Note visible sur le kiosk
            </div>
          )}
        </div>

        <div className="arena-url-grid">
          {arenaUrls.map(arena => {
            const arenaId = `arena${arena.number}`;
            const arenaTheme = arenaThemes[arenaId];
            return (
              <div key={arena.number} className="arena-url-card">
                <div className="arena-url-header">
                  <strong>Piste {arena.number}</strong>
                  {/* Sélecteur de thème par arène */}
                  <div className="arena-theme-picker">
                    {[
                      { value: 'dark' as const, icon: '🌙', title: 'Sombre' },
                      { value: 'light' as const, icon: '☀️', title: 'Clair' },
                      { value: 'neon' as const, icon: '⚡', title: 'Néon' },
                    ].map(({ value, icon, title }) => (
                      <button
                        key={value}
                        title={title}
                        className={`arena-theme-btn ${arenaTheme?.theme === value ? 'active' : ''}`}
                        onClick={() => handleArenaThemeChange(arenaId, value)}
                      >
                        {icon}
                      </button>
                    ))}
                    <button
                      title="Thème personnalisé"
                      className={`arena-theme-btn ${arenaTheme?.theme === 'custom' ? 'active' : ''}`}
                      onClick={() => setThemeEditorTarget(arenaId)}
                    >
                      ✏️
                    </button>
                  </div>
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
                      setActiveQR({
                        url: arena.refereeUrl,
                        label: `Piste ${arena.number} – Arbitre`,
                      })
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
                          competition.id,
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
                        competition.id,
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
            );
          })}
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

      {themeEditorTarget && (
        <ThemeEditor
          targetArenaId={themeEditorTarget}
          initialTheme={arenaThemes[themeEditorTarget]?.customTheme}
          onApply={async (arenaId, theme) => {
            await handleArenaThemeChange(arenaId, 'custom', theme);
            setThemeEditorTarget(null);
            showToast('Thème personnalisé appliqué', 'success');
          }}
          onClose={() => setThemeEditorTarget(null)}
        />
      )}

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
