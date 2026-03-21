/**
 * BellePoule Modern - Team Calculations
 * Feature 22: Utility functions for team events
 * Licensed under GPL-3.0
 */

import { Team, TeamFencer, TeamBout, TeamMatch } from './types/team.types';

/**
 * Generate relay bouts for a team match
 * Standard relay order: 1v1, 2v2, 3v3, 1v2, 2v3, 3v1, 1v3, 2v1, 3v2
 */
export function generateRelayBouts(teamA: Team, teamB: Team, maxScore: number = 5): TeamBout[] {
  const mainFencersA = teamA.fencers
    .filter(f => !f.isReserve)
    .sort((a, b) => a.teamOrder - b.teamOrder);
  const mainFencersB = teamB.fencers
    .filter(f => !f.isReserve)
    .sort((a, b) => a.teamOrder - b.teamOrder);

  if (mainFencersA.length < 3 || mainFencersB.length < 3) {
    throw new Error('Each team must have at least 3 main fencers');
  }

  // Standard relay order for 3 fencers
  const relayOrders = [
    [0, 0], // 1 vs 1
    [1, 1], // 2 vs 2
    [2, 2], // 3 vs 3
    [0, 1], // 1 vs 2
    [1, 2], // 2 vs 3
    [2, 0], // 3 vs 1
    [0, 2], // 1 vs 3
    [1, 0], // 2 vs 1
    [2, 1], // 3 vs 2
  ];

  return relayOrders.map((order, index) => ({
    id: `bout-${Date.now()}-${index}`,
    order: index + 1,
    fencerA: mainFencersA[order[0]],
    fencerB: mainFencersB[order[1]],
    scoreA: 0,
    scoreB: 0,
    maxScore,
    status: 'not_started',
  }));
}

/**
 * Calculate current team score from bouts
 */
export function calculateTeamScore(match: TeamMatch): { scoreA: number; scoreB: number } {
  let scoreA = 0;
  let scoreB = 0;

  for (const bout of match.bouts) {
    if (bout.status === 'finished' && bout.winner) {
      // Only count bouts won by main fencers (not reserves)
      const isMainA = bout.fencerA.teamOrder <= 3;
      const isMainB = bout.fencerB.teamOrder <= 3;

      if (bout.winner.id === bout.fencerA.id && isMainA) {
        scoreA += 1;
      } else if (bout.winner.id === bout.fencerB.id && isMainB) {
        scoreB += 1;
      }
    }
  }

  return { scoreA, scoreB };
}

/**
 * Validate team composition
 */
export function validateTeamComposition(team: Team): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const mainFencers = team.fencers.filter(f => !f.isReserve);
  const reserves = team.reserveFencers || [];

  if (mainFencers.length < 3) {
    errors.push('Team must have at least 3 main fencers');
  }

  if (mainFencers.length > 3) {
    errors.push('Team cannot have more than 3 main fencers');
  }

  if (reserves.length > 1) {
    errors.push('Team cannot have more than 1 reserve fencer');
  }

  // Check team orders are valid (1, 2, 3)
  const orders = mainFencers.map(f => f.teamOrder).sort();
  if (orders.join(',') !== '1,2,3') {
    errors.push('Main fencers must have team orders 1, 2, and 3');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if match is complete (45 points or 9 bouts)
 */
export function isTeamMatchComplete(match: TeamMatch): boolean {
  const { scoreA, scoreB } = calculateTeamScore(match);
  const totalBouts = match.bouts.filter(b => b.status === 'finished').length;

  // Match ends when a team reaches 45 points or all 9 bouts are completed
  return scoreA >= 45 || scoreB >= 45 || totalBouts >= 9;
}

/**
 * Get match winner
 */
export function getTeamMatchWinner(match: TeamMatch): Team | null {
  if (!isTeamMatchComplete(match)) {
    return null;
  }

  const { scoreA, scoreB } = calculateTeamScore(match);

  if (scoreA > scoreB) {
    return match.teamA;
  } else if (scoreB > scoreA) {
    return match.teamB;
  }

  // In case of tie (shouldn't happen in normal play), team with more bouts won
  const boutsWonA = match.bouts.filter(
    b => b.winner?.id && match.teamA.fencers.some(f => f.id === b.winner?.id)
  ).length;
  const boutsWonB = match.bouts.filter(
    b => b.winner?.id && match.teamB.fencers.some(f => f.id === b.winner?.id)
  ).length;

  return boutsWonA > boutsWonB ? match.teamA : match.teamB;
}
