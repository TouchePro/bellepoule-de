/**
 * BellePoule Modern - PDF Export Service
 * Génération PDF via Electron printToPDF (sans menus ni chrome applicatif)
 * Licensed under GPL-3.0
 */

import { Pool, Match, MatchStatus, Fencer, PoolRanking, Weapon } from '../types';
import { calculateFencerQuestStats } from './poolCalculations';
import type { PdfTemplate } from '../types/pdfTemplate.types';

export interface PoolExportOptions {
  title?: string;
  competitionName?: string;
  weapon?: string;
  category?: string;
  includeFinishedMatches?: boolean;
  includePendingMatches?: boolean;
  includePoolStats?: boolean;
  logoBase64?: string;
  visibleColumns?: string[];
  signatures?: Record<string, string>; // fencerId → data URL PNG
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreForCell(
  fencer: Fencer,
  opponent: Fencer,
  matches: Match[]
): { display: string; isVictory: boolean } | null {
  const match = matches.find(
    m =>
      (m.fencerA?.id === fencer.id && m.fencerB?.id === opponent.id) ||
      (m.fencerB?.id === fencer.id && m.fencerA?.id === opponent.id)
  );
  if (!match || match.status !== MatchStatus.FINISHED) return null;
  const isFencerA = match.fencerA?.id === fencer.id;
  const score = isFencerA ? match.scoreA : match.scoreB;
  if (!score) return null;
  return {
    display: `${score.isVictory ? 'V' : ''}${score.value ?? 0}`,
    isVictory: score.isVictory,
  };
}

function calculateFencerStats(
  fencer: Fencer,
  matches: Match[]
): { v: number; d: number; td: number; tr: number; ind: number; ratio: number } {
  let v = 0, d = 0, td = 0, tr = 0;
  for (const match of matches) {
    if (match.status !== MatchStatus.FINISHED) continue;
    const isFencerA = match.fencerA?.id === fencer.id;
    const isFencerB = match.fencerB?.id === fencer.id;
    if (!isFencerA && !isFencerB) continue;
    const myScore = isFencerA ? match.scoreA : match.scoreB;
    const oppScore = isFencerA ? match.scoreB : match.scoreA;
    if (!myScore || !oppScore) continue;
    td += myScore.value ?? 0;
    tr += oppScore.value ?? 0;
    if (myScore.isVictory) v++; else d++;
  }
  const played = v + d;
  return { v, d, td, tr, ind: td - tr, ratio: played > 0 ? v / played : 0 };
}

/** Sauvegarde PDF via Electron IPC, avec dialogue de fichier. */
async function savePDF(html: string, defaultName: string): Promise<void> {
  const api = (window as any).electronAPI;
  if (!api?.dialog?.saveFile || !api?.file?.printHtmlToPDF) {
    throw new Error('API Electron non disponible');
  }

  const result = await api.dialog.saveFile({
    title: 'Enregistrer le PDF',
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (!result || result.canceled || !result.filePath) return;

  const res = await api.file.printHtmlToPDF(html, result.filePath);
  if (!res.success) {
    throw new Error(res.error ?? 'Échec de la génération PDF');
  }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

function buildCssOverrides(t: PdfTemplate): string {
  return `:root { --navy: ${t.colors.navy}; --gold: ${t.colors.gold}; --green: ${t.colors.green}; }`;
}

function isVisible(t: PdfTemplate | undefined, id: string): boolean {
  if (!t) return true;
  return t.elements.find(e => e.id === id)?.visible ?? true;
}

function assembleBody(
  sections: Record<string, string>,
  t: PdfTemplate | undefined,
  defaultOrder: string[]
): string {
  const order = t
    ? [...t.elements].sort((a, b) => a.order - b.order).map(e => e.id)
    : defaultOrder;
  return order.filter(id => isVisible(t, id)).map(id => sections[id] ?? '').join('\n');
}

// ─── CSS commun ───────────────────────────────────────────────────────────────

const BASE_CSS = `
  @page { size: A4; margin: 12mm 10mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy:        #1a2e4a;
    --navy-light:  #2c4a73;
    --gold:        #c9a227;
    --gold-light:  #f5e6a3;
    --gold-bg:     #fffbeb;
    --green:       #166534;
    --green-bg:    #dcfce7;
    --gray-dark:   #475569;
    --gray-mid:    #94a3b8;
    --gray-light:  #e2e8f0;
    --gray-xlight: #f8fafc;
    --border:      #cbd5e1;
    --text:        #1e293b;
    --white:       #ffffff;
  }
  body {
    font-family: 'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 9.5pt;
    color: var(--text);
    background: var(--white);
  }
  /* ── Header ── */
  .doc-header {
    background: var(--navy);
    color: var(--white);
    padding: 5mm 6mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
  }
  .doc-header-logo {
    max-height: 10mm;
    max-width: 35mm;
    object-fit: contain;
    margin-right: 4mm;
    flex-shrink: 0;
  }
  .doc-header-left h1 {
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    line-height: 1.2;
  }
  .doc-header-left .subtitle {
    font-size: 8.5pt;
    color: var(--gold-light);
    margin-top: 1.5mm;
    letter-spacing: 0.5px;
  }
  .doc-header-badge {
    background: var(--gold);
    color: var(--navy);
    font-weight: 900;
    font-size: 18pt;
    min-width: 16mm;
    height: 16mm;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .gold-bar {
    height: 3px;
    background: linear-gradient(90deg, var(--navy) 0%, var(--gold) 50%, var(--navy) 100%);
    margin-bottom: 4mm;
  }
  /* ── Meta chips ── */
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm;
    margin-bottom: 4mm;
    align-items: center;
  }
  .chip {
    background: var(--gray-xlight);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.8mm 3mm;
    font-size: 8pt;
    color: var(--gray-dark);
  }
  .chip strong { color: var(--navy); }
  .chip.gold { background: var(--gold-bg); border-color: var(--gold); }
  .chip.gold strong { color: #92400e; }
  /* ── Nom compétition ── */
  .competition-name-section {
    text-align: center;
    padding: 2mm 6mm;
    background: var(--navy);
    color: var(--gold);
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 2mm;
    border-radius: 3px;
  }
  /* ── Section titre ── */
  .section-label {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--navy);
    display: flex;
    align-items: center;
    gap: 2mm;
    margin-bottom: 2mm;
  }
  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  /* ── Footer ── */
  .doc-footer {
    margin-top: 5mm;
    padding-top: 2mm;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: var(--gray-mid);
  }
`;

// ─── HTML Poule ───────────────────────────────────────────────────────────────

type RankData = { fencer: Fencer; stats: ReturnType<typeof calculateFencerStats>; rank: number; questPoints: number };

const STAT_COLS: { id: string; header: string; cls: string; render: (d: RankData) => string }[] = [
  { id: 'victories', header: 'V',      cls: 'stat-cell', render: d => `${d.stats.v}` },
  { id: 'ratio',     header: 'V/M',    cls: 'stat-cell', render: d => d.stats.ratio.toFixed(2) },
  { id: 'td',        header: 'TD',     cls: 'stat-cell', render: d => `${d.stats.td}` },
  { id: 'tr',        header: 'TR',     cls: 'stat-cell', render: d => `${d.stats.tr}` },
  { id: 'index',     header: 'Ind',    cls: 'stat-cell', render: d => d.stats.ind >= 0 ? `+${d.stats.ind}` : `${d.stats.ind}` },
  { id: 'rank',      header: 'Rg',     cls: 'rank-cell', render: d => `${d.rank}` },
  { id: 'quest',     header: 'Quest',  cls: 'stat-cell', render: d => `${d.questPoints}` },
  { id: 'club',      header: 'Club',   cls: 'name-cell', render: d => d.fencer.club ?? '' },
  { id: 'nation',    header: 'Nation', cls: 'stat-cell', render: d => d.fencer.nationality ?? '' },
  { id: 'region',    header: 'Région', cls: 'name-cell', render: d => d.fencer.region ?? '' },
];

export function generatePoolHTML(pool: Pool, options: PoolExportOptions, template?: PdfTemplate): string {
  const runtimeTitle = `Poule ${pool.number}`;
  const effectiveTitle = template?.customTitle?.trim() || options.title || runtimeTitle;
  const { competitionName = '', weapon = '', category = '', logoBase64 } = options;
  const fencers = pool.fencers ?? [];
  const matches = pool.matches ?? [];
  const finishedCount = matches.filter(m => m.status === MatchStatus.FINISHED).length;
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const isLaserSabre = options.weapon === 'L';
  const activeCols = options.visibleColumns
    ? STAT_COLS.filter(c => options.visibleColumns!.includes(c.id) && (c.id !== 'quest' || isLaserSabre))
    : STAT_COLS.filter(c => c.id !== 'quest' || isLaserSabre);

  const rankings = fencers.map(f => ({
    fencer: f,
    stats: calculateFencerStats(f, matches),
    questPoints: calculateFencerQuestStats(f, matches).questPoints,
    rank: 0,
  }));
  rankings.sort((a, b) => {
    if (a.stats.ratio !== b.stats.ratio) return b.stats.ratio - a.stats.ratio;
    if (a.stats.ind !== b.stats.ind) return b.stats.ind - a.stats.ind;
    return b.stats.td - a.stats.td;
  });
  rankings.forEach((r, i) => { r.rank = i + 1; });
  const rankMap = new Map(rankings.map(r => [r.fencer.id, r]));

  const colHeaders = fencers.map((_, i) => `<th class="num-header">${i + 1}</th>`).join('');
  const rows = fencers.map((fencer, row) => {
    const data = rankMap.get(fencer.id)!;
    const cells = fencers.map((opponent, col) => {
      if (row === col) return '<td class="diagonal"></td>';
      const s = getScoreForCell(fencer, opponent, matches);
      if (!s) return '<td class="cell-pending"></td>';
      return `<td class="${s.isVictory ? 'cell-victory' : 'cell-defeat'}">${s.display}</td>`;
    }).join('');
    const statCells = activeCols.map(c => `<td class="${c.cls}">${c.render(data)}</td>`).join('');
    const sig = options.signatures?.[fencer.id];
    const sigCell = sig
      ? `<td class="sig-cell"><img src="${sig}" style="max-height:12mm;max-width:30mm;display:block;margin:auto;" /></td>`
      : `<td class="sig-cell"></td>`;
    return `
      <tr>
        <td class="num-cell">${row + 1}</td>
        <td class="name-cell">${fencer.lastName.toUpperCase()} ${fencer.firstName ?? ''}</td>
        ${cells}
        ${statCells}
        ${sigCell}
      </tr>`;
  }).join('');

  const pending = matches.filter(m => m.status !== MatchStatus.FINISHED);
  const pendingSection = pending.length === 0 ? '' : `
    <div class="section-label">Matchs à jouer (${pending.length})</div>
    <div class="match-grid">
      ${pending.map(m => {
        const idx = matches.indexOf(m) + 1;
        const rA = rankMap.get(m.fencerA?.id ?? '')?.rank ?? '?';
        const rB = rankMap.get(m.fencerB?.id ?? '')?.rank ?? '?';
        return `<div class="match-item match-pending">${idx}. (${rA}) ${m.fencerA?.lastName ?? '?'} — (${rB}) ${m.fencerB?.lastName ?? '?'}</div>`;
      }).join('')}
    </div>`;

  const finished = matches.filter(m => m.status === MatchStatus.FINISHED);
  const finishedSection = finished.length === 0 ? '' : `
    <div class="section-label" style="margin-top:4mm">Résultats (${finished.length})</div>
    <div class="match-grid match-grid-2col">
      ${finished.map(m => {
        const idx = matches.indexOf(m) + 1;
        const sA = m.scoreA?.isVictory ? `V${m.scoreA.value}` : `${m.scoreA?.value ?? 0}`;
        const sB = m.scoreB?.isVictory ? `V${m.scoreB.value}` : `${m.scoreB?.value ?? 0}`;
        return `<div class="match-item match-done">${idx}. ${m.fencerA?.lastName ?? '?'} <b>${sA}–${sB}</b> ${m.fencerB?.lastName ?? '?'}</div>`;
      }).join('')}
    </div>`;

  const weaponLabel = weapon ? `<span class="chip"><strong>Arme</strong> ${weapon}</span>` : '';
  const catLabel = category ? `<span class="chip"><strong>Catégorie</strong> ${category}</span>` : '';

  const sections: Record<string, string> = {
    'header': `
  <div class="doc-header">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${effectiveTitle}</h1>
      <div class="subtitle">Grille de poule • ${finishedCount}/${matches.length} matchs joués</div>
    </div>
    <div class="doc-header-badge">P${pool.number}</div>
  </div>`,
    'gold-bar': `  <div class="gold-bar"></div>`,
    'competition-name': competitionName ? `  <div class="competition-name-section">${competitionName}</div>` : '',
    'meta-chips': `
  <div class="meta-row">
    ${weaponLabel}${catLabel}
    <span class="chip"><strong>Tireurs</strong> ${fencers.length}</span>
    <span class="chip"><strong>Matchs</strong> ${finishedCount}/${matches.length}</span>
  </div>`,
    'score-grid': `
  <div class="section-label">Grille des scores</div>
  <table class="score-grid">
    <thead>
      <tr>
        <th class="num-header">#</th>
        <th class="name-header">Tireur</th>
        ${colHeaders}
        ${activeCols.map(c => `<th class="${c.cls === 'rank-cell' ? 'rank-header' : 'stat-header'}">${c.header}</th>`).join('')}
        <th class="sig-header">Signature</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`,
    'pending-matches': pendingSection,
    'finished-matches': finishedSection,
    'footer': `
  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>`,
  };

  const defaultOrder = ['header', 'gold-bar', 'competition-name', 'meta-chips', 'score-grid', 'pending-matches', 'finished-matches', 'footer'];
  const body = assembleBody(sections, template, defaultOrder);
  const cssOverrides = template ? buildCssOverrides(template) : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${effectiveTitle}</title>
  <style>
    ${cssOverrides}
    ${BASE_CSS}

    /* Grille scores */
    .score-grid {
      border-collapse: collapse;
      width: 100%;
      font-size: 8.5pt;
      margin-bottom: 5mm;
    }
    .score-grid thead tr th {
      background: var(--navy);
      color: var(--white);
      font-weight: 600;
      padding: 2mm 1.5mm;
      text-align: center;
      border: 1px solid var(--navy-light);
      font-size: 8pt;
    }
    .score-grid thead .name-header { text-align: left; padding-left: 3mm; min-width: 28mm; }
    .score-grid thead .num-header { min-width: 8mm; }
    .score-grid thead .stat-header { min-width: 10mm; background: #243858; }
    .score-grid thead .rank-header { min-width: 10mm; background: var(--gold); color: var(--navy); }
    .score-grid tbody tr:nth-child(odd)  td { background: var(--white); }
    .score-grid tbody tr:nth-child(even) td { background: var(--gray-xlight); }
    .score-grid tbody td {
      border: 1px solid var(--border);
      padding: 1.8mm 1.5mm;
      text-align: center;
      vertical-align: middle;
    }
    .score-grid .num-cell {
      font-weight: 700;
      color: var(--gold);
      background: var(--navy) !important;
      font-size: 8pt;
    }
    .score-grid .name-cell {
      text-align: left;
      padding-left: 3mm;
      font-weight: 600;
      white-space: nowrap;
      font-size: 9pt;
    }
    .score-grid .diagonal { background: var(--navy) !important; }
    .score-grid .cell-victory {
      background: var(--green-bg) !important;
      color: var(--green);
      font-weight: 700;
    }
    .score-grid .cell-defeat { color: var(--gray-dark); }
    .score-grid .cell-pending { background: var(--gold-bg) !important; }
    .score-grid .stat-cell {
      background: #f0f4f8 !important;
      font-weight: 500;
      font-size: 8.5pt;
    }
    .score-grid .rank-cell {
      background: var(--gold) !important;
      color: var(--navy);
      font-weight: 900;
      font-size: 10pt;
    }
    .score-grid .sig-cell {
      min-width: 32mm;
      border-left: 2px solid var(--border) !important;
      text-align: center;
      vertical-align: middle;
      padding: 1mm !important;
    }
    .score-grid thead .sig-header {
      min-width: 32mm;
      background: #1f3a5a;
      border-left: 2px solid var(--navy-light) !important;
    }

    /* Matchs */
    .match-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5mm 4mm;
      margin-bottom: 3mm;
    }
    .match-grid-2col { grid-template-columns: repeat(2, 1fr); }
    .match-item {
      font-size: 7.5pt;
      padding: 1mm 2.5mm;
      border-radius: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .match-pending { background: var(--gold-bg); color: #92400e; border-left: 2px solid var(--gold); }
    .match-done    { background: var(--green-bg); color: var(--green); border-left: 2px solid #4ade80; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Export Poule ─────────────────────────────────────────────────────────────

export async function exportPoolToPDF(pool: Pool, options: PoolExportOptions = {}, template?: PdfTemplate): Promise<void> {
  if (!pool.fencers || pool.fencers.length === 0) throw new Error('La poule ne contient aucun tireur');
  if (!pool.matches || pool.matches.length === 0) throw new Error('La poule ne contient aucun match');

  const title = options.title ?? `Poule ${pool.number}`;
  const html = generatePoolHTML(pool, { ...options, title }, template);
  await savePDF(html, `poule-${pool.number}.pdf`);
}

export async function exportMultiplePoolsToPDF(
  pools: Pool[],
  title: string = 'Export des Poules',
  logoBase64?: string,
  template?: PdfTemplate,
  competitionName?: string
): Promise<void> {
  if (pools.length === 0) throw new Error('Aucune poule à exporter');
  for (const pool of pools) {
    await exportPoolToPDF(pool, { title: `${title} - Poule ${pool.number}`, logoBase64, competitionName }, template);
  }
}

export const exportOptimizedPoolToPDF = exportPoolToPDF;

// ─── Export Tableau Élimination Directe ──────────────────────────────────────

export interface TableauMatchForPDF {
  id: string;
  round: number;
  position: number;
  fencerA: { firstName?: string; lastName: string; club?: string } | null;
  fencerB: { firstName?: string; lastName: string; club?: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: { id: string } | null;
  isBye: boolean;
  arena?: number | null;
}

export const MAX_MATCHES_PER_PAGE_TABLEAU = 5;

function getTableauRoundName(round: number): string {
  const names: Record<number, string> = {
    2: 'Finale',
    3: 'Petite finale',
    4: 'Demi-finales',
    8: 'Quarts de finale',
    16: 'Tableau de 16',
    32: 'Tableau de 32',
    64: 'Tableau de 64',
    128: 'Tableau de 128',
  };
  return names[round] ?? `Tableau de ${round}`;
}

export function generateTableauHTML(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string,
  logoBase64?: string,
  template?: PdfTemplate
): string {
  const real = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const renderMatchCard = (match: TableauMatchForPDF, num: number): string => {
    const roundName = getTableauRoundName(match.round);
    const nameA = `${match.fencerA!.lastName.toUpperCase()} ${match.fencerA!.firstName ?? ''}`.trim();
    const nameB = `${match.fencerB!.lastName.toUpperCase()} ${match.fencerB!.firstName ?? ''}`.trim();
    const clubA = match.fencerA!.club ?? '';
    const clubB = match.fencerB!.club ?? '';
    const pisteLabel = match.arena != null ? `Piste ${match.arena}` : 'Piste ___';
    return `
<div class="match-card">
  <div class="match-card-header">
    <span class="round-label">${roundName}</span>
    <span class="match-num">N° ${num}</span>
  </div>
  <table class="match-table">
    <colgroup>
      <col class="col-rank">
      <col class="col-name">
      <col class="col-score">
      <col class="col-sig">
    </colgroup>
    <thead>
      <tr>
        <th></th>
        <th style="text-align:left">Tireur</th>
        <th>Score</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
      <tr class="row-a">
        <td class="row-letter">A</td>
        <td class="fencer-name">${nameA}${clubA ? `<br><span class="fencer-club">${clubA}</span>` : ''}</td>
        <td class="score-box"></td>
        <td class="sig-box"></td>
      </tr>
      <tr class="row-b">
        <td class="row-letter">B</td>
        <td class="fencer-name">${nameB}${clubB ? `<br><span class="fencer-club">${clubB}</span>` : ''}</td>
        <td class="score-box"></td>
        <td class="sig-box"></td>
      </tr>
    </tbody>
  </table>
  <div class="match-card-footer">
    <span>${pisteLabel}</span>
    <span>Arbitre ________________________________</span>
    <span>Heure ___:___</span>
  </div>
</div>`;
  };

  const hasArenas = real.some(m => m.arena != null);

  type PageDef = { matches: TableauMatchForPDF[]; label?: string };
  const pages: PageDef[] = [];

  if (hasArenas) {
    // Sort by arena (asc), then round (desc), then position (asc)
    const sortedByArena = [...real].sort((a, b) => {
      const aArena = a.arena ?? Infinity;
      const bArena = b.arena ?? Infinity;
      if (aArena !== bArena) return aArena < bArena ? -1 : 1;
      if (b.round !== a.round) return b.round - a.round;
      return a.position - b.position;
    });

    // Group by arena
    const arenaMap = new Map<number | 0, TableauMatchForPDF[]>();
    for (const m of sortedByArena) {
      const key = m.arena ?? 0;
      if (!arenaMap.has(key)) arenaMap.set(key, []);
      arenaMap.get(key)!.push(m);
    }

    // Assigned arenas first (ascending), unassigned (key=0) last
    const keys = [...arenaMap.keys()].sort((a, b) => {
      if (a === 0) return 1;
      if (b === 0) return -1;
      return a - b;
    });

    for (const key of keys) {
      const group = arenaMap.get(key)!;
      const label = key > 0 ? `Piste ${key}` : 'Non assignés';
      for (let i = 0; i < group.length; i += matchesPerPage) {
        const chunk = group.slice(i, i + matchesPerPage);
        const chunkLabel = i === 0 ? label : `${label} (suite)`;
        pages.push({ matches: chunk, label: chunkLabel });
      }
    }
  } else {
    const sorted = [...real].sort((a, b) => b.round - a.round || a.position - b.position);
    for (let i = 0; i < sorted.length; i += matchesPerPage) {
      pages.push({ matches: sorted.slice(i, i + matchesPerPage) });
    }
  }

  const effectiveTitle = template?.customTitle?.trim() || title;
  const cssOverrides = template ? buildCssOverrides(template) : '';

  const pageHeaderHTML = `
  <div class="doc-header doc-header--compact">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${effectiveTitle}</h1>
      <div class="subtitle">Feuilles d'arbitrage — Élimination directe</div>
    </div>
    <div class="doc-header-badge">ED</div>
  </div>
  <div class="gold-bar"></div>`;

  let globalMatchNum = 0;
  const pagesHTML = pages.map((page, pageIdx) => {
    let lastRound: number | null = null;
    const cards = page.matches.map(match => {
      globalMatchNum++;
      const roundHeader = match.round !== lastRound
        ? `<div class="round-sub-header">${getTableauRoundName(match.round)}</div>`
        : '';
      lastRound = match.round;
      return roundHeader + renderMatchCard(match, globalMatchNum);
    }).join('');

    const sectionHeader = page.label
      ? `<div class="piste-section-header">${page.label} — ${page.matches.length} combat${page.matches.length !== 1 ? 's' : ''}</div>`
      : '';

    const isLast = pageIdx === pages.length - 1;
    return `<div class="page${isLast ? '' : ' page-break'}">${pageHeaderHTML}${sectionHeader}${cards}</div>`;
  }).join('');

  const sections: Record<string, string> = {
    'match-cards': `  ${pagesHTML}`,
    'footer': `
  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>`,
  };

  const defaultOrder = ['match-cards', 'footer'];
  const body = assembleBody(sections, template, defaultOrder);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${effectiveTitle}</title>
  <style>
    ${cssOverrides}
    ${BASE_CSS}
    @page { size: A4; margin: 12mm 10mm; }

    .page-break { page-break-after: always; }

    .doc-header--compact {
      padding: 2.5mm 4mm;
    }
    .doc-header--compact .doc-header-left h1 {
      font-size: 11pt;
    }
    .doc-header--compact .doc-header-badge {
      font-size: 9pt;
      min-width: 10mm;
      height: 10mm;
    }
    .doc-header--compact .doc-header-logo {
      max-height: 7mm;
    }
    .doc-header--compact .subtitle {
      font-size: 7.5pt;
      margin-top: 0.8mm;
    }

    .piste-section-header {
      background: var(--navy);
      color: var(--gold-light);
      font-weight: 700;
      font-size: 12pt;
      letter-spacing: 0.5px;
      padding: 2mm 4mm;
      border-radius: 4px;
      margin-bottom: 4mm;
    }

    .round-sub-header {
      color: var(--navy);
      font-weight: 600;
      font-size: 9pt;
      letter-spacing: 0.3px;
      padding: 1mm 3mm;
      margin-top: 3mm;
      margin-bottom: 2mm;
      border-left: 3px solid var(--gold);
    }

    .match-card {
      border: 2px solid var(--navy);
      border-radius: 5px;
      margin-bottom: 5mm;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .match-card-header {
      background: var(--navy);
      color: var(--white);
      padding: 2.5mm 4mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .round-label {
      font-weight: 700;
      font-size: 11pt;
      letter-spacing: 0.3px;
    }
    .match-num {
      font-size: 8.5pt;
      color: var(--gold-light);
      font-weight: 600;
    }
    .match-table {
      width: 100%;
      border-collapse: collapse;
    }
    col.col-rank  { width: 8mm; }
    col.col-name  { width: auto; }
    col.col-score { width: 18mm; }
    col.col-sig   { width: 38mm; }
    .match-table thead th {
      background: var(--gray-xlight);
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 1.5mm 3mm;
      border-bottom: 1px solid var(--border);
      color: var(--gray-dark);
      text-align: center;
    }
    .match-table tbody tr { border-bottom: 1px solid var(--gray-light); }
    .match-table tbody tr:last-child { border-bottom: none; }
    .row-a { background: #f0f7ff; }
    .row-b { background: var(--white); }
    .row-letter {
      text-align: center;
      font-weight: 900;
      font-size: 10pt;
      color: var(--gray-mid);
      padding: 3mm 2mm;
    }
    .row-a .row-letter { color: var(--navy); }
    .fencer-name {
      padding: 3.5mm 3mm;
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: 0.2px;
      vertical-align: middle;
    }
    .fencer-club {
      font-size: 8pt;
      font-weight: 400;
      color: var(--gray-dark);
    }
    .score-box {
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      height: 16mm;
      vertical-align: middle;
      text-align: center;
    }
    .sig-box { height: 16mm; vertical-align: middle; }
    .match-card-footer {
      background: var(--gray-xlight);
      border-top: 1px solid var(--border);
      padding: 1.5mm 4mm;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: var(--gray-dark);
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportTableauToPDF(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string = 'Tableau Élimination Directe',
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  const real = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  if (real.length === 0) {
    throw new Error('Aucun match à exporter (tous sont des exempts ou sans tireurs assignés)');
  }

  const html = generateTableauHTML(matches, matchesPerPage, title, logoBase64, template);
  await savePDF(html, `tableau-elimination.pdf`);
}

export async function printTableauHTML(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string = 'Tableau Élimination Directe',
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  const real = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  if (real.length === 0) {
    throw new Error('Aucun match à imprimer (tous sont des exempts ou sans tireurs assignés)');
  }
  const html = generateTableauHTML(matches, matchesPerPage, title, logoBase64, template);
  const api = (window as any).electronAPI;
  if (!api?.file?.printHtml) {
    throw new Error('API Electron non disponible');
  }
  const res = await api.file.printHtml(html);
  if (!res?.success) {
    throw new Error(res?.error ?? "Échec de l'impression");
  }
}

// ─── Export Arbre (Bracket Tree) ─────────────────────────────────────────────

export function generateBracketTreeHTML(
  matches: TableauMatchForPDF[],
  title: string,
  logoBase64?: string,
  template?: PdfTemplate
): string {
  // ── Layout constants ────────────────────────────────────────────────────────
  const MATCH_W  = 175;
  const H_GAP    = 55;
  const SCORE_W  = 26;
  const HEADER_H = 60;
  const GOLD_H   = 4;
  const LABEL_H  = 24;
  const TOP_MARGIN = HEADER_H + GOLD_H + LABEL_H;
  const BOT_MARGIN = 20;
  const MARGIN_L   = 16;
  const SVG_H      = 750;

  // ── Separate petite-finale from main bracket ────────────────────────────────
  const petiteFinale = matches.find(m => m.round === 3);
  const mainMatches  = matches.filter(m => m.round !== 3 && m.round >= 2);

  if (mainMatches.length === 0) {
    throw new Error('Aucun match dans le tableau principal');
  }

  const tableauSize = Math.max(...mainMatches.map(m => m.round));
  const numRounds   = Math.round(Math.log2(tableauSize));

  // ── Vertical slot height (adapts to bracket size) ──────────────────────────
  const firstRoundCount = tableauSize / 2;
  const USABLE_H = SVG_H - TOP_MARGIN - BOT_MARGIN;
  const SLOT_H   = USABLE_H / firstRoundCount;
  const ROW_H    = Math.max(14, Math.min(26, Math.floor(SLOT_H * 0.44)));
  const MATCH_H  = ROW_H * 2;

  // ── SVG viewBox width ───────────────────────────────────────────────────────
  const naturalW = MARGIN_L + numRounds * MATCH_W + (numRounds - 1) * H_GAP + MARGIN_L;
  const VBW      = Math.max(900, naturalW);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  const colX = (r: number): number => {
    const colIndex = Math.round(Math.log2(tableauSize / r));
    return MARGIN_L + colIndex * (MATCH_W + H_GAP);
  };

  const matchCenterY = (r: number, p: number): number =>
    TOP_MARGIN + (p + 0.5) * (tableauSize / r) * SLOT_H;

  const matchTopY = (r: number, p: number): number =>
    matchCenterY(r, p) - MATCH_H / 2;

  // ── Colour helpers (resolve from template, fallback to defaults) ────────────
  const navy  = template?.colors.navy  ?? '#1a2e4a';
  const gold  = template?.colors.gold  ?? '#c9a227';
  const green = template?.colors.green ?? '#166534';
  const now   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── SVG: header ─────────────────────────────────────────────────────────────
  const svgHeader = `
  <rect x="0" y="0" width="${VBW}" height="${HEADER_H}" fill="${navy}"/>
  ${logoBase64 ? `<image href="${logoBase64}" x="10" y="8" width="44" height="44" preserveAspectRatio="xMinYMid meet"/>` : ''}
  <text x="${logoBase64 ? 62 : VBW / 2}" y="33"
        font-family="'Segoe UI',Arial,sans-serif" font-size="16" font-weight="700" fill="white"
        ${logoBase64 ? '' : 'text-anchor="middle"'}>${title}</text>
  <text x="${logoBase64 ? 62 : VBW / 2}" y="52"
        font-family="'Segoe UI',Arial,sans-serif" font-size="9" fill="#f5e6a3"
        ${logoBase64 ? '' : 'text-anchor="middle"'}>Tableau d'élimination directe — ${now}</text>
  <text x="${VBW - 14}" y="40" font-family="'Segoe UI',Arial,sans-serif"
        font-size="22" font-weight="900" fill="${gold}" text-anchor="end">ED</text>`;

  // ── SVG: gold bar ───────────────────────────────────────────────────────────
  const svgGoldBar = `
  <rect x="0" y="${HEADER_H}" width="${VBW}" height="${GOLD_H}" fill="${gold}"/>`;

  // ── SVG: round labels ───────────────────────────────────────────────────────
  const roundNums = [...new Set(mainMatches.map(m => m.round))].sort((a, b) => b - a);
  const labelY    = TOP_MARGIN - 6;
  const roundLabels = roundNums.map(r => {
    const cx = colX(r) + MATCH_W / 2;
    return `<text x="${cx}" y="${labelY}" font-family="'Segoe UI',Arial,sans-serif"
        font-size="9" font-weight="600" fill="${navy}" text-anchor="middle">${getTableauRoundName(r)}</text>`;
  }).join('\n  ');

  const petiteFinaleLabel = petiteFinale ? `
  <text x="${colX(2) + MATCH_W / 2}" y="${SVG_H - BOT_MARGIN - MATCH_H - 8}"
        font-family="'Segoe UI',Arial,sans-serif"
        font-size="8" font-weight="600" fill="${navy}" text-anchor="middle">Petite finale</text>` : '';

  // ── SVG: connection lines ───────────────────────────────────────────────────
  const connectors = mainMatches
    .filter(m => m.round > 2)
    .map(m => {
      const { round: r, position: p } = m;
      const x   = colX(r);
      const cy  = matchCenterY(r, p);
      const midX = x + MATCH_W + H_GAP / 2;
      const parentX = colX(r / 2);

      const stubH = `<line x1="${x + MATCH_W}" y1="${cy}" x2="${midX}" y2="${cy}" stroke="#94a3b8" stroke-width="1.5"/>`;

      if (p % 2 !== 0) return stubH;

      const sibCy    = matchCenterY(r, p + 1);
      const parentY  = (cy + sibCy) / 2;
      return `${stubH}
    <line x1="${midX}" y1="${cy}" x2="${midX}" y2="${sibCy}" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="${midX}" y1="${parentY}" x2="${parentX}" y2="${parentY}" stroke="#94a3b8" stroke-width="1.5"/>`;
    }).join('\n  ');

  // ── SVG: match box renderer ─────────────────────────────────────────────────
  const renderMatchBox = (match: TableauMatchForPDF, x: number, yTop: number): string => {
    const { fencerA, fencerB, scoreA, scoreB, winner, isBye } = match;
    const fa_id = (fencerA as any)?.id as string | undefined;
    const fb_id = (fencerB as any)?.id as string | undefined;
    const wid   = winner?.id;
    const winA  = !!(wid && fa_id && wid === fa_id);
    const winB  = !!(wid && fb_id && wid === fb_id);

    const nameW   = MATCH_W - SCORE_W;
    const fs      = Math.max(7, Math.min(9, Math.floor(ROW_H * 0.42)));
    const clubFs  = Math.max(6, fs - 2);
    const scoreFs = Math.max(8, Math.min(11, Math.floor(ROW_H * 0.5)));
    const showClub = ROW_H >= 20;

    if (isBye) {
      const byeName = fencerA
        ? truncate(`${fencerA.lastName.toUpperCase()} ${fencerA.firstName?.charAt(0) ?? ''}.`, 22)
        : fencerB
        ? truncate(`${fencerB.lastName.toUpperCase()} ${fencerB.firstName?.charAt(0) ?? ''}.`, 22)
        : '';
      return `<g>
        <rect x="${x}" y="${yTop}" width="${MATCH_W}" height="${MATCH_H}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" rx="2"/>
        ${byeName ? `<text x="${x + MATCH_W / 2}" y="${yTop + MATCH_H / 2 - 3}"
              text-anchor="middle" dominant-baseline="auto"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${fs}" fill="#475569" font-weight="600">${byeName}</text>` : ''}
        <text x="${x + MATCH_W / 2}" y="${yTop + MATCH_H / 2 + fs + 2}"
              text-anchor="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${clubFs}" fill="#94a3b8" font-style="italic">Exempté</text>
      </g>`;
    }

    const mkRow = (
      fencer: TableauMatchForPDF['fencerA'],
      score: number | null,
      isWinner: boolean,
      rowY: number
    ): string => {
      const name = fencer
        ? truncate(`${fencer.lastName.toUpperCase()} ${fencer.firstName?.charAt(0) ?? ''}.`, 22)
        : 'TBD';
      const club = showClub && fencer?.club ? truncate(fencer.club, 20) : '';
      const bg   = isWinner ? '#dcfce7' : fencer ? (rowY === yTop ? '#f0f7ff' : '#ffffff') : '#f8fafc';
      const tc   = isWinner ? green : '#1e293b';
      const fw   = isWinner ? '700' : '500';
      const nameY = rowY + (club ? ROW_H * 0.38 : ROW_H * 0.5);
      const clubY = rowY + ROW_H * 0.75;

      return `<rect x="${x}" y="${rowY}" width="${nameW}" height="${ROW_H}" fill="${bg}"/>
        <rect x="${x + nameW}" y="${rowY}" width="${SCORE_W}" height="${ROW_H}" fill="${bg}"/>
        <text x="${x + 4}" y="${nameY}" dominant-baseline="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${fs}" font-weight="${fw}" fill="${tc}">${name}</text>
        ${club ? `<text x="${x + 4}" y="${clubY}" dominant-baseline="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${clubFs}" fill="#94a3b8">${club}</text>` : ''}
        <text x="${x + nameW + SCORE_W / 2}" y="${rowY + ROW_H / 2}" text-anchor="middle" dominant-baseline="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${scoreFs}" font-weight="700" fill="${tc}">${score !== null ? score : ''}</text>`;
    };

    return `<g>
      <rect x="${x}" y="${yTop}" width="${MATCH_W}" height="${MATCH_H}" fill="white" stroke="#e2e8f0" stroke-width="0.75" rx="2"/>
      ${mkRow(fencerA, scoreA, winA, yTop)}
      <line x1="${x}" y1="${yTop + ROW_H}" x2="${x + MATCH_W}" y2="${yTop + ROW_H}" stroke="#e2e8f0" stroke-width="0.75"/>
      <line x1="${x + nameW}" y1="${yTop}" x2="${x + nameW}" y2="${yTop + MATCH_H}" stroke="#e2e8f0" stroke-width="0.75"/>
      ${mkRow(fencerB, scoreB, winB, yTop + ROW_H)}
      <rect x="${x}" y="${yTop}" width="${MATCH_W}" height="${MATCH_H}" fill="none" stroke="#94a3b8" stroke-width="1" rx="2"/>
    </g>`;
  };

  // ── SVG: all match boxes ────────────────────────────────────────────────────
  const matchBoxes = [
    ...mainMatches.map(m => renderMatchBox(m, colX(m.round), matchTopY(m.round, m.position))),
    ...(petiteFinale ? [renderMatchBox(petiteFinale, colX(2), SVG_H - BOT_MARGIN - MATCH_H)] : []),
  ].join('\n  ');

  // ── SVG: footer ─────────────────────────────────────────────────────────────
  const svgFooter = `
  <line x1="${MARGIN_L}" y1="${SVG_H - 10}" x2="${VBW - MARGIN_L}" y2="${SVG_H - 10}" stroke="#e2e8f0" stroke-width="0.75"/>
  <text x="${MARGIN_L}" y="${SVG_H - 3}" font-family="'Segoe UI',Arial,sans-serif" font-size="7" fill="#94a3b8">BellePoule Modern</text>
  <text x="${VBW - MARGIN_L}" y="${SVG_H - 3}" font-family="'Segoe UI',Arial,sans-serif" font-size="7" fill="#94a3b8" text-anchor="end">${now}</text>`;

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const cssOverrides = template ? buildCssOverrides(template) : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${cssOverrides}
    @page { size: A4 landscape; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 297mm; height: 210mm; overflow: hidden; }
    svg { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${VBW} ${SVG_H}"
     preserveAspectRatio="xMinYMid meet">
  ${svgHeader}
  ${svgGoldBar}
  ${roundLabels}
  ${petiteFinaleLabel}
  <g id="connectors">${connectors}</g>
  <g id="matches">${matchBoxes}</g>
  ${svgFooter}
</svg>
</body>
</html>`;
}

// ─── Export Arbre Multi-Pages (poster mural) ─────────────────────────────────

export function generateBracketTreeMultiPageHTML(
  matches: TableauMatchForPDF[],
  title: string,
  logoBase64?: string,
  template?: PdfTemplate
): string {
  // ── Layout constants (wall-poster scale ≈ 2× single-page) ──────────────────
  const MATCH_W    = 260;
  const H_GAP      = 80;
  const SCORE_W    = 40;
  const HEADER_H   = 50;
  const GOLD_H     = 4;
  const LABEL_H    = 22;
  const TOP_MARGIN = HEADER_H + GOLD_H + LABEL_H;
  const BOT_MARGIN = 24;
  const MARGIN_L   = 20;

  // ── Separate petite-finale from main bracket ────────────────────────────────
  const petiteFinale = matches.find(m => m.round === 3);
  const mainMatches  = matches.filter(m => m.round !== 3 && m.round >= 2);

  if (mainMatches.length === 0) throw new Error('Aucun match dans le tableau principal');

  const tableauSize = Math.max(...mainMatches.map(m => m.round));
  const numRounds   = Math.round(Math.log2(tableauSize));

  // ── Page tiling: A4 landscape minus 11mm CSS strip → 297mm × 199mm usable ──
  const A4_RATIO    = 297 / 199;
  const cols: 1 | 2 = tableauSize >= 64 ? 2 : 1;
  const rows        = 2;
  const totalPages  = cols * rows;

  const naturalW = MARGIN_L + numRounds * MATCH_W + (numRounds - 1) * H_GAP + MARGIN_L;
  const VBW      = Math.max(1200, naturalW);
  const qW       = VBW / cols;
  const qH       = Math.round(qW / A4_RATIO);
  const SVG_H    = qH * rows;

  // ── Vertical slot height ─────────────────────────────────────────────────────
  const firstRoundCount = tableauSize / 2;
  const USABLE_H = SVG_H - TOP_MARGIN - BOT_MARGIN;
  const SLOT_H   = USABLE_H / firstRoundCount;
  const ROW_H    = Math.max(10, Math.min(32, Math.floor(SLOT_H * 0.45)));
  const MATCH_H  = ROW_H * 2;

  // Snap page split to nearest inter-match gap to avoid cutting through match boxes
  const splitIdx    = Math.round((qH - TOP_MARGIN) / SLOT_H - 0.5);
  const nearMatchCY = TOP_MARGIN + (splitIdx + 0.5) * SLOT_H;
  const cutY        = Math.abs(qH - nearMatchCY) < MATCH_H / 2
    ? Math.round(
        Math.abs(TOP_MARGIN + splitIdx * SLOT_H - qH) <=
        Math.abs(TOP_MARGIN + (splitIdx + 1) * SLOT_H - qH)
          ? TOP_MARGIN + splitIdx * SLOT_H
          : TOP_MARGIN + (splitIdx + 1) * SLOT_H
      )
    : qH;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  const colX = (r: number): number =>
    MARGIN_L + Math.round(Math.log2(tableauSize / r)) * (MATCH_W + H_GAP);

  const matchCenterY = (r: number, p: number): number =>
    TOP_MARGIN + (p + 0.5) * (tableauSize / r) * SLOT_H;

  const matchTopY = (r: number, p: number): number =>
    matchCenterY(r, p) - MATCH_H / 2;

  // ── Colours ──────────────────────────────────────────────────────────────────
  const navy  = template?.colors.navy  ?? '#1a2e4a';
  const gold  = template?.colors.gold  ?? '#c9a227';
  const green = template?.colors.green ?? '#166534';
  const now   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── SVG: header (visible on top-row pages via viewBox) ───────────────────────
  const svgHeader = `
  <rect x="0" y="0" width="${VBW}" height="${HEADER_H}" fill="${navy}"/>
  ${logoBase64 ? `<image href="${logoBase64}" x="12" y="6" width="38" height="38" preserveAspectRatio="xMinYMid meet"/>` : ''}
  <text x="${logoBase64 ? 56 : VBW / 2}" y="28"
        font-family="'Segoe UI',Arial,sans-serif" font-size="18" font-weight="700" fill="white"
        ${logoBase64 ? '' : 'text-anchor="middle"'}>${title}</text>
  <text x="${logoBase64 ? 56 : VBW / 2}" y="43"
        font-family="'Segoe UI',Arial,sans-serif" font-size="10" fill="#f5e6a3"
        ${logoBase64 ? '' : 'text-anchor="middle"'}>Tableau d'élimination directe — ${now}</text>
  <text x="${VBW - 16}" y="38" font-family="'Segoe UI',Arial,sans-serif"
        font-size="26" font-weight="900" fill="${gold}" text-anchor="end">ED</text>`;

  const svgGoldBar = `
  <rect x="0" y="${HEADER_H}" width="${VBW}" height="${GOLD_H}" fill="${gold}"/>`;

  // ── SVG: round labels at top and midpoint (both page-rows get labels) ────────
  const roundNums = [...new Set(mainMatches.map(m => m.round))].sort((a, b) => b - a);
  const mkRoundLabels = (baseY: number) => roundNums.map(r => {
    const cx = colX(r) + MATCH_W / 2;
    return `<text x="${cx}" y="${baseY}" font-family="'Segoe UI',Arial,sans-serif"
        font-size="11" font-weight="600" fill="${navy}" text-anchor="middle">${getTableauRoundName(r)}</text>`;
  }).join('\n  ');

  const roundLabels = mkRoundLabels(TOP_MARGIN - 7)
    + '\n  ' + mkRoundLabels(cutY + LABEL_H - 5);

  const petiteFinaleLabel = petiteFinale ? `
  <text x="${colX(2) + MATCH_W / 2}" y="${SVG_H - BOT_MARGIN - MATCH_H - 10}"
        font-family="'Segoe UI',Arial,sans-serif"
        font-size="10" font-weight="600" fill="${navy}" text-anchor="middle">Petite finale</text>` : '';

  // ── SVG: connection lines ─────────────────────────────────────────────────────
  const connectors = mainMatches
    .filter(m => m.round > 2)
    .map(m => {
      const { round: r, position: p } = m;
      const x    = colX(r);
      const cy   = matchCenterY(r, p);
      const midX = x + MATCH_W + H_GAP / 2;
      const parentX = colX(r / 2);
      const stubH = `<line x1="${x + MATCH_W}" y1="${cy}" x2="${midX}" y2="${cy}" stroke="#94a3b8" stroke-width="2"/>`;
      if (p % 2 !== 0) return stubH;
      const sibCy   = matchCenterY(r, p + 1);
      const parentY = (cy + sibCy) / 2;
      return `${stubH}
    <line x1="${midX}" y1="${cy}" x2="${midX}" y2="${sibCy}" stroke="#94a3b8" stroke-width="2"/>
    <line x1="${midX}" y1="${parentY}" x2="${parentX}" y2="${parentY}" stroke="#94a3b8" stroke-width="2"/>`;
    }).join('\n  ');

  // ── SVG: match box renderer ───────────────────────────────────────────────────
  const renderMatchBox = (match: TableauMatchForPDF, x: number, yTop: number): string => {
    const { fencerA, fencerB, scoreA, scoreB, winner, isBye } = match;
    const fa_id = (fencerA as any)?.id as string | undefined;
    const fb_id = (fencerB as any)?.id as string | undefined;
    const wid   = winner?.id;
    const winA  = !!(wid && fa_id && wid === fa_id);
    const winB  = !!(wid && fb_id && wid === fb_id);
    const nameW   = MATCH_W - SCORE_W;
    const fs      = Math.max(9, Math.min(13, Math.floor(ROW_H * 0.42)));
    const clubFs  = Math.max(8, fs - 2);
    const scoreFs = Math.max(10, Math.min(15, Math.floor(ROW_H * 0.5)));

    if (isBye) {
      const byeName = fencerA
        ? truncate(`${fencerA.lastName.toUpperCase()} ${fencerA.firstName?.charAt(0) ?? ''}.`, 24)
        : fencerB
        ? truncate(`${fencerB.lastName.toUpperCase()} ${fencerB.firstName?.charAt(0) ?? ''}.`, 24)
        : '';
      return `<g>
        <rect x="${x}" y="${yTop}" width="${MATCH_W}" height="${MATCH_H}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" rx="3"/>
        ${byeName ? `<text x="${x + MATCH_W / 2}" y="${yTop + MATCH_H / 2 - 3}"
              text-anchor="middle" dominant-baseline="auto"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${fs}" fill="#475569" font-weight="600">${byeName}</text>` : ''}
        <text x="${x + MATCH_W / 2}" y="${yTop + MATCH_H / 2 + fs + 3}"
              text-anchor="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${clubFs}" fill="#94a3b8" font-style="italic">Exempté</text>
      </g>`;
    }

    const mkRow = (
      fencer: TableauMatchForPDF['fencerA'],
      score: number | null,
      isWinner: boolean,
      rowY: number
    ): string => {
      const name = fencer
        ? truncate(`${fencer.lastName.toUpperCase()} ${fencer.firstName?.charAt(0) ?? ''}.`, 24)
        : 'TBD';
      const club = fencer?.club ? truncate(fencer.club, 22) : '';
      const bg   = isWinner ? '#dcfce7' : fencer ? (rowY === yTop ? '#f0f7ff' : '#ffffff') : '#f8fafc';
      const tc   = isWinner ? green : '#1e293b';
      const fw   = isWinner ? '700' : '500';
      const nameY = rowY + (club ? ROW_H * 0.38 : ROW_H * 0.5);
      const clubY = rowY + ROW_H * 0.75;
      return `<rect x="${x}" y="${rowY}" width="${nameW}" height="${ROW_H}" fill="${bg}"/>
        <rect x="${x + nameW}" y="${rowY}" width="${SCORE_W}" height="${ROW_H}" fill="${bg}"/>
        <text x="${x + 5}" y="${nameY}" dominant-baseline="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${fs}" font-weight="${fw}" fill="${tc}">${name}</text>
        ${club ? `<text x="${x + 5}" y="${clubY}" dominant-baseline="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${clubFs}" fill="#94a3b8">${club}</text>` : ''}
        <text x="${x + nameW + SCORE_W / 2}" y="${rowY + ROW_H / 2}" text-anchor="middle" dominant-baseline="middle"
              font-family="'Segoe UI',Arial,sans-serif" font-size="${scoreFs}" font-weight="700" fill="${tc}">${score !== null ? score : ''}</text>`;
    };

    return `<g>
      <rect x="${x}" y="${yTop}" width="${MATCH_W}" height="${MATCH_H}" fill="white" stroke="#e2e8f0" stroke-width="1" rx="3"/>
      ${mkRow(fencerA, scoreA, winA, yTop)}
      <line x1="${x}" y1="${yTop + ROW_H}" x2="${x + MATCH_W}" y2="${yTop + ROW_H}" stroke="#e2e8f0" stroke-width="1"/>
      <line x1="${x + nameW}" y1="${yTop}" x2="${x + nameW}" y2="${yTop + MATCH_H}" stroke="#e2e8f0" stroke-width="1"/>
      ${mkRow(fencerB, scoreB, winB, yTop + ROW_H)}
      <rect x="${x}" y="${yTop}" width="${MATCH_W}" height="${MATCH_H}" fill="none" stroke="#94a3b8" stroke-width="1.5" rx="3"/>
    </g>`;
  };

  // ── SVG: all match boxes ──────────────────────────────────────────────────────
  const matchBoxes = [
    ...mainMatches.map(m => renderMatchBox(m, colX(m.round), matchTopY(m.round, m.position))),
    ...(petiteFinale ? [renderMatchBox(petiteFinale, colX(2), SVG_H - BOT_MARGIN - MATCH_H)] : []),
  ].join('\n  ');

  // ── SVG: footer ───────────────────────────────────────────────────────────────
  const svgFooter = `
  <line x1="${MARGIN_L}" y1="${SVG_H - 12}" x2="${VBW - MARGIN_L}" y2="${SVG_H - 12}" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${MARGIN_L}" y="${SVG_H - 4}" font-family="'Segoe UI',Arial,sans-serif" font-size="9" fill="#94a3b8">BellePoule Modern</text>
  <text x="${VBW - MARGIN_L}" y="${SVG_H - 4}" font-family="'Segoe UI',Arial,sans-serif" font-size="9" fill="#94a3b8" text-anchor="end">${now}</text>`;

  // ── Full SVG content (embedded identically in each page) ─────────────────────
  const svgContent = `${svgHeader}
  ${svgGoldBar}
  ${roundLabels}
  ${petiteFinaleLabel}
  <g>${connectors}</g>
  <g>${matchBoxes}</g>
  ${svgFooter}`;

  // ── Assemble pages ────────────────────────────────────────────────────────────
  const cssOverrides = template ? buildCssOverrides(template) : '';

  const pagesHtml = Array.from({ length: totalPages }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const num = i + 1;
    const vDesc = row === 0 ? 'Haut' : 'Bas';
    const hDesc = cols === 2 ? (col === 0 ? 'Gauche' : 'Droite') : '';
    const desc  = [vDesc, hDesc].filter(Boolean).join(' ');
    const adj: string[] = [];
    if (row > 0)        adj.push(`↑ p.${(row - 1) * cols + col + 1}`);
    if (col > 0)        adj.push(`← p.${row * cols + col}`);
    if (col < cols - 1) adj.push(`→ p.${row * cols + col + 2}`);
    if (row < rows - 1) adj.push(`↓ p.${(row + 1) * cols + col + 1}`);

    const isFirst = i === 0;
    return `
<div class="page${i === totalPages - 1 ? ' last' : ''}">
  <div class="strip${isFirst ? '' : ' strip--mini'}" style="background:${navy};">
    ${isFirst
      ? `<span class="strip-title">${title}</span>
    <span class="strip-sep">·</span>
    <span class="strip-page">${num}/${totalPages}&nbsp;·&nbsp;${desc}</span>
    ${adj.length ? `<span class="strip-sep">·</span><span class="strip-adj">${adj.join('&nbsp;')}</span>` : ''}`
      : `<span class="strip-page strip-page--mini">${num}/${totalPages}&nbsp;·&nbsp;${desc}${adj.length ? '&nbsp;·&nbsp;' + adj.join('&nbsp;') : ''}</span>`
    }
  </div>
  <div class="bracket-view">
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="${col * qW} ${row === 0 ? 0 : cutY} ${qW} ${row === 0 ? cutY : SVG_H - cutY}"
         preserveAspectRatio="xMinYMin meet">
      ${svgContent}
    </svg>
  </div>
</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${cssOverrides}
    @page { size: A4 landscape; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: white; }
    .page {
      width: 297mm;
      height: 210mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      overflow: hidden;
    }
    .page.last { page-break-after: auto; }
    .strip {
      flex: 0 0 11mm;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
    }
    .strip-title { font-family: 'Segoe UI',Arial,sans-serif; font-size: 11pt; font-weight: 700; color: white; }
    .strip-page  { font-family: 'Segoe UI',Arial,sans-serif; font-size: 9pt; color: #f5e6a3; }
    .strip-sep   { font-family: 'Segoe UI',Arial,sans-serif; font-size: 9pt; color: #7a9bbf; }
    .strip-adj   { font-family: 'Segoe UI',Arial,sans-serif; font-size: 8pt; color: #a8c4d8; }
    .strip--mini { flex: 0 0 4mm; padding: 0 6px; }
    .strip-page--mini { font-family: 'Segoe UI',Arial,sans-serif; font-size: 6pt; color: #a8c4d8; }
    .bracket-view { flex: 1; overflow: hidden; }
    .bracket-view svg { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

export async function exportBracketTreeToPDF(
  matches: TableauMatchForPDF[],
  title: string = 'Arbre — Élimination Directe',
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  const tableauSize = Math.max(
    ...matches.filter(m => m.round !== 3 && m.round >= 2).map(m => m.round)
  );
  const html = tableauSize >= 32
    ? generateBracketTreeMultiPageHTML(matches, title, logoBase64, template)
    : generateBracketTreeHTML(matches, title, logoBase64, template);
  await savePDF(html, 'arbre-elimination.pdf');
}

export async function printBracketTreeHTML(
  matches: TableauMatchForPDF[],
  title: string = 'Arbre — Élimination Directe',
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  const tableauSize = Math.max(
    ...matches.filter(m => m.round !== 3 && m.round >= 2).map(m => m.round)
  );
  const html = tableauSize >= 32
    ? generateBracketTreeMultiPageHTML(matches, title, logoBase64, template)
    : generateBracketTreeHTML(matches, title, logoBase64, template);
  const api = (window as any).electronAPI;
  if (!api?.file?.printHtml) throw new Error('API Electron non disponible');
  const res = await api.file.printHtml(html);
  if (!res?.success) throw new Error(res?.error ?? "Échec de l'impression");
}

// ─── Export Classement Général ───────────────────────────────────────────────

export function generateRankingHTML(
  ranking: PoolRanking[],
  title: string,
  isLaserSabre: boolean,
  visibleColumns: string[],
  logoBase64?: string,
  template?: PdfTemplate
): string {
  const vis = (col: string) => visibleColumns.includes(col);
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const rows = ranking.map(r => {
    const ratio = r.matchesPlayed > 0 ? (r.victories / r.matchesPlayed).toFixed(2) : '0.00';
    const idx = r.index >= 0 ? `+${r.index}` : `${r.index}`;
    const abandoned = (r.fencer as any).status === 'ABANDONED'
      ? ' <span style="color:#ef4444;font-size:8pt">(A)</span>' : '';
    return `
<tr>
  ${vis('rank') ? `<td style="text-align:center;font-weight:700;color:var(--navy)">${r.rank}</td>` : ''}
  ${vis('lastName') ? `<td style="font-weight:600">${r.fencer.lastName.toUpperCase()}${abandoned}</td>` : ''}
  ${vis('firstName') ? `<td>${r.fencer.firstName ?? ''}</td>` : ''}
  ${vis('club') ? `<td style="color:var(--gray-dark)">${r.fencer.club ?? ''}</td>` : ''}
  ${vis('victories') ? `<td style="text-align:center">${r.victories}</td>` : ''}
  ${vis('ratio') ? `<td style="text-align:center">${r.matchesPlayed > 0 ? ratio : '-'}</td>` : ''}
  ${vis('td') ? `<td style="text-align:center">${r.touchesScored}</td>` : ''}
  ${vis('tr') ? `<td style="text-align:center">${r.touchesReceived}</td>` : ''}
  ${vis('quest') && isLaserSabre ? `<td style="text-align:center;color:#7c3aed;font-weight:600">${r.questPoints ?? 0}</td>` : ''}
  ${vis('index') ? `<td style="text-align:center;font-weight:600;color:${r.index >= 0 ? 'var(--green)' : '#dc2626'}">${idx}</td>` : ''}
</tr>`;
  }).join('');

  const th = (col: string, label: string, style = '') =>
    vis(col) ? `<th style="${style}">${label}</th>` : '';

  const headers = [
    th('rank', 'Rg', 'width:10mm'),
    th('lastName', 'Nom', 'text-align:left'),
    th('firstName', 'Prénom', 'text-align:left'),
    th('club', 'Club', 'text-align:left'),
    th('victories', 'V'),
    th('ratio', 'V/M'),
    th('td', 'TD'),
    th('tr', 'TR'),
    vis('quest') && isLaserSabre ? '<th style="color:var(--white)">Quest</th>' : '',
    th('index', 'Indice'),
  ].join('');

  const effectiveTitle = template?.customTitle?.trim() || title;
  const cssOverrides = template ? buildCssOverrides(template) : '';

  const sections: Record<string, string> = {
    'header': `
  <div class="doc-header">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${effectiveTitle}</h1>
      <div class="subtitle">Classement général — ${ranking.length} tireur${ranking.length > 1 ? 's' : ''}</div>
    </div>
    <div class="doc-header-badge" style="font-size:11pt">RG</div>
  </div>`,
    'gold-bar': `  <div class="gold-bar"></div>`,
    'ranking-table': `
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`,
    'footer': `
  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>`,
  };

  const defaultOrder = ['header', 'gold-bar', 'ranking-table', 'footer'];
  const body = assembleBody(sections, template, defaultOrder);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${effectiveTitle}</title>
  <style>
    ${cssOverrides}
    ${BASE_CSS}
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th {
      background: var(--navy); color: var(--white);
      font-size: 8pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; padding: 2.5mm 3mm; text-align: center;
    }
    td { padding: 2mm 3mm; border-bottom: 1px solid var(--gray-light); vertical-align: middle; }
    tr:nth-child(even) td { background: var(--gray-xlight); }
    tr:nth-child(1) td, tr:nth-child(2) td, tr:nth-child(3) td { font-size: 9.5pt; }
    tr:nth-child(1) td:first-child { color: #d97706; font-size: 11pt; }
    tr:nth-child(2) td:first-child { color: #6b7280; font-size: 11pt; }
    tr:nth-child(3) td:first-child { color: #92400e; font-size: 11pt; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportRankingToPDF(
  ranking: PoolRanking[],
  title: string = 'Classement Général',
  weapon?: Weapon,
  visibleColumns?: string[],
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  if (ranking.length === 0) throw new Error('Aucun tireur dans le classement');
  const isLaserSabre = weapon === 'L' || weapon === ('LASER' as any);
  const cols = visibleColumns ?? ['rank', 'lastName', 'firstName', 'club', 'victories', 'ratio', 'td', 'tr', 'quest', 'index'];
  const html = generateRankingHTML(ranking, title, isLaserSabre, cols, logoBase64, template);
  await savePDF(html, 'classement-general.pdf');
}

// ─── Export Résultats Finaux ───────────────────────────────────────────────────

export interface FinalResultForPDF {
  rank: number;
  fencer: Fencer;
  eliminatedAt?: string;
}

function generateResultsHTML(
  results: FinalResultForPDF[],
  title: string,
  logoBase64?: string,
  template?: PdfTemplate
): string {
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  const rows = results.map(r => {
    const medal = medals[r.rank] ?? '';
    const status =
      (r.fencer as any).status === 'ABANDONED' ? ' <span style="color:#ef4444;font-size:8pt">(A)</span>' :
      (r.fencer as any).status === 'FORFAIT'   ? ' <span style="color:#ef4444;font-size:8pt">(F)</span>' :
      (r.fencer as any).status === 'EXCLUDED'  ? ' <span style="color:#ef4444;font-size:8pt">(X)</span>' : '';
    return `
<tr>
  <td style="text-align:center;font-weight:700;color:var(--navy)">${medal} ${r.rank}</td>
  <td style="font-weight:600">${r.fencer.lastName.toUpperCase()}${status}</td>
  <td>${r.fencer.firstName ?? ''}</td>
  <td style="color:var(--gray-dark)">${r.fencer.club ?? ''}</td>
  <td style="text-align:center;color:var(--gray-dark)">${r.eliminatedAt ?? '-'}</td>
</tr>`;
  }).join('');

  const effectiveTitle = template?.customTitle?.trim() || title;
  const cssOverrides = template ? buildCssOverrides(template) : '';

  const sections: Record<string, string> = {
    'header': `
  <div class="doc-header">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${effectiveTitle}</h1>
      <div class="subtitle">Classement final — ${results.length} tireur${results.length > 1 ? 's' : ''}</div>
    </div>
    <div class="doc-header-badge" style="font-size:11pt">RF</div>
  </div>`,
    'gold-bar': `  <div class="gold-bar"></div>`,
    'ranking-table': `
  <table>
    <thead>
      <tr>
        <th style="width:10mm">Rg</th>
        <th style="text-align:left">Nom</th>
        <th style="text-align:left">Prénom</th>
        <th style="text-align:left">Club</th>
        <th>Éliminé en</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`,
    'footer': `
  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>`,
  };

  const defaultOrder = ['header', 'gold-bar', 'results-table', 'footer'];
  const body = assembleBody(sections, template, defaultOrder);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${effectiveTitle}</title>
  <style>
    ${cssOverrides}
    ${BASE_CSS}
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th {
      background: var(--navy); color: var(--white);
      font-size: 8pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; padding: 2.5mm 3mm; text-align: center;
    }
    td { padding: 2mm 3mm; border-bottom: 1px solid var(--gray-light); vertical-align: middle; }
    tr:nth-child(even) td { background: var(--gray-xlight); }
    tr:nth-child(1) td:first-child { color: #d97706; font-size: 11pt; }
    tr:nth-child(2) td:first-child { color: #6b7280; font-size: 11pt; }
    tr:nth-child(3) td:first-child { color: #92400e; font-size: 11pt; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportResultsToPDF(
  results: FinalResultForPDF[],
  title: string = 'Résultats Finaux',
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  if (results.length === 0) throw new Error('Aucun résultat à exporter');
  const html = generateResultsHTML(results, title, logoBase64, template);
  await savePDF(html, 'resultats-finaux.pdf');
}

// ─── Export Liste d'Appel ──────────────────────────────────────────────────────

const APPEL_COL_HEADERS: Record<string, string> = {
  ref: 'N°',
  lastName: 'Nom',
  firstName: 'Prénom',
  birthDate: 'Né(e)',
  club: 'Club',
  ranking: 'Classement',
  status: 'Statut',
};

const APPEL_STATUS_LABELS: Record<string, string> = {
  Q: 'Qualifié',
  E: 'Éliminé',
  A: 'Abandon',
  X: 'Exclu',
  N: 'Non pointé',
  P: 'Pointé',
  F: 'Forfait',
};

function getFencerCellValue(fencer: Fencer, col: string): string {
  switch (col) {
    case 'ref':       return String(fencer.ref);
    case 'lastName':  return fencer.lastName.toUpperCase();
    case 'firstName': return fencer.firstName ?? '';
    case 'birthDate': return fencer.birthDate ? String(new Date(fencer.birthDate).getFullYear()) : '-';
    case 'club':      return fencer.club || '-';
    case 'ranking':   return fencer.ranking ? `#${fencer.ranking}` : '-';
    case 'status':    return APPEL_STATUS_LABELS[fencer.status] ?? fencer.status;
    default:          return '';
  }
}

function generateAppelHTML(
  fencers: Fencer[],
  visibleColumns: string[],
  title: string,
  competitionName?: string,
  logoBase64?: string,
  template?: PdfTemplate
): string {
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const effectiveTitle = template?.customTitle?.trim() || title;
  const cssOverrides = template ? buildCssOverrides(template) : '';

  const headers = visibleColumns
    .map(col => `<th>${APPEL_COL_HEADERS[col] ?? col}</th>`)
    .join('');

  const rows = fencers.map(fencer => {
    const cells = visibleColumns
      .map(col => `<td>${getFencerCellValue(fencer, col)}</td>`)
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const subtitle = competitionName
    ? `${competitionName} — ${fencers.length} tireur${fencers.length > 1 ? 's' : ''}`
    : `${fencers.length} tireur${fencers.length > 1 ? 's' : ''}`;

  const sections: Record<string, string> = {
    'header': `
  <div class="doc-header">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${effectiveTitle}</h1>
      <div class="subtitle">${subtitle}</div>
    </div>
    <div class="doc-header-badge" style="font-size:11pt">AP</div>
  </div>`,
    'gold-bar': `  <div class="gold-bar"></div>`,
    'appel-table': `
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`,
    'footer': `
  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>`,
  };

  const defaultOrder = ['header', 'gold-bar', 'appel-table', 'footer'];
  const body = assembleBody(sections, template, defaultOrder);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${effectiveTitle}</title>
  <style>
    ${cssOverrides}
    ${BASE_CSS}
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th {
      background: var(--navy); color: var(--white);
      font-size: 8pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; padding: 2.5mm 3mm; text-align: left;
    }
    td { padding: 2mm 3mm; border-bottom: 1px solid var(--gray-light); vertical-align: middle; }
    tr:nth-child(even) td { background: var(--gray-xlight); }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportAppelToPDF(
  fencers: Fencer[],
  visibleColumns: string[] = ['ref', 'lastName', 'firstName', 'birthDate', 'club', 'ranking', 'status'],
  title: string = "Liste d'appel",
  competitionName?: string,
  logoBase64?: string,
  template?: PdfTemplate
): Promise<void> {
  if (fencers.length === 0) throw new Error("Aucun tireur dans la liste d'appel");
  const html = generateAppelHTML(fencers, visibleColumns, title, competitionName, logoBase64, template);
  await savePDF(html, 'appel.pdf');
}

// ─── Export complet compétition ───────────────────────────────────────────────

function extractBodyContent(html: string): string {
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return m ? m[1].trim() : '';
}

function extractStyleContent(html: string): string {
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const parts: string[] = [];
  let m;
  while ((m = re.exec(html)) !== null) parts.push(m[1]);
  return parts.join('\n');
}

export interface FullCompetitionExportData {
  fencers: Fencer[];
  /** Colonnes visibles de la feuille d'appel (respecte la config UI) */
  appelVisibleColumns?: string[];
  pools: Pool[];
  overallRanking: PoolRanking[];
  tableauMatches: TableauMatchForPDF[];
  consolationBrackets: { id: string; name: string; matches: TableauMatchForPDF[] }[];
  finalResults: FinalResultForPDF[];
  competitionTitle: string;
  isLaserSabre?: boolean;
  template?: PdfTemplate;
}

export async function exportFullCompetitionPDF(data: FullCompetitionExportData): Promise<void> {
  const logo = localStorage.getItem('bellepoule-logo') ?? undefined;
  const {
    fencers, appelVisibleColumns, pools, overallRanking, tableauMatches, consolationBrackets,
    finalResults, competitionTitle, isLaserSabre = false, template,
  } = data;

  const sections: string[] = [];

  if (fencers.length > 0) {
    const appelCols = appelVisibleColumns ?? ['ref', 'lastName', 'firstName', 'birthDate', 'club', 'ranking', 'status'];
    // Si les tireurs viennent de l'appel, ils sont déjà triés ; sinon tri par défaut
    const appelFencerList = appelVisibleColumns
      ? fencers
      : [...fencers].sort(
          (a, b) => (a.ranking ?? Infinity) - (b.ranking ?? Infinity) || a.lastName.localeCompare(b.lastName)
        );
    sections.push(generateAppelHTML(
      appelFencerList,
      appelCols,
      `Feuille d'appel — ${competitionTitle}`,
      competitionTitle, logo, undefined
    ));
  }

  for (const pool of pools) {
    sections.push(generatePoolHTML(
      pool,
      { title: `Poule ${pool.number} — ${competitionTitle}`, logoBase64: logo, competitionName: competitionTitle },
      template
    ));
  }

  if (overallRanking.length > 0) {
    const rankCols = isLaserSabre
      ? ['rank', 'lastName', 'firstName', 'club', 'victories', 'ratio', 'td', 'tr', 'quest', 'index']
      : ['rank', 'lastName', 'firstName', 'club', 'victories', 'ratio', 'td', 'tr', 'index'];
    sections.push(generateRankingHTML(
      overallRanking, `Classement provisoire — ${competitionTitle}`,
      isLaserSabre, rankCols, logo, template
    ));
  }

  const rounds = [...new Set(tableauMatches.map(m => m.round))].sort((a, b) => b - a);
  for (const round of rounds) {
    const roundMatches = tableauMatches.filter(m => m.round === round && !m.isBye);
    if (roundMatches.length === 0) continue;
    sections.push(generateTableauHTML(
      roundMatches, MAX_MATCHES_PER_PAGE_TABLEAU,
      `${getTableauRoundName(round)} — ${competitionTitle}`,
      logo, template
    ));
  }

  for (const bracket of consolationBrackets) {
    const bRounds = [...new Set(bracket.matches.map(m => m.round))].sort((a, b) => b - a);
    for (const round of bRounds) {
      const roundMatches = bracket.matches.filter(m => m.round === round && !m.isBye);
      if (roundMatches.length === 0) continue;
      sections.push(generateTableauHTML(
        roundMatches, MAX_MATCHES_PER_PAGE_TABLEAU,
        `${bracket.name} — ${getTableauRoundName(round)} — ${competitionTitle}`,
        logo, template
      ));
    }
  }

  if (finalResults.length > 0) {
    sections.push(generateResultsHTML(finalResults, `Classement final — ${competitionTitle}`, logo, template));
  }

  if (sections.length === 0) throw new Error('Aucune donnée à exporter');

  const allStyles = sections.map(extractStyleContent).join('\n');
  const allBodies = sections
    .map((html, i) => (i === 0 ? '' : '<div class="full-export-break"></div>\n') + extractBodyContent(html))
    .join('\n');

  const combined = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Export complet — ${competitionTitle}</title>
  <style>
    ${allStyles}
    .full-export-break { break-before: page; }
  </style>
</head>
<body>
${allBodies}
</body>
</html>`;

  const safe = competitionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  await savePDF(combined, `export_complet_${safe}.pdf`);
}

