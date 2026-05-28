import React, { useState, useEffect, useRef } from 'react';
import type { VersionInfo } from '../../shared/types/preload';

interface Props {
  onClose: () => void;
}

function playCluck(delaySeconds: number): void {
  try {
    const ctx = new AudioContext();
    // "cot-cot" = deux notes sawtooth descendantes
    [520, 380].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delaySeconds + i * 0.18);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + delaySeconds + i * 0.18 + 0.14);
      gain.gain.setValueAtTime(0.28, ctx.currentTime + delaySeconds + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delaySeconds + i * 0.18 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delaySeconds + i * 0.18);
      osc.stop(ctx.currentTime + delaySeconds + i * 0.18 + 0.15);
    });
    // clash sound : bref bruit blanc
    const bufSize = ctx.sampleRate * 0.08;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let k = 0; k < bufSize; k++) data[k] = (Math.random() * 2 - 1) * 0.15;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime + delaySeconds + 0.36);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delaySeconds + 0.44);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime + delaySeconds + 0.36);
    noise.stop(ctx.currentTime + delaySeconds + 0.45);
  } catch {
    // AudioContext non disponible
  }
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 12000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-secondary, #1e1e2e)',
    border: '1px solid var(--border-color, #333)',
    borderRadius: '12px',
    padding: '2rem',
    minWidth: '380px',
    maxWidth: '480px',
    color: 'var(--text-primary, #e0e0e0)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    position: 'relative',
  },
  title: {
    fontSize: '1.4rem', fontWeight: 700,
    marginBottom: '0.5rem',
    color: 'var(--accent-color, #7c9ef5)',
  },
  versionBadge: {
    display: 'inline-block',
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: '6px',
    background: 'var(--bg-tertiary, #2a2a3e)',
    border: '1px solid var(--border-color, #444)',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    userSelect: 'none',
    transition: 'box-shadow 0.2s',
  },
  meta: { fontSize: '0.82rem', color: 'var(--text-muted, #888)', marginTop: '0.3rem' },
  desc: { fontSize: '0.9rem', marginTop: '1rem', lineHeight: 1.6 },
  licence: { fontSize: '0.8rem', color: 'var(--text-muted, #888)', marginTop: '0.8rem' },
  hint: { fontSize: '0.72rem', color: 'var(--text-muted, #666)', marginTop: '0.3rem', fontStyle: 'italic' },
  closeBtn: {
    position: 'absolute', top: '1rem', right: '1rem',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '1.2rem', color: 'var(--text-muted, #888)',
    lineHeight: 1,
  },
  // Easter egg arena
  arena: {
    marginTop: '1.2rem',
    background: 'linear-gradient(180deg, #0a0a1a 60%, #1a0a00 100%)',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    position: 'relative',
    height: '100px',
    overflow: 'hidden',
    border: '1px solid #333',
  },
  chickenWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    fontSize: '2.8rem',
    lineHeight: 1,
  },
  saber: {
    position: 'absolute',
    top: '50%',
    width: '44px',
    height: '5px',
    borderRadius: '3px',
    transformOrigin: 'left center',
    transform: 'translateY(-50%)',
  },
  sparkContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    fontSize: '1.4rem',
    zIndex: 10,
  },
  easterText: {
    fontSize: '0.72rem',
    color: '#666',
    textAlign: 'center',
    marginTop: '0.4rem',
  },
};

// Keyframe injection (si pas déjà présent)
let injected = false;
function injectKeyframes() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bp-chicken-left {
      0%   { transform: translateX(0px) rotate(0deg); }
      20%  { transform: translateX(28px) rotate(-8deg); }
      40%  { transform: translateX(2px) rotate(2deg); }
      55%  { transform: translateX(28px) rotate(-8deg); }
      70%  { transform: translateX(2px) rotate(2deg); }
      85%  { transform: translateX(28px) rotate(-8deg); }
      100% { transform: translateX(0px) rotate(0deg); }
    }
    @keyframes bp-chicken-right {
      0%   { transform: scaleX(-1) translateX(0px) rotate(0deg); }
      20%  { transform: scaleX(-1) translateX(28px) rotate(-8deg); }
      40%  { transform: scaleX(-1) translateX(2px) rotate(2deg); }
      55%  { transform: scaleX(-1) translateX(28px) rotate(-8deg); }
      70%  { transform: scaleX(-1) translateX(2px) rotate(2deg); }
      85%  { transform: scaleX(-1) translateX(28px) rotate(-8deg); }
      100% { transform: scaleX(-1) translateX(0px) rotate(0deg); }
    }
    @keyframes bp-spark {
      0%,100% { opacity: 0; transform: translate(-50%,-50%) scale(0); }
      22%     { opacity: 1; transform: translate(-50%,-50%) scale(1.3); }
      30%     { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
      57%     { opacity: 1; transform: translate(-50%,-50%) scale(1.3); }
      65%     { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
      87%     { opacity: 1; transform: translate(-50%,-50%) scale(1.3); }
      95%     { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
    }
    @keyframes bp-saber-blue {
      0%,100% { transform: translateY(-50%) rotate(0deg); box-shadow: 0 0 8px 3px #3af, 0 0 2px 1px #fff; }
      20%     { transform: translateY(-50%) rotate(-25deg); box-shadow: 0 0 14px 5px #3af, 0 0 4px 2px #fff; }
      40%     { transform: translateY(-50%) rotate(5deg); box-shadow: 0 0 8px 3px #3af, 0 0 2px 1px #fff; }
      55%     { transform: translateY(-50%) rotate(-25deg); box-shadow: 0 0 14px 5px #3af, 0 0 4px 2px #fff; }
      70%     { transform: translateY(-50%) rotate(5deg); }
      85%     { transform: translateY(-50%) rotate(-25deg); box-shadow: 0 0 14px 5px #3af, 0 0 4px 2px #fff; }
    }
    @keyframes bp-saber-red {
      0%,100% { transform: translateY(-50%) rotate(180deg); box-shadow: 0 0 8px 3px #f44, 0 0 2px 1px #fff; }
      20%     { transform: translateY(-50%) rotate(205deg); box-shadow: 0 0 14px 5px #f44, 0 0 4px 2px #fff; }
      40%     { transform: translateY(-50%) rotate(175deg); box-shadow: 0 0 8px 3px #f44, 0 0 2px 1px #fff; }
      55%     { transform: translateY(-50%) rotate(205deg); box-shadow: 0 0 14px 5px #f44, 0 0 4px 2px #fff; }
      70%     { transform: translateY(-50%) rotate(175deg); }
      85%     { transform: translateY(-50%) rotate(205deg); box-shadow: 0 0 14px 5px #f44, 0 0 4px 2px #fff; }
    }
    @keyframes bp-version-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(124,158,245,0); }
      50%     { box-shadow: 0 0 0 3px rgba(124,158,245,0.3); }
    }
  `;
  document.head.appendChild(style);
}

const AboutModal: React.FC<Props> = ({ onClose }) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [easterActive, setEasterActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    injectKeyframes();
    window.electronAPI?.getVersionInfo().then(setVersionInfo).catch(() => {});
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const triggerEasterEgg = () => {
    if (easterActive) return;
    setEasterActive(true);
    // 3 clashes à ~0s, 1.3s, 2.6s
    playCluck(0);
    playCluck(1.3);
    playCluck(2.6);
    timerRef.current = setTimeout(() => setEasterActive(false), 4200);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const buildDate = versionInfo
    ? new Date(versionInfo.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '…';

  const animDuration = '4s';

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose} title="Fermer">✕</button>

        <div style={styles.title}>BellePoule Modern</div>

        <div>
          <span
            style={{
              ...styles.versionBadge,
              animation: 'bp-version-pulse 2s ease-in-out infinite',
            }}
            onDoubleClick={triggerEasterEgg}
            title="Double-clic pour une surprise…"
          >
            v{versionInfo?.version ?? '…'}
          </span>
          {' '}
          <span style={styles.meta}>Build #{versionInfo?.build ?? '…'} — {buildDate}</span>
        </div>

        <div style={styles.hint}>💡 Double-clique sur la version…</div>

        <div style={styles.desc}>
          Logiciel de gestion de tournois d'escrime.<br />
          Poules, tableaux directs, arbitrage déporté en temps réel.
        </div>

        <div style={styles.licence}>
          Licence : GPL-3.0 &nbsp;·&nbsp; © 2024-2026 BellePoule Modern Contributors
        </div>

        {easterActive && (
          <div>
            <div style={styles.arena}>
              {/* Poule gauche + sabre bleu */}
              <div
                style={{
                  ...styles.chickenWrap,
                  animation: `bp-chicken-left ${animDuration} ease-in-out`,
                  marginRight: '60px',
                }}
              >
                🐔
                <div
                  style={{
                    ...styles.saber,
                    left: '90%',
                    background: 'linear-gradient(90deg, #fff 0%, #3af 30%, #07f 100%)',
                    animation: `bp-saber-blue ${animDuration} ease-in-out`,
                  }}
                />
              </div>

              {/* Étincelles au centre */}
              <div
                style={{
                  ...styles.sparkContainer,
                  animation: `bp-spark ${animDuration} ease-in-out`,
                }}
              >
                ✨⚡✨
              </div>

              {/* Poule droite + sabre rouge */}
              <div
                style={{
                  ...styles.chickenWrap,
                  animation: `bp-chicken-right ${animDuration} ease-in-out`,
                  marginLeft: '60px',
                }}
              >
                🐔
                <div
                  style={{
                    ...styles.saber,
                    right: '90%',
                    left: 'auto',
                    background: 'linear-gradient(270deg, #fff 0%, #f44 30%, #a00 100%)',
                    animation: `bp-saber-red ${animDuration} ease-in-out`,
                  }}
                />
              </div>
            </div>
            <div style={styles.easterText}>🐔 Cot-cot ! 🐔</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutModal;
