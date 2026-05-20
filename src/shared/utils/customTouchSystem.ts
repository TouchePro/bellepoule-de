/**
 * BellePoule Modern - Système de touches personnalisé (arme CUSTOM)
 * Gère les zones de touche configurables (label, points, couleur).
 */

import { CustomScoringConfig, CustomTouchZone } from '../types';

export interface TouchRecord {
  zoneId: string;
  fencerId: string; // 'A' ou 'B'
}

export function calculateMatchScoreCustom(
  touches: TouchRecord[],
  zones: CustomTouchZone[]
): { scoreA: number; scoreB: number } {
  const zoneMap = new Map(zones.map(z => [z.id, z.points]));

  let scoreA = 0;
  let scoreB = 0;

  for (const touch of touches) {
    const points = zoneMap.get(touch.zoneId) ?? 1;
    if (touch.fencerId === 'A') scoreA += points;
    else scoreB += points;
  }

  return { scoreA, scoreB };
}

export function isMatchCompleteCustom(
  scoreA: number,
  scoreB: number,
  config: CustomScoringConfig
): boolean {
  return scoreA >= config.maxScore || scoreB >= config.maxScore;
}

export function getDefaultZones(): CustomTouchZone[] {
  return [
    { id: 'head', label: 'Tête', points: 3, color: '#EF4444' },
    { id: 'torso', label: 'Tronc', points: 2, color: '#F59E0B' },
    { id: 'arm', label: 'Bras/Jambes', points: 1, color: '#10B981' },
  ];
}
