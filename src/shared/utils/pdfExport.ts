/**
 * BellePoule Modern - PDF Export Service
 * Génération PDF via Electron printToPDF (sans menus ni chrome applicatif)
 * Licensed under GPL-3.0
 */

import { Pool, Match, MatchStatus, Fencer } from '../types';

interface PoolExportOptions {
  title?: string;
  competitionName?: string;
  weapon?: string;
  category?: string;
  includeFinishedMatches?: boolean;
  includePendingMatches?: boolean;
  includePoolStats?: boolean;
  logoBase64?: string;
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

function generatePoolHTML(pool: Pool, options: PoolExportOptions): string {
  const { title = `Poule ${pool.number}`, competitionName = '', weapon = '', category = '', logoBase64 } = options;
  const fencers = pool.fencers ?? [];
  const matches = pool.matches ?? [];
  const finishedCount = matches.filter(m => m.status === MatchStatus.FINISHED).length;
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Classement
  const rankings = fencers.map(f => ({
    fencer: f,
    stats: calculateFencerStats(f, matches),
    rank: 0,
  }));
  rankings.sort((a, b) => {
    if (a.stats.ratio !== b.stats.ratio) return b.stats.ratio - a.stats.ratio;
    if (a.stats.ind !== b.stats.ind) return b.stats.ind - a.stats.ind;
    return b.stats.td - a.stats.td;
  });
  rankings.forEach((r, i) => { r.rank = i + 1; });
  const rankMap = new Map(rankings.map(r => [r.fencer.id, r]));

  // Grille scores
  const colHeaders = fencers.map((_, i) => `<th class="num-header">${i + 1}</th>`).join('');
  const rows = fencers.map((fencer, row) => {
    const data = rankMap.get(fencer.id)!;
    const { v, td, tr, ind, ratio } = data.stats;
    const indStr = ind >= 0 ? `+${ind}` : `${ind}`;
    const cells = fencers.map((opponent, col) => {
      if (row === col) return '<td class="diagonal"></td>';
      const s = getScoreForCell(fencer, opponent, matches);
      if (!s) return '<td class="cell-pending"></td>';
      return `<td class="${s.isVictory ? 'cell-victory' : 'cell-defeat'}">${s.display}</td>`;
    }).join('');
    return `
      <tr>
        <td class="num-cell">${row + 1}</td>
        <td class="name-cell">${fencer.lastName.toUpperCase()} ${fencer.firstName?.charAt(0) ?? ''}.</td>
        ${cells}
        <td class="stat-cell">${v}</td>
        <td class="stat-cell">${ratio.toFixed(2)}</td>
        <td class="stat-cell">${td}</td>
        <td class="stat-cell">${tr}</td>
        <td class="stat-cell">${indStr}</td>
        <td class="rank-cell">${data.rank}</td>
      </tr>`;
  }).join('');

  // Matchs restants
  const pending = matches.filter(m => m.status !== MatchStatus.FINISHED);
  const pendingHTML = pending.length === 0 ? '' : `
    <div class="section-label">Matchs à jouer (${pending.length})</div>
    <div class="match-grid">
      ${pending.map((m, i) => {
        const idx = matches.indexOf(m) + 1;
        return `<div class="match-item match-pending">${idx}. ${m.fencerA?.lastName ?? '?'} — ${m.fencerB?.lastName ?? '?'}</div>`;
      }).join('')}
    </div>`;

  // Matchs terminés
  const finished = matches.filter(m => m.status === MatchStatus.FINISHED);
  const finishedHTML = finished.length === 0 ? '' : `
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
  const compLabel = competitionName ? `<span class="chip gold"><strong>${competitionName}</strong></span>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
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
  <div class="doc-header">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${title}</h1>
      <div class="subtitle">Grille de poule • ${finishedCount}/${matches.length} matchs joués</div>
    </div>
    <div class="doc-header-badge">P${pool.number}</div>
  </div>
  <div class="gold-bar"></div>

  <div class="meta-row">
    ${compLabel}
    ${weaponLabel}
    ${catLabel}
    <span class="chip"><strong>Tireurs</strong> ${fencers.length}</span>
    <span class="chip"><strong>Matchs</strong> ${finishedCount}/${matches.length}</span>
  </div>

  <div class="section-label">Grille des scores</div>
  <table class="score-grid">
    <thead>
      <tr>
        <th class="num-header">#</th>
        <th class="name-header">Tireur</th>
        ${colHeaders}
        <th class="stat-header">V</th>
        <th class="stat-header">V/M</th>
        <th class="stat-header">TD</th>
        <th class="stat-header">TR</th>
        <th class="stat-header">Ind</th>
        <th class="rank-header">Rg</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${pendingHTML}
  ${finishedHTML}

  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>
</body>
</html>`;
}

// ─── Export Poule ─────────────────────────────────────────────────────────────

export async function exportPoolToPDF(pool: Pool, options: PoolExportOptions = {}): Promise<void> {
  if (!pool.fencers || pool.fencers.length === 0) throw new Error('La poule ne contient aucun tireur');
  if (!pool.matches || pool.matches.length === 0) throw new Error('La poule ne contient aucun match');

  const title = options.title ?? `Poule ${pool.number}`;
  const html = generatePoolHTML(pool, { ...options, title });
  await savePDF(html, `poule-${pool.number}.pdf`);
}

export async function exportMultiplePoolsToPDF(
  pools: Pool[],
  title: string = 'Export des Poules',
  logoBase64?: string
): Promise<void> {
  if (pools.length === 0) throw new Error('Aucune poule à exporter');
  for (const pool of pools) {
    await exportPoolToPDF(pool, { title: `${title} - Poule ${pool.number}`, logoBase64 });
  }
}

export const exportOptimizedPoolToPDF = exportPoolToPDF;

// ─── Export Tableau Élimination Directe ──────────────────────────────────────

export interface TableauMatchForPDF {
  id: string;
  round: number;
  position: number;
  fencerA: { firstName?: string; lastName: string } | null;
  fencerB: { firstName?: string; lastName: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: { id: string } | null;
  isBye: boolean;
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

function generateTableauHTML(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string,
  logoBase64?: string
): string {
  const real = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  const sorted = [...real].sort((a, b) => b.round - a.round || a.position - b.position);
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const pages: TableauMatchForPDF[][] = [];
  for (let i = 0; i < sorted.length; i += matchesPerPage) {
    pages.push(sorted.slice(i, i + matchesPerPage));
  }

  const pagesHTML = pages.map((pageMatches, pageIdx) => {
    const cards = pageMatches.map((match, matchIdx) => {
      const roundName = getTableauRoundName(match.round);
      const nameA = `${match.fencerA!.lastName.toUpperCase()} ${match.fencerA!.firstName ?? ''}`.trim();
      const nameB = `${match.fencerB!.lastName.toUpperCase()} ${match.fencerB!.firstName ?? ''}`.trim();
      const num = pageIdx * matchesPerPage + matchIdx + 1;
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
        <td class="fencer-name">${nameA}</td>
        <td class="score-box"></td>
        <td class="sig-box"></td>
      </tr>
      <tr class="row-b">
        <td class="row-letter">B</td>
        <td class="fencer-name">${nameB}</td>
        <td class="score-box"></td>
        <td class="sig-box"></td>
      </tr>
    </tbody>
  </table>
  <div class="match-card-footer">
    <span>Piste ___</span>
    <span>Arbitre ________________________________</span>
    <span>Heure ___:___</span>
  </div>
</div>`;
    }).join('');

    const isLast = pageIdx === pages.length - 1;
    return `<div class="page${isLast ? '' : ' page-break'}">${cards}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${BASE_CSS}
    @page { size: A4; margin: 12mm 10mm; }

    .page-title {
      text-align: center;
      font-size: 13pt;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 5mm;
      padding-bottom: 3mm;
      border-bottom: 2px solid var(--gold);
    }
    .page-break { page-break-after: always; }

    .match-card {
      border: 2px solid var(--navy);
      border-radius: 5px;
      margin-bottom: 5mm;
      overflow: hidden;
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
  <div class="doc-header">
    ${logoBase64 ? `<img class="doc-header-logo" src="${logoBase64}" alt="Logo" />` : ''}
    <div class="doc-header-left">
      <h1>${title}</h1>
      <div class="subtitle">Feuilles d'arbitrage — Élimination directe</div>
    </div>
    <div class="doc-header-badge" style="font-size:11pt">ED</div>
  </div>
  <div class="gold-bar"></div>

  ${pagesHTML}

  <div class="doc-footer">
    <span>BellePoule Modern</span>
    <span>${now}</span>
  </div>
</body>
</html>`;
}

export async function exportTableauToPDF(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string = 'Tableau Élimination Directe',
  logoBase64?: string
): Promise<void> {
  const real = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  if (real.length === 0) {
    throw new Error('Aucun match à exporter (tous sont des exempts ou sans tireurs assignés)');
  }

  const html = generateTableauHTML(matches, matchesPerPage, title, logoBase64);
  await savePDF(html, `tableau-elimination.pdf`);
}

