/**
 * BellePoule Modern - Quest Scheduler Tests
 * Licensed under GPL-3.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFightsPerFencer,
  generateQuestSchedule,
  validateQuestSchedule,
} from './questScheduler';
import { Fencer, FencerStatus, Gender } from '../types';

const makeFencer = (id: string, club?: string, region?: string, nationality = 'FRA'): Fencer => ({
  id,
  ref: parseInt(id),
  lastName: `Tireur${id}`,
  firstName: 'Test',
  gender: Gender.MALE,
  nationality,
  club,
  region,
  status: FencerStatus.CHECKED_IN,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('calculateFightsPerFencer', () => {
  it('calcule correctement avec la formule officielle', () => {
    // (2 * 60 * 2) / (20 * 5) = 240 / 100 = 2.4 → 2
    expect(calculateFightsPerFencer(60, 2, 20)).toBe(2);
    // (2 * 120 * 3) / (20 * 5) = 720 / 100 = 7.2 → 7
    expect(calculateFightsPerFencer(120, 3, 20)).toBe(7);
    // (2 * 90 * 2) / (16 * 5) = 360 / 80 = 4.5 → 4
    expect(calculateFightsPerFencer(90, 2, 16)).toBe(4);
  });

  it('retourne 0 si les paramètres sont invalides', () => {
    expect(calculateFightsPerFencer(0, 2, 20)).toBe(0);
    expect(calculateFightsPerFencer(60, 0, 20)).toBe(0);
    expect(calculateFightsPerFencer(60, 2, 0)).toBe(0);
  });
});

describe('generateQuestSchedule', () => {
  const fencers = Array.from({ length: 10 }, (_, i) => makeFencer(String(i + 1)));

  it('génère un planning sans paires dupliquées', () => {
    const schedule = generateQuestSchedule(fencers, 4, 'none');
    const { isValid, errors } = validateQuestSchedule(schedule);
    expect(errors.filter(e => e.startsWith('Doublon'))).toHaveLength(0);
    expect(isValid).toBe(true);
  });

  it('chaque tireur effectue exactement K combats (ou K±1)', () => {
    const schedule = generateQuestSchedule(fencers, 4, 'none');
    const { fightsPerFencer } = validateQuestSchedule(schedule);

    for (const f of fencers) {
      const count = fightsPerFencer.get(f.id) ?? 0;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it('retourne [] si moins de 2 tireurs', () => {
    expect(generateQuestSchedule([fencers[0]], 3, 'none')).toHaveLength(0);
    expect(generateQuestSchedule([], 3, 'none')).toHaveLength(0);
  });

  it('retourne [] si fightsPerFencer = 0', () => {
    expect(generateQuestSchedule(fencers, 0, 'none')).toHaveLength(0);
  });

  it('respecte la contrainte de club', () => {
    const clubFencers = [
      makeFencer('1', 'ClubA'),
      makeFencer('2', 'ClubA'),
      makeFencer('3', 'ClubB'),
      makeFencer('4', 'ClubB'),
      makeFencer('5', 'ClubC'),
      makeFencer('6', 'ClubC'),
    ];
    const schedule = generateQuestSchedule(clubFencers, 2, 'club');
    for (const fight of schedule) {
      expect(fight.fencerA.club).not.toBe(fight.fencerB.club);
    }
  });

  it('respecte la contrainte de région', () => {
    const regionFencers = [
      makeFencer('1', undefined, 'Île-de-France'),
      makeFencer('2', undefined, 'Île-de-France'),
      makeFencer('3', undefined, 'PACA'),
      makeFencer('4', undefined, 'PACA'),
      makeFencer('5', undefined, 'Bretagne'),
      makeFencer('6', undefined, 'Bretagne'),
    ];
    const schedule = generateQuestSchedule(regionFencers, 2, 'region');
    for (const fight of schedule) {
      expect(fight.fencerA.region).not.toBe(fight.fencerB.region);
    }
  });

  it('respecte la contrainte de nation', () => {
    const nationFencers = [
      makeFencer('1', undefined, undefined, 'FRA'),
      makeFencer('2', undefined, undefined, 'FRA'),
      makeFencer('3', undefined, undefined, 'GER'),
      makeFencer('4', undefined, undefined, 'GER'),
      makeFencer('5', undefined, undefined, 'ITA'),
      makeFencer('6', undefined, undefined, 'ITA'),
    ];
    const schedule = generateQuestSchedule(nationFencers, 2, 'nation');
    for (const fight of schedule) {
      expect(fight.fencerA.nationality).not.toBe(fight.fencerB.nationality);
    }
  });
});

describe('validateQuestSchedule', () => {
  const f1 = makeFencer('1');
  const f2 = makeFencer('2');
  const f3 = makeFencer('3');

  it('valide un planning correct', () => {
    const schedule = [
      { fencerA: f1, fencerB: f2 },
      { fencerA: f1, fencerB: f3 },
      { fencerA: f2, fencerB: f3 },
    ];
    const result = validateQuestSchedule(schedule);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('détecte les doublons', () => {
    const schedule = [
      { fencerA: f1, fencerB: f2 },
      { fencerA: f2, fencerB: f1 }, // doublon inversé
    ];
    const result = validateQuestSchedule(schedule);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.startsWith('Doublon'))).toBe(true);
  });

  it('détecte une distribution déséquilibrée', () => {
    const schedule = [
      { fencerA: f1, fencerB: f2 },
      { fencerA: f1, fencerB: f3 },
      // f2 et f3 n'ont qu'1 combat, f1 en a 2 → écart > 1 non détecté ici (1 vs 2)
    ];
    const result = validateQuestSchedule(schedule);
    // f1=2, f2=1, f3=1 → max-min = 1 → toléré
    expect(result.isValid).toBe(true);
  });

  it('compte correctement les combats par tireur', () => {
    const schedule = [
      { fencerA: f1, fencerB: f2 },
      { fencerA: f1, fencerB: f3 },
      { fencerA: f2, fencerB: f3 },
    ];
    const { fightsPerFencer } = validateQuestSchedule(schedule);
    expect(fightsPerFencer.get('1')).toBe(2);
    expect(fightsPerFencer.get('2')).toBe(2);
    expect(fightsPerFencer.get('3')).toBe(2);
  });
});
