/**
 * BellePoule Modern - PDF Export Service
 * Export des poules avec grille de scores et matches restants
 * Utilise l'impression navigateur pour éviter les problèmes jsPDF/Electron
 * Licensed under GPL-3.0
 */

import { Pool, Match, MatchStatus, Fencer } from '../types';

interface PoolExportOptions {
  title?: string;
  includeFinishedMatches?: boolean;
  includePendingMatches?: boolean;
  includePoolStats?: boolean;
}

/**
 * Calcule le score d'un tireur contre un autre dans la poule
 */
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

  if (!match || match.status !== MatchStatus.FINISHED) {
    return null;
  }

  const isFencerA = match.fencerA?.id === fencer.id;
  const score = isFencerA ? match.scoreA : match.scoreB;

  if (!score) return null;

  return {
    display: `${score.isVictory ? 'V' : ''}${score.value ?? 0}`,
    isVictory: score.isVictory,
  };
}

/**
 * Calcule les statistiques d'un tireur
 */
function calculateFencerStats(
  fencer: Fencer,
  matches: Match[]
): { v: number; d: number; td: number; tr: number; ind: number; ratio: number } {
  let v = 0,
    d = 0,
    td = 0,
    tr = 0;

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

    if (myScore.isVictory) {
      v++;
    } else {
      d++;
    }
  }

  const played = v + d;
  const ratio = played > 0 ? v / played : 0;
  const ind = td - tr;

  return { v, d, td, tr, ind, ratio };
}

/**
 * Génère le contenu HTML pour la poule
 */
function generatePoolHTML(pool: Pool, title: string): string {
  const fencers = pool.fencers;
  const matches = pool.matches;
  const finishedCount = matches.filter(m => m.status === MatchStatus.FINISHED).length;

  // Calculer le classement
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

  rankings.forEach((r, idx) => {
    r.rank = idx + 1;
  });
  const rankMap = new Map(rankings.map(r => [r.fencer.id, r]));

  // Générer le HTML de la grille
  let gridHTML =
    '<table class="score-grid"><thead><tr><th class="name-col">Nom</th><th class="num-col">#</th>';
  for (let i = 0; i < fencers.length; i++) {
    gridHTML += `<th class="score-col">${i + 1}</th>`;
  }
  gridHTML +=
    '<th class="stat-col">V</th><th class="stat-col">V/M</th><th class="stat-col">TD</th><th class="stat-col">TR</th><th class="stat-col">Ind</th><th class="stat-col rank-col">Rg</th></tr></thead><tbody>';

  for (let row = 0; row < fencers.length; row++) {
    const fencer = fencers[row];
    const fencerData = rankMap.get(fencer.id)!;
    const stats = fencerData.stats;

    gridHTML += `<tr><td class="name-cell">${fencer.lastName} ${fencer.firstName?.charAt(0) || ''}.</td><td class="num-cell">${row + 1}</td>`;

    for (let col = 0; col < fencers.length; col++) {
      if (row === col) {
        gridHTML += '<td class="diagonal"></td>';
      } else {
        const opponent = fencers[col];
        const scoreData = getScoreForCell(fencer, opponent, matches);
        if (scoreData) {
          const cellClass = scoreData.isVictory ? 'victory' : 'defeat';
          gridHTML += `<td class="${cellClass}">${scoreData.display}</td>`;
        } else {
          gridHTML += '<td class="pending"></td>';
        }
      }
    }

    const indStr = stats.ind >= 0 ? `+${stats.ind}` : `${stats.ind}`;
    gridHTML += `<td class="stat-cell">${stats.v}</td>`;
    gridHTML += `<td class="stat-cell">${stats.ratio.toFixed(2)}</td>`;
    gridHTML += `<td class="stat-cell">${stats.td}</td>`;
    gridHTML += `<td class="stat-cell">${stats.tr}</td>`;
    gridHTML += `<td class="stat-cell">${indStr}</td>`;
    gridHTML += `<td class="stat-cell rank-cell">${fencerData.rank}</td></tr>`;
  }
  gridHTML += '</tbody></table>';

  // Matches restants
  const pendingMatches = matches.filter(m => m.status !== MatchStatus.FINISHED);
  let pendingHTML = '';
  if (pendingMatches.length > 0) {
    pendingHTML = `<div class="section"><h3>⚔️ Matchs restants (${pendingMatches.length})</h3><div class="matches-grid">`;
    pendingMatches.forEach(match => {
      const matchIndex = matches.indexOf(match) + 1;
      const fencerA = match.fencerA?.lastName || '?';
      const fencerB = match.fencerB?.lastName || '?';
      pendingHTML += `<div class="match pending-match">${matchIndex}. ${fencerA} - ${fencerB}</div>`;
    });
    pendingHTML += '</div></div>';
  }

  // Matches terminés
  const finishedMatches = matches.filter(m => m.status === MatchStatus.FINISHED);
  let finishedHTML = '';
  if (finishedMatches.length > 0) {
    finishedHTML = `<div class="section"><h3>✅ Matchs terminés (${finishedMatches.length})</h3><div class="matches-grid finished-grid">`;
    finishedMatches.forEach(match => {
      const matchIndex = matches.indexOf(match) + 1;
      const fencerA = match.fencerA?.lastName || '?';
      const fencerB = match.fencerB?.lastName || '?';
      const scoreA = match.scoreA?.isVictory
        ? `V${match.scoreA.value}`
        : `${match.scoreA?.value || 0}`;
      const scoreB = match.scoreB?.isVictory
        ? `V${match.scoreB.value}`
        : `${match.scoreB?.value || 0}`;
      finishedHTML += `<div class="match finished-match">${matchIndex}. ${fencerA} <strong>${scoreA}-${scoreB}</strong> ${fencerB}</div>`;
    });
    finishedHTML += '</div></div>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
      .no-print { display: none; }
    }
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: 9pt; 
      margin: 0; 
      padding: 10px; 
      color: #333;
    }
    h1 { 
      text-align: center; 
      font-size: 18pt; 
      margin: 0 0 5px 0; 
      color: #1a365d;
    }
    h2 { 
      text-align: center; 
      font-size: 10pt; 
      font-weight: normal; 
      color: #666; 
      margin: 0 0 12px 0; 
    }
    h3 { 
      font-size: 10pt; 
      margin: 10px 0 6px 0; 
      color: #2d3748;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 3px;
    }
    
    /* Grille des scores */
    .score-grid { 
      border-collapse: collapse; 
      width: 100%; 
      font-size: 8pt; 
      margin-bottom: 8px; 
    }
    .score-grid th, .score-grid td { 
      border: 1px solid #cbd5e0; 
      padding: 3px 2px; 
      text-align: center; 
    }
    .score-grid th { 
      background: #edf2f7; 
      font-weight: 600; 
      color: #2d3748;
    }
    .score-grid .name-col { width: 90px; text-align: left; }
    .score-grid .num-col { width: 18px; }
    .score-grid .score-col { width: 22px; }
    .score-grid .stat-col { width: 26px; }
    .score-grid .rank-col { background: #ebf8ff; }
    
    .score-grid .name-cell { text-align: left; font-weight: 500; white-space: nowrap; overflow: hidden; }
    .score-grid .num-cell { font-weight: 600; background: #f7fafc; }
    .score-grid .stat-cell { background: #f7fafc; }
    .score-grid .rank-cell { font-weight: 700; background: #ebf8ff; color: #2b6cb0; }
    
    .score-grid .diagonal { background: #a0aec0; }
    .score-grid .victory { background: #c6f6d5; font-weight: 600; color: #22543d; }
    .score-grid .defeat { background: #fff; color: #718096; }
    .score-grid .pending { background: #fefcbf; color: #975a16; }
    
    /* Sections */
    .section { margin-top: 8px; }
    
    /* Grille des matchs */
    .matches-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 2px 12px; 
      font-size: 8pt; 
    }
    .finished-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .match { 
      padding: 2px 4px; 
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis;
      border-radius: 2px;
    }
    .pending-match { background: #fef3c7; }
    .finished-match { background: #d1fae5; }
    
  </style>
</head>
<body>
  <h1>${title}</h1>
  <h2>${fencers.length} tireurs • ${finishedCount}/${matches.length} matchs joués</h2>
  ${gridHTML}
  ${pendingHTML}
  ${finishedHTML}
</body>
</html>`;
}

/**
 * Exporte une poule en PDF via impression navigateur
 */
export async function exportPoolToPDF(pool: Pool, options: PoolExportOptions = {}): Promise<void> {
  const { title = `Poule ${pool.number}` } = options;

  if (!pool.fencers || pool.fencers.length === 0) {
    throw new Error('La poule ne contient aucun tireur');
  }

  if (!pool.matches || pool.matches.length === 0) {
    throw new Error('La poule ne contient aucun match');
  }

  const html = generatePoolHTML(pool, title);

  // Ouvrir dans une nouvelle fenêtre pour impression
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Déclencher depuis l'ouvreur pour éviter les inline scripts bloqués par CSP
    setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
    }, 300);
  } else {
    throw new Error(
      "Impossible d'ouvrir la fenêtre d'impression. Vérifiez que les popups sont autorisés."
    );
  }
}

/**
 * Exporte plusieurs poules
 */
export async function exportMultiplePoolsToPDF(
  pools: Pool[],
  title: string = 'Export des Poules'
): Promise<void> {
  if (pools.length === 0) {
    throw new Error('Aucune poule à exporter');
  }

  for (const pool of pools) {
    await exportPoolToPDF(pool, { title: `${title} - Poule ${pool.number}` });
  }
}

// Alias pour compatibilité
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

/** Nombre maximum de matchs par feuille A4 (marges 8mm, carte ~52mm/match) */
export const MAX_MATCHES_PER_PAGE_TABLEAU = 5;

function getTableauRoundName(round: number): string {
  if (round === 2) return 'Finale';
  if (round === 3) return 'Petite finale';
  if (round === 4) return 'Demi-finales';
  if (round === 8) return 'Quarts de finale';
  if (round === 16) return 'Tableau de 16';
  if (round === 32) return 'Tableau de 32';
  if (round === 64) return 'Tableau de 64';
  if (round === 128) return 'Tableau de 128';
  return `Tableau de ${round}`;
}

function generateTableauHTML(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string
): string {
  const realMatches = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  const sorted = [...realMatches].sort((a, b) => b.round - a.round || a.position - b.position);

  const pages: TableauMatchForPDF[][] = [];
  for (let i = 0; i < sorted.length; i += matchesPerPage) {
    pages.push(sorted.slice(i, i + matchesPerPage));
  }

  const pagesHTML = pages
    .map((pageMatches, pageIdx) => {
      const isLast = pageIdx === pages.length - 1;
      const cards = pageMatches
        .map((match, matchIdx) => {
          const roundName = getTableauRoundName(match.round);
          const f = match.fencerA!;
          const g = match.fencerB!;
          const nameA = `${f.lastName} ${f.firstName || ''}`.trim();
          const nameB = `${g.lastName} ${g.firstName || ''}`.trim();
          const num = pageIdx * matchesPerPage + matchIdx + 1;
          return `
<div class="match-card">
  <div class="match-header">
    <span class="match-round">${roundName}</span>
    <span class="match-num">Match ${num}</span>
  </div>
  <table class="match-table">
    <colgroup>
      <col class="col-name">
      <col class="col-score">
      <col class="col-sig">
    </colgroup>
    <thead><tr>
      <th>Tireur</th>
      <th>Score</th>
      <th>Signature</th>
    </tr></thead>
    <tbody>
      <tr><td class="fencer-name">${nameA}</td><td class="score-box"></td><td class="sig-box"></td></tr>
      <tr><td class="fencer-name">${nameB}</td><td class="score-box"></td><td class="sig-box"></td></tr>
    </tbody>
  </table>
</div>`;
        })
        .join('');
      return `<div class="page${isLast ? '' : ' page-break'}">${cards}</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; margin: 0; padding: 10px; color: #333; }
    h1 { text-align: center; font-size: 16pt; margin: 0 0 6mm 0; color: #1a365d; }
    .page { padding-top: 0; }
    .page-break { page-break-after: always; }
    .match-card { border: 2px solid #2d3748; border-radius: 4px; margin-bottom: 7mm; overflow: hidden; }
    .match-header {
      background: #2d3748; color: white; padding: 2.5mm 4mm;
      display: flex; justify-content: space-between; align-items: center;
    }
    .match-round { font-weight: 700; font-size: 11pt; }
    .match-num { font-size: 9pt; opacity: 0.75; }
    .match-table { width: 100%; border-collapse: collapse; }
    col.col-name  { width: 55%; }
    col.col-score { width: 15%; }
    col.col-sig   { width: 30%; }
    .match-table thead th {
      background: #edf2f7; font-size: 8pt; font-weight: 600;
      padding: 1.5mm 3mm; border-bottom: 1px solid #cbd5e0;
      text-align: left; color: #4a5568;
    }
    .match-table thead th:nth-child(2) { text-align: center; }
    .match-table tbody tr:first-child td { border-bottom: 1px solid #e2e8f0; }
    .fencer-name { padding: 3mm 3mm; font-size: 12pt; font-weight: 600; vertical-align: middle; }
    .score-box {
      border-left: 1px solid #cbd5e0; border-right: 1px solid #cbd5e0;
      height: 18mm; vertical-align: middle; text-align: center;
    }
    .sig-box { height: 18mm; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${pagesHTML}
</body>
</html>`;
}

/**
 * Exporte le tableau d'élimination directe en feuilles d'arbitrage imprimables.
 * Chaque fiche contient : noms des combattants, case score, case signature.
 */
export async function exportTableauToPDF(
  matches: TableauMatchForPDF[],
  matchesPerPage: number,
  title: string = 'Tableau Élimination Directe'
): Promise<void> {
  const real = matches.filter(m => !m.isBye && m.fencerA && m.fencerB);
  if (real.length === 0) {
    throw new Error('Aucun match à exporter (tous sont des exempts ou sans tireurs assignés)');
  }

  const html = generateTableauHTML(matches, matchesPerPage, title);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Déclencher depuis l'ouvreur pour éviter les inline scripts bloqués par CSP
    setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
    }, 300);
  } else {
    throw new Error(
      "Impossible d'ouvrir la fenêtre d'impression. Vérifiez que les popups sont autorisés."
    );
  }
}
