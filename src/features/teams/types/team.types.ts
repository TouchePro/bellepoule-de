/**
 * BellePoule Modern - Team Competition Types
 * Feature 22: Team event support
 * Licensed under GPL-3.0
 */

import { Competition, Fencer } from '../../shared/types';

export interface Team {
  id: string;
  name: string;
  club: string;
  fencers: TeamFencer[];
  reserveFencers?: TeamFencer[];
  totalPoints: number;
  ranking: number;
}

export interface TeamFencer extends Fencer {
  teamOrder: number; // Position in relay (1-3)
  isReserve: boolean;
}

export interface TeamMatch {
  id: string;
  teamA: Team;
  teamB: Team;
  bouts: TeamBout[];
  scoreA: number;
  scoreB: number;
  status: 'not_started' | 'in_progress' | 'finished';
  winner?: Team;
  currentBoutIndex: number;
}

export interface TeamBout {
  id: string;
  order: number;
  fencerA: TeamFencer;
  fencerB: TeamFencer;
  scoreA: number;
  scoreB: number;
  maxScore: number;
  status: 'not_started' | 'in_progress' | 'finished';
  winner?: TeamFencer;
  startTime?: Date;
  endTime?: Date;
}

export interface TeamCompetition extends Competition {
  isTeamEvent: true;
  teams: Team[];
  teamMatches: TeamMatch[];
  maxTeamSize: number;
  boutOrder: 'relay' | 'pooled';
  maxBoutScore: number;
  totalPointsToWin: number; // Usually 45 for team events
}

export interface TeamPool {
  id: string;
  name: string;
  teams: Team[];
  matches: TeamMatch[];
  ranking: TeamPoolRanking[];
  isComplete: boolean;
}

export interface TeamPoolRanking {
  team: Team;
  rank: number;
  victories: number;
  boutsWon: number;
  boutsLost: number;
  pointsScored: number;
  pointsReceived: number;
  index: number;
}

// DTOs for creating/updating
export interface CreateTeamDTO {
  name: string;
  club: string;
  fencerIds: string[];
  reserveIds?: string[];
}

export interface UpdateTeamBoutScoreDTO {
  boutId: string;
  scoreA: number;
  scoreB: number;
  status: 'in_progress' | 'finished';
}

export interface TeamStats {
  totalMatches: number;
  wonMatches: number;
  lostMatches: number;
  totalBouts: number;
  wonBouts: number;
  winRate: number;
  averageBoutDuration: number;
  strongestFencer?: TeamFencer;
  weakestFencer?: TeamFencer;
}
