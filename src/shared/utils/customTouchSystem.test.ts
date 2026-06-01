/**
 * Tests unitaires - Système de touches personnalisé (arme CUSTOM)
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMatchScoreCustom,
  isMatchCompleteCustom,
  getDefaultZones,
  TouchRecord,
} from './customTouchSystem';
import { CustomTouchZone, CustomScoringConfig } from '../types';

const zones: CustomTouchZone[] = [
  { id: 'head', label: 'Tête', points: 3, color: '#EF4444' },
  { id: 'torso', label: 'Tronc', points: 2, color: '#F59E0B' },
  { id: 'arm', label: 'Bras', points: 1, color: '#10B981' },
];

describe('calculateMatchScoreCustom', () => {
  it('retourne 0-0 sans touche', () => {
    expect(calculateMatchScoreCustom([], zones)).toEqual({ scoreA: 0, scoreB: 0 });
  });

  it('additionne les points par zone et par tireur', () => {
    const touches: TouchRecord[] = [
      { zoneId: 'head', fencerId: 'A' }, // +3 A
      { zoneId: 'arm', fencerId: 'A' }, // +1 A
      { zoneId: 'torso', fencerId: 'B' }, // +2 B
    ];
    expect(calculateMatchScoreCustom(touches, zones)).toEqual({ scoreA: 4, scoreB: 2 });
  });

  it('attribue 1 point par défaut pour une zone inconnue', () => {
    const touches: TouchRecord[] = [{ zoneId: 'inconnu', fencerId: 'A' }];
    expect(calculateMatchScoreCustom(touches, zones)).toEqual({ scoreA: 1, scoreB: 0 });
  });

  it('traite tout fencerId non-A comme B', () => {
    const touches: TouchRecord[] = [{ zoneId: 'head', fencerId: 'B' }];
    expect(calculateMatchScoreCustom(touches, zones)).toEqual({ scoreA: 0, scoreB: 3 });
  });
});

describe('isMatchCompleteCustom', () => {
  const config: CustomScoringConfig = { maxScore: 15 } as CustomScoringConfig;

  it('est complet quand A atteint le maxScore', () => {
    expect(isMatchCompleteCustom(15, 8, config)).toBe(true);
  });

  it('est complet quand B atteint le maxScore', () => {
    expect(isMatchCompleteCustom(3, 15, config)).toBe(true);
  });

  it('n’est pas complet en dessous du maxScore', () => {
    expect(isMatchCompleteCustom(14, 14, config)).toBe(false);
  });
});

describe('getDefaultZones', () => {
  it('retourne 3 zones avec des points décroissants', () => {
    const z = getDefaultZones();
    expect(z).toHaveLength(3);
    expect(z.map(x => x.points)).toEqual([3, 2, 1]);
    expect(z.every(x => x.id && x.label && x.color)).toBe(true);
  });
});
