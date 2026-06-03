/**
 * Son de démarrage : 3 chocs d'épées puis bourdon de sabre laser.
 * Synthèse Web Audio (aucun fichier externe, compatible CSP).
 * Joué une seule fois au lancement de l'application.
 */

let played = false;

function noiseBuffer(ctx: AudioContext, dur: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Un choc d'épée : burst de bruit filtré (clang métallique) + déclin rapide.
function clang(ctx: AudioContext, t0: number, freq: number, gainPeak: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.35);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 6;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
  src.connect(bp);
  bp.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + 0.35);

  // Anneau résonant (tintement aigu)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq * 1.6;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(gainPeak * 0.5, t0 + 0.006);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
  osc.connect(og);
  og.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.45);
}

// Sabre laser : bourdon (oscillateurs désaccordés) + vibrato + balayage filtre.
function lightsaber(ctx: AudioContext, t0: number, dur: number): void {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(0.22, t0 + 0.12);
  out.gain.setValueAtTime(0.22, t0 + dur - 0.25);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t0);
  lp.frequency.exponentialRampToValueAtTime(2200, t0 + 0.18);
  lp.frequency.exponentialRampToValueAtTime(800, t0 + dur);
  lp.connect(out);
  out.connect(ctx.destination);

  // Vibrato (la respiration du sabre)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 22;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 6;
  lfo.connect(lfoG);
  lfo.start(t0);
  lfo.stop(t0 + dur);

  [110, 113, 165].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    lfoG.connect(o.frequency);
    o.connect(lp);
    o.start(t0);
    o.stop(t0 + dur);
  });
}

function render(ctx: AudioContext): void {
  const t = ctx.currentTime + 0.15;
  clang(ctx, t, 3200, 0.6); // choc 1
  clang(ctx, t + 0.32, 2600, 0.55); // choc 2
  clang(ctx, t + 0.62, 3800, 0.5); // choc 3
  lightsaber(ctx, t + 1.0, 2.4); // sabre laser après les chocs
}

/**
 * Joue le son de démarrage une seule fois.
 * Si l'autoplay est bloqué (contexte suspendu), réessaie au premier geste utilisateur.
 */
export function playStartupSound(): void {
  if (played) return;
  played = true;

  const AC: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  let ctx: AudioContext;
  try {
    ctx = new AC();
  } catch {
    return;
  }

  const go = (): void => render(ctx);

  if (ctx.state === 'suspended') {
    // Autoplay bloqué : tente resume, sinon attend le premier geste utilisateur.
    ctx.resume().then(
      () => go(),
      () => {
        const once = (): void => {
          ctx.resume().then(go, () => undefined);
          window.removeEventListener('pointerdown', once);
          window.removeEventListener('keydown', once);
        };
        window.addEventListener('pointerdown', once, { once: true });
        window.addEventListener('keydown', once, { once: true });
      }
    );
  } else {
    go();
  }
}
