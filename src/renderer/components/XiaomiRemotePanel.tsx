/**
 * BellePoule Modern - Xiaomi TV Remote Control Panel
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ConnectedClient, TVCommand, KioskScreenConfig } from '@shared/types/preload';

interface XiaomiRemotePanelProps {
  competitionId: string;
  serverUrl: string;
  arenaCount: number;
  onClose: () => void;
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  arena: 'Arène',
  lobby: 'Lobby',
  kiosk: 'Kiosk',
  public: 'Public',
  pool: 'Poules',
  dashboard: 'Dashboard',
};

function getOnlineStatus(lastSeen: string): 'online' | 'warn' | 'offline' {
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 35000) return 'online';
  if (diff < 120000) return 'warn';
  return 'offline';
}

function formatLastSeen(lastSeen: string): string {
  const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (diff < 10) return 'à l\'instant';
  if (diff < 60) return `il y a ${diff}s`;
  return `il y a ${Math.floor(diff / 60)}m`;
}

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  warn: '#f59e0b',
  offline: '#6b7280',
};

function clientDisplayUrl(base: string, client: ConnectedClient): string {
  if (client.clientType === 'lobby' || !client.arenaId) return `${base}/lobby`;
  const num = client.arenaId.replace('arena', '');
  return `${base}/arene${num}`;
}

function clientLabel(client: ConnectedClient): string {
  if (client.label) return client.label;
  const type = CLIENT_TYPE_LABELS[client.clientType] ?? client.clientType;
  if (client.clientType === 'arena' && client.arenaId) {
    const num = client.arenaId.replace('arena', '');
    return `${type} ${num}`;
  }
  return type;
}

const DEFAULT_KIOSK_CONFIG: KioskScreenConfig = {
  poules: true, classement: true, direct: true, suivants: true, tableau: true, rotationSec: 15,
};

const KIOSK_VIEWS: { key: keyof KioskScreenConfig; label: string }[] = [
  { key: 'poules', label: 'Poules' },
  { key: 'classement', label: 'Classement' },
  { key: 'direct', label: 'Matchs en direct' },
  { key: 'suivants', label: 'Matchs suivants' },
  { key: 'tableau', label: 'Tableau DE' },
];

const XiaomiRemotePanelComponent: React.FC<XiaomiRemotePanelProps> = ({
  competitionId,
  serverUrl,
  arenaCount,
  onClose,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [message, setMessage] = useState('');
  const [msgDuration, setMsgDuration] = useState(5);
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [swapSet, setSwapSet] = useState<Set<string>>(new Set());
  const navRef = useRef<HTMLDivElement>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [kioskTarget, setKioskTarget] = useState<string | null>(null);
  const [kioskConfig, setKioskConfig] = useState<KioskScreenConfig>(DEFAULT_KIOSK_CONFIG);
  const [locked, setLocked] = useState<boolean>(() => localStorage.getItem('bp_remote_locked') === '1');

  const toggleLock = () => {
    setLocked(prev => {
      const next = !prev;
      localStorage.setItem('bp_remote_locked', next ? '1' : '0');
      return next;
    });
  };

  const base = serverUrl.replace(/\/$/, '');
  const allNavTargets = buildNavTargets(base, arenaCount);

  const fetchClients = useCallback(async () => {
    const res = await window.electronAPI.remote.getConnectedClients(competitionId);
    if (res.success) setClients(res.clients);
  }, [competitionId]);

  useEffect(() => {
    fetchClients();
    const interval = setInterval(fetchClients, 5000);
    const unsub = window.electronAPI.remote.onClientListUpdate((updated) => setClients(updated));
    return () => { clearInterval(interval); unsub(); };
  }, [fetchClients]);

  useEffect(() => {
    if (!openNav) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenNav(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openNav]);

  const sendCmd = useCallback((socketId: string, cmd: TVCommand) => {
    window.electronAPI.remote.sendClientCommand(competitionId, socketId, cmd);
  }, [competitionId]);

  const broadcastCmd = useCallback((cmd: TVCommand) => {
    window.electronAPI.remote.broadcastCommand(competitionId, cmd);
  }, [competitionId]);

  const toggleSwap = (socketId: string) => {
    setSwapSet(prev => {
      const next = new Set(prev);
      if (next.has(socketId)) {
        next.delete(socketId);
      } else if (next.size < 2) {
        next.add(socketId);
      }
      return next;
    });
  };

  const confirmSwap = () => {
    const [idA, idB] = [...swapSet];
    const clientA = clients.find(c => c.socketId === idA);
    const clientB = clients.find(c => c.socketId === idB);
    if (!clientA || !clientB) return;
    const urlA = clientDisplayUrl(base, clientA);
    const urlB = clientDisplayUrl(base, clientB);
    sendCmd(idA, { type: 'navigate', url: urlB });
    sendCmd(idB, { type: 'navigate', url: urlA });
    setSwapSet(new Set());
  };

  const commitRename = () => {
    if (renameTarget) {
      const lbl = renameValue.trim();
      window.electronAPI.remote.renameClient(competitionId, renameTarget, lbl);
    }
    setRenameTarget(null);
    setRenameValue('');
  };

  const sendKiosk = () => {
    if (!kioskTarget) return;
    window.electronAPI.remote.setClientKioskMode(competitionId, kioskTarget, kioskConfig);
    setKioskTarget(null);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    broadcastCmd({ type: 'message', text: message.trim(), duration: msgDuration * 1000 });
  };

  const swapCandidates = clients.filter(c => swapSet.has(c.socketId));
  const canSwap = swapSet.size === 2;
  const isArenaOrLobby = (c: ConnectedClient) => c.clientType === 'arena' || c.clientType === 'lobby';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '12px', width: '600px', maxWidth: '96vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📺</span>
          <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1 }}>Télécommande TV</span>
          <button
            className={`btn ${locked ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleLock}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
            title={locked ? 'Déverrouiller la télécommande' : 'Verrouiller la télécommande pour éviter les changements'}
          >
            {locked ? '🔒 Verrouillé' : '🔓 Verrouiller'}
          </button>
          <button className="btn btn-secondary" onClick={fetchClients} style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }} title="Actualiser">↻</button>
          <button className="btn btn-primary" onClick={() => broadcastCmd({ type: 'refresh' })} disabled={locked} style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', opacity: locked ? 0.4 : 1 }}>Tout rafraîchir</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '1.2rem', padding: '0 0.2rem' }}>×</button>
        </div>

        {/* Lobby URL hint */}
        <div style={{ padding: '0.55rem 1.25rem', background: 'rgba(56,189,248,0.1)', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💡</span>
          <span>URL sans arène : <strong>{base}/lobby</strong> — les écrans y attendent leur affectation</span>
        </div>

        {/* Bandeau verrou */}
        {locked && (
          <div style={{ padding: '0.55rem 1.25rem', background: 'rgba(34,197,94,0.1)', borderBottom: '1px solid rgba(34,197,94,0.3)', fontSize: '0.78rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔒</span>
            <span>Télécommande verrouillée — actions désactivées. Cliquez sur « Verrouillé » pour déverrouiller.</span>
          </div>
        )}

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem', pointerEvents: locked ? 'none' : 'auto', opacity: locked ? 0.55 : 1 }}>
          {clients.length === 0 ? (
            <div style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
              Aucun écran connecté.<br />
              <span style={{ fontSize: '0.8rem' }}>Ouvrez <strong>{base}/lobby</strong> sur une TV pour qu'elle apparaisse ici.</span>
            </div>
          ) : (
            clients.map((client) => {
              const status = getOnlineStatus(client.lastSeen);
              const inSwap = swapSet.has(client.socketId);
              const swapFull = swapSet.size >= 2 && !inSwap;
              return (
                <div
                  key={client.socketId}
                  style={{ background: inSwap ? 'rgba(249,115,22,0.12)' : 'var(--color-bg)', border: `1px solid ${inSwap ? 'rgba(249,115,22,0.4)' : 'var(--color-border)'}`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0 }} />

                  {/* Label + IP */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renameTarget === client.socketId ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenameTarget(null); setRenameValue(''); } }}
                        placeholder="Nom de l'écran…"
                        style={{ width: '100%', padding: '0.2rem 0.4rem', fontSize: '0.85rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '5px', color: 'inherit' }}
                      />
                    ) : (
                      <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{clientLabel(client)}</div>
                    )}
                    <div style={{ fontSize: '0.73rem', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.ip} · {formatLastSeen(client.lastSeen)}
                    </div>
                  </div>

                  {/* Affecter à (arena/lobby only) */}
                  {isArenaOrLobby(client) && (
                    <select
                      value={clientDisplayUrl(base, client)}
                      onChange={e => sendCmd(client.socketId, { type: 'navigate', url: e.target.value })}
                      style={{ padding: '0.2rem 0.3rem', fontSize: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '5px', color: 'inherit', maxWidth: '120px' }}
                      title="Affecter à…"
                    >
                      <option value={`${base}/lobby`}>Lobby</option>
                      {Array.from({ length: arenaCount }, (_, i) => (
                        <option key={i + 1} value={`${base}/arene${i + 1}`}>Arène {i + 1}</option>
                      ))}
                    </select>
                  )}

                  {/* Identifier */}
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => window.electronAPI.remote.identifyClient(competitionId, client.socketId)} title="Faire clignoter cet écran pour le repérer">🔦 Identifier</button>

                  {/* Renommer */}
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }} onClick={() => { setRenameTarget(client.socketId); setRenameValue(client.label ?? ''); }} title="Renommer cet écran">✏️</button>

                  {/* Mode kiosk */}
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }} onClick={() => { setKioskTarget(client.socketId); setKioskConfig(DEFAULT_KIOSK_CONFIG); }} title="Configurer et envoyer en mode kiosk">🖥️</button>

                  {/* Rafraîchir */}
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }} onClick={() => sendCmd(client.socketId, { type: 'refresh' })} title="Rafraîchir">↻</button>

                  {/* Naviguer (tous types) */}
                  <div ref={openNav === client.socketId ? navRef : null} style={{ position: 'relative' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }} onClick={() => setOpenNav(openNav === client.socketId ? null : client.socketId)}>▾</button>
                    {openNav === client.socketId && (
                      <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: '170px', zIndex: 300, overflow: 'hidden' }}>
                        {allNavTargets.map(t => (
                          <button key={t.url} className="comp-header-dropdown-item" style={{ width: '100%', textAlign: 'left', fontSize: '0.82rem' }} onClick={() => { sendCmd(client.socketId, { type: 'navigate', url: t.url }); setOpenNav(null); }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Intervertir toggle (arena/lobby only) */}
                  {isArenaOrLobby(client) && (
                    <button
                      className={`btn ${inSwap ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', opacity: swapFull ? 0.4 : 1 }}
                      onClick={() => !swapFull && toggleSwap(client.socketId)}
                      title={inSwap ? 'Retirer de la sélection' : 'Sélectionner pour intervertir'}
                      disabled={swapFull}
                    >
                      ⇄
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bandeau intervertir */}
        {swapSet.size > 0 && (
          <div style={{ padding: '0.65rem 1.25rem', background: 'rgba(249,115,22,0.12)', borderTop: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.88rem', flex: 1, color: '#ea580c' }}>
              ⇄ Intervertir{' '}
              {swapCandidates.map(c => <strong key={c.socketId}>{clientLabel(c)}</strong>).reduce((a, b) => <>{a} <span style={{ color: '#94a3b8' }}>↔</span> {b}</> as any)}
              {swapSet.size === 1 && <span style={{ color: '#94a3b8' }}> — sélectionner un 2ᵉ écran</span>}
            </span>
            {canSwap && (
              <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem' }} onClick={confirmSwap}>
                Confirmer
              </button>
            )}
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem' }} onClick={() => setSwapSet(new Set())}>
              Annuler
            </button>
          </div>
        )}

        {/* Message global */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border)', pointerEvents: locked ? 'none' : 'auto', opacity: locked ? 0.55 : 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message global</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Texte affiché en bas de tous les écrans…"
              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'inherit' }}
            />
            <select
              value={msgDuration}
              onChange={e => setMsgDuration(Number(e.target.value))}
              style={{ padding: '0.4rem 0.3rem', fontSize: '0.82rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'inherit' }}
            >
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={sendMessage}>Envoyer</button>
          </div>
        </div>
      </div>

      {/* Modal config kiosk */}
      {kioskTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={e => { if (e.target === e.currentTarget) setKioskTarget(null); }}
        >
          <div style={{ background: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', borderRadius: '12px', width: '360px', maxWidth: '94vw', padding: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.85rem' }}>🖥️ Configurer le mode kiosk</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }}>Vues à afficher :</div>
            {KIOSK_VIEWS.map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.3rem 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={kioskConfig[key] as boolean}
                  onChange={e => setKioskConfig(c => ({ ...c, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Rotation (s) :</label>
              <input
                type="number"
                min={3}
                max={300}
                value={kioskConfig.rotationSec}
                onChange={e => setKioskConfig(c => ({ ...c, rotationSec: Math.max(3, parseInt(e.target.value) || 15) }))}
                style={{ width: '5rem', padding: '0.3rem 0.5rem', borderRadius: '5px', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', background: 'var(--bg-secondary, rgba(255,255,255,0.06))', color: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={sendKiosk}>Envoyer en kiosk</button>
              <button className="btn btn-secondary" onClick={() => setKioskTarget(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function buildNavTargets(base: string, arenaCount: number) {
  const targets: { label: string; url: string }[] = [{ label: 'Salle d\'attente (Lobby)', url: `${base}/lobby` }];
  for (let i = 1; i <= arenaCount; i++) targets.push({ label: `Arène ${i}`, url: `${base}/arene${i}` });
  targets.push({ label: 'Kiosk public', url: `${base}/kiosk` });
  targets.push({ label: 'Classement', url: `${base}/` });
  return targets;
}

export const XiaomiRemotePanel = React.memo(XiaomiRemotePanelComponent);
