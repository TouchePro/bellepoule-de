/**
 * BellePoule Modern - Xiaomi TV Remote Control Panel
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ConnectedClient, TVCommand } from '@shared/types/preload';

interface XiaomiRemotePanelProps {
  competitionId: string;
  serverUrl: string;
  arenaCount: number;
  onClose: () => void;
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  arena: 'Arène',
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
  const m = Math.floor(diff / 60);
  return `il y a ${m}m`;
}

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  warn: '#f59e0b',
  offline: '#6b7280',
};

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
  const navRef = useRef<HTMLDivElement>(null);

  const navTargets = buildNavTargets(serverUrl, arenaCount);

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
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenNav(null);
      }
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

  const sendMessage = () => {
    if (!message.trim()) return;
    broadcastCmd({ type: 'message', text: message.trim(), duration: msgDuration * 1000 });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        style={{
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          borderRadius: '12px',
          width: '560px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📺</span>
          <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1 }}>Télécommande TV</span>
          <button className="btn btn-secondary" onClick={fetchClients} style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>↻</button>
          <button className="btn btn-primary" onClick={() => broadcastCmd({ type: 'refresh' })} style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Tout rafraîchir</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', fontSize: '1.2rem', padding: '0 0.25rem' }}>×</button>
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
          {clients.length === 0 ? (
            <div style={{ color: 'var(--text-muted, #6b7280)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
              Aucun écran connecté.<br />
              <span style={{ fontSize: '0.8rem' }}>Les TV apparaissent ici dès qu'elles ouvrent une page arena ou kiosk.</span>
            </div>
          ) : (
            clients.map((client) => {
              const status = getOnlineStatus(client.lastSeen);
              return (
                <div
                  key={client.socketId}
                  style={{
                    background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>
                      {CLIENT_TYPE_LABELS[client.clientType] ?? client.clientType}
                      {client.arenaId ? ` — ${client.arenaId}` : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.ip} · {formatLastSeen(client.lastSeen)}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => sendCmd(client.socketId, { type: 'refresh' })}
                  >
                    ↻
                  </button>
                  <div ref={openNav === client.socketId ? navRef : null} style={{ position: 'relative' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => setOpenNav(openNav === client.socketId ? null : client.socketId)}
                    >
                      Naviguer ▾
                    </button>
                    {openNav === client.socketId && (
                      <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: '180px', zIndex: 300, overflow: 'hidden' }}>
                        {navTargets.map(t => (
                          <button
                            key={t.url}
                            className="comp-header-dropdown-item"
                            style={{ width: '100%', textAlign: 'left', fontSize: '0.82rem' }}
                            onClick={() => { sendCmd(client.socketId, { type: 'navigate', url: t.url }); setOpenNav(null); }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => sendCmd(client.socketId, { type: 'ping' })}
                    title="Ping"
                  >
                    Ping
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Message global */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message global</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Texte affiché en bas de tous les écrans…"
              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem', background: 'var(--bg-secondary, rgba(255,255,255,0.06))', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', borderRadius: '6px', color: 'inherit' }}
            />
            <select
              value={msgDuration}
              onChange={e => setMsgDuration(Number(e.target.value))}
              style={{ padding: '0.4rem 0.4rem', fontSize: '0.82rem', background: 'var(--bg-secondary, rgba(255,255,255,0.06))', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', borderRadius: '6px', color: 'inherit' }}
            >
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={sendMessage}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function buildNavTargets(serverUrl: string, arenaCount: number) {
  const base = serverUrl.replace(/\/$/, '');
  const targets: { label: string; url: string }[] = [];
  for (let i = 1; i <= arenaCount; i++) {
    targets.push({ label: `Arène ${i}`, url: `${base}/arene${i}` });
  }
  targets.push({ label: 'Kiosk public', url: `${base}/kiosk` });
  targets.push({ label: 'Classement', url: `${base}/` });
  return targets;
}

export const XiaomiRemotePanel = React.memo(XiaomiRemotePanelComponent);
