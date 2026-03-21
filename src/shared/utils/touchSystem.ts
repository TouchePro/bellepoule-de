/**
 * BellePoule Modern - Zone-Based Touch System (FFE Sabre Laser)
 * Handles scoring with zones A (1pt), B (3pts), C (5pts)
 * Licensed under GPL-3.0
 */

import { Touch, TargetZone, Match, MatchMode, ZONE_POINTS } from '../types';
import { isValidSuddenDeathTouch } from './suddenDeath';
import { v4 as uuidv4 } from 'uuid';

export interface TouchResult {
  success: boolean;
  touch?: Touch;
  error?: string;
  reversed?: boolean;
}

export function createTouch(
  matchId: string,
  fencerId: string,
  zone: TargetZone,
  match: Match
): TouchResult {
  const points = ZONE_POINTS[zone];

  if (!points) {
    return { success: false, error: 'Invalid zone' };
  }

  const matchMode = match.mode ?? MatchMode.NORMAL;

  if (
    matchMode === MatchMode.SUDDEN_DEATH_CHALLENGER ||
    matchMode === MatchMode.SUDDEN_DEATH_TIMEOUT
  ) {
    const validation = isValidSuddenDeathTouch(zone, matchMode);
    if (!validation.isValid) {
      const touch: Touch = {
        id: uuidv4(),
        matchId,
        fencerId,
        zone,
        points: 0,
        timestamp: new Date(),
        isValidInSuddenDeath: false,
        isReversed: true,
      };
      return { success: true, touch, reversed: true };
    }
  }

  const touch: Touch = {
    id: uuidv4(),
    matchId,
    fencerId,
    zone,
    points,
    timestamp: new Date(),
    isValidInSuddenDeath: matchMode.startsWith('sudden_death') ?? false,
  };

  return { success: true, touch };
}

export function undoLastTouch(touches: Touch[], fencerId: string): Touch[] {
  const fencerTouches = touches.filter(t => t.fencerId === fencerId);
  if (fencerTouches.length === 0) return touches;

  const lastTouch = fencerTouches[fencerTouches.length - 1];
  return touches.filter(t => t.id !== lastTouch.id);
}

export function getTouchSummary(
  touches: Touch[],
  fencerId: string
): {
  totalPoints: number;
  byZone: Record<TargetZone, number>;
} {
  const fencerTouches = touches.filter(t => t.fencerId === fencerId);

  const byZone: Record<TargetZone, number> = {
    [TargetZone.ZONE_A]: 0,
    [TargetZone.ZONE_B]: 0,
    [TargetZone.ZONE_C]: 0,
  };

  let totalPoints = 0;
  for (const touch of fencerTouches) {
    if (!touch.isReversed) {
      byZone[touch.zone]++;
      totalPoints += touch.points;
    }
  }

  return { totalPoints, byZone };
}

export const ZONE_COLORS: Record<TargetZone, string> = {
  [TargetZone.ZONE_A]: '#60a5fa',
  [TargetZone.ZONE_B]: '#a78bfa',
  [TargetZone.ZONE_C]: '#f472b6',
};

export const ZONE_BG_CLASSES: Record<TargetZone, string> = {
  [TargetZone.ZONE_A]: 'bg-blue-400',
  [TargetZone.ZONE_B]: 'bg-purple-400',
  [TargetZone.ZONE_C]: 'bg-pink-400',
};
