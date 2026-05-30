/**
 * BellePoule Modern - Multi-Format Export Utilities
 * Licensed under GPL-3.0
 */

import { Competition, Fencer, Pool, PoolRanking, FencerStatus, MatchStatus, MatchEventEntry } from '../types';

/**
 * Export results as HTML web page
 */
export function exportResultsHTML(
  competition: Competition,
  poolRanking: PoolRanking[],
  finalResults: any[]
): string {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${competition.title} - Résultats</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }
    .header .meta {
      opacity: 0.9;
      font-size: 0.9rem;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      margin-top: 0;
      color: #1F2937;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid #E5E7EB;
    }
    th {
      background: #F9FAFB;
      font-weight: 600;
      color: #4B5563;
    }
    tr:hover {
      background: #F9FAFB;
    }
    .rank-1 { background: #FEF3C7 !important; }
    .rank-2 { background: #F3F4F6 !important; }
    .rank-3 { background: #FDE68A !important; }
    .footer {
      text-align: center;
      color: #6B7280;
      margin-top: 2rem;
      font-size: 0.875rem;
    }
    @media print {
      body { background: white; }
      .section { box-shadow: none; border: 1px solid #E5E7EB; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 ${competition.title}</h1>
    <div class="meta">
      📅 ${new Date(competition.date).toLocaleDateString('fr-FR')} | 
      📍 ${competition.location || 'Lieu non défini'} |
      ⚔️ ${competition.weapon}
    </div>
  </div>

  <div class="section">
    <h2>🥇 Classement Final</h2>
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Nom</th>
          <th>Club</th>
          <th>Nationalité</th>
        </tr>
      </thead>
      <tbody>
        ${finalResults
          .map(
            (result, index) => `
          <tr class="rank-${result.rank}">
            <td>${result.rank}</td>
            <td><strong>${result.fencer.lastName} ${result.fencer.firstName}</strong></td>
            <td>${result.fencer.club || '-'}</td>
            <td>${result.fencer.nationality || '-'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>📊 Classement des Poules</h2>
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Nom</th>
          <th>Club</th>
          <th>V</th>
          <th>D</th>
          <th>TD</th>
          <th>TR</th>
          <th>Indice</th>
        </tr>
      </thead>
      <tbody>
        ${poolRanking
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${r.fencer.lastName} ${r.fencer.firstName}</strong></td>
            <td>${r.fencer.club || '-'}</td>
            <td>${r.victories || 0}</td>
            <td>${r.defeats || 0}</td>
            <td>${r.touchesScored || 0}</td>
            <td>${r.touchesReceived || 0}</td>
            <td>${r.index || 0}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Généré par BellePoule Modern le ${new Date().toLocaleString('fr-FR')}</p>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Export ranking as Excel-compatible CSV with formulas
 */
export function exportRankingCSV(
  poolRanking: PoolRanking[],
  includeFormulas: boolean = false
): string {
  const headers = [
    'Rang',
    'Nom',
    'Prénom',
    'Club',
    'Nationalité',
    'V',
    'D',
    'TD',
    'TR',
    'Statut',
    'Indice',
  ];

  const getStatusLabel = (status: FencerStatus) => {
    switch (status) {
      case FencerStatus.ABANDONED:
        return 'A';
      case FencerStatus.FORFAIT:
        return 'F';
      case FencerStatus.EXCLUDED:
        return 'X';
      default:
        return '';
    }
  };

  let csv = headers.join(';') + '\n';

  poolRanking.forEach((ranking, index) => {
    const row = [
      index + 1,
      `"${ranking.fencer.lastName}"`,
      `"${ranking.fencer.firstName}"`,
      `"${ranking.fencer.club || ''}"`,
      `"${ranking.fencer.nationality || ''}"`,
      ranking.victories || 0,
      ranking.defeats || 0,
      ranking.touchesScored || 0,
      ranking.touchesReceived || 0,
      getStatusLabel(ranking.fencer.status),
      includeFormulas ? `=H${index + 2}-I${index + 2}` : ranking.index || 0,
    ];
    csv += row.join(';') + '\n';
  });

  return csv;
}

/**
 * Export results as BellePoule/FIE XML format (BaseCompetition spec).
 * Structure: BaseCompetition attrs → Tireurs → PhaseDePoules (optional).
 */
export function exportResultsXMLFFE(
  competition: Competition,
  poolRanking: PoolRanking[],
  finalResults: any[],
  pools?: Pool[]
): string {
  const mapStatut = (status: FencerStatus): string => {
    switch (status) {
      case FencerStatus.ABANDONED: return 'Abandonne';
      case FencerStatus.EXCLUDED:  return 'Exclu';
      case FencerStatus.FORFAIT:   return 'Forfait';
      case FencerStatus.ELIMINATED: return 'Elimine';
      default: return 'Qualifie';
    }
  };

  const finalRankMap = new Map<string, number>();
  for (const r of finalResults) {
    if (r.fencer?.id) finalRankMap.set(r.fencer.id, r.rank);
  }

  const dateStr =
    competition.date instanceof Date
      ? competition.date.toISOString().slice(0, 10)
      : String(competition.date).slice(0, 10);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<BaseCompetition` +
    ` Arme="${escapeXml(competition.weapon)}"` +
    ` Sexe="${escapeXml(competition.gender)}"` +
    ` Categorie="${escapeXml(competition.category)}"` +
    ` Format="${competition.isTeamEvent ? 'Equipes' : 'Individuel'}"` +
    ` ID="${escapeXml(competition.id)}"` +
    ` Organisateur="${escapeXml(competition.organizer || '')}"` +
    ` Lieu="${escapeXml(competition.location || '')}"` +
    ` Date="${dateStr}"` +
    ` Label="${escapeXml(competition.title)}"` +
    ` NbTireurs="${poolRanking.length}">`
  );

  lines.push('  <Tireurs>');
  for (const r of poolRanking) {
    const f = r.fencer;
    const finalRank = finalRankMap.get(f.id) ?? r.rank;
    lines.push(
      `    <Tireur` +
      ` ID="${f.ref}"` +
      ` Nom="${escapeXml(f.lastName)}"` +
      ` Prenom="${escapeXml(f.firstName)}"` +
      ` Sexe="${escapeXml(f.gender)}"` +
      ` Nation="${escapeXml(f.nationality || '')}"` +
      ` Ligue="${escapeXml(f.region || '')}"` +
      ` Club="${escapeXml(f.club || '')}"` +
      ` Licence="${escapeXml(f.license || '')}"` +
      ` Classement="${f.ranking ?? ''}"` +
      ` Statut="${mapStatut(f.status)}"` +
      ` NbVictoires="${r.victories}"` +
      ` NbDefaites="${r.defeats}"` +
      ` TD="${r.touchesScored}"` +
      ` TR="${r.touchesReceived}"` +
      ` Indice="${r.index}"` +
      ` RangPoules="${r.rank}"` +
      ` RangFinal="${finalRank}"/>`
    );
  }
  lines.push('  </Tireurs>');

  if (pools && pools.length > 0) {
    lines.push(`  <PhaseDePoules NbPoules="${pools.length}" NbTours="1">`);
    for (const pool of pools) {
      const arbName =
        pool.referees?.[0]
          ? escapeXml(`${pool.referees[0].lastName} ${pool.referees[0].firstName}`)
          : '';
      lines.push(
        `    <Poule ID="${pool.number}" Piste="${pool.strip ?? pool.number}" Arbitre="${arbName}">`
      );
      for (const f of pool.fencers) {
        lines.push(`      <Tireur REF="${f.ref}"/>`);
      }
      let matchId = 1;
      for (const match of pool.matches) {
        if (!match.fencerA || !match.fencerB || match.status !== MatchStatus.FINISHED) continue;
        const sA = match.scoreA;
        const sB = match.scoreB;
        const stA = sA?.isAbstention ? 'A' : sA?.isForfait ? 'F' : sA?.isExclusion ? 'E' : sA?.isVictory ? 'V' : 'D';
        const stB = sB?.isAbstention ? 'A' : sB?.isForfait ? 'F' : sB?.isExclusion ? 'E' : sB?.isVictory ? 'V' : 'D';
        lines.push(`      <Match ID="${matchId++}">`);
        lines.push(`        <Tireur REF="${match.fencerA.ref}" Score="${sA?.value ?? 0}" Statut="${stA}"/>`);
        lines.push(`        <Tireur REF="${match.fencerB.ref}" Score="${sB?.value ?? 0}" Statut="${stB}"/>`);
        lines.push(`      </Match>`);
      }
      lines.push(`    </Poule>`);
    }
    lines.push(`  </PhaseDePoules>`);
  }

  lines.push('</BaseCompetition>');
  return lines.join('\n');
}

/**
 * Export detailed statistics as CSV
 */
export function exportDetailedStatsCSV(
  competition: Competition,
  pools: Pool[],
  poolRanking: PoolRanking[]
): string {
  const headers = [
    'Rang',
    'Nom',
    'Prénom',
    'Club',
    'V',
    'D',
    'TD',
    'TR',
    'Indice',
    'VMoy',
    'DMoy',
    'TDMoy',
    'TRMoy',
  ];

  let csv = `Compétition: ${competition.title}\n`;
  csv += `Date: ${new Date(competition.date).toLocaleDateString('fr-FR')}\n\n`;
  csv += headers.join(';') + '\n';

  poolRanking.forEach((ranking, index) => {
    const totalMatches = ranking.victories + ranking.defeats;

    const row = [
      index + 1,
      `"${ranking.fencer.lastName}"`,
      `"${ranking.fencer.firstName}"`,
      `"${ranking.fencer.club || ''}"`,
      ranking.victories || 0,
      ranking.defeats || 0,
      ranking.touchesScored || 0,
      ranking.touchesReceived || 0,
      ranking.index || 0,
      totalMatches > 0 ? ((ranking.victories / totalMatches) * 100).toFixed(1) : 0,
      totalMatches > 0 ? ((ranking.defeats / totalMatches) * 100).toFixed(1) : 0,
      totalMatches > 0 ? (ranking.touchesScored / totalMatches).toFixed(1) : 0,
      totalMatches > 0 ? (ranking.touchesReceived / totalMatches).toFixed(1) : 0,
    ];
    csv += row.join(';') + '\n';
  });

  return csv;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function describeMatchEvent(entry: MatchEventEntry): string {
  switch (entry.eventType) {
    case 'touch':
      return `Zone ${entry.zone ?? '?'} — ${entry.points ?? 0} pt(s)`;
    case 'card': {
      const exclusion = entry.resultingExclusion ? ' (exclusion)' : '';
      return `Carton ${entry.cardType ?? ''} — ${entry.cardReason ?? ''}${exclusion}`;
    }
    case 'arena_exit':
      return `${entry.exitType === 'arena_exit_voluntary' ? 'Sortie volontaire' : "Sortie d'arène"} — +${entry.points ?? 0} pts adv.`;
    case 'score_change': {
      const pA = entry.previousScoreA?.value ?? '?';
      const pB = entry.previousScoreB?.value ?? '?';
      const nA = entry.newScoreA?.value ?? '?';
      const nB = entry.newScoreB?.value ?? '?';
      const by = entry.refereeName ?? entry.changedBy ?? '?';
      return `${pA}/${pB} → ${nA}/${nB} (${by})`;
    }
    default:
      return '';
  }
}

export function exportMatchTimelineJSON(
  entries: MatchEventEntry[],
  title: string,
  competitionName?: string
): string {
  return JSON.stringify(
    {
      title,
      competitionName: competitionName ?? null,
      exportedAt: new Date().toISOString(),
      eventCount: entries.length,
      events: entries,
    },
    null,
    2
  );
}
