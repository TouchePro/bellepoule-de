/**
 * Tests unitaires - teamCalculations
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import {
  generateRelayBouts,
  calculateTeamScore,
  validateTeamComposition,
  isTeamMatchComplete,
  getTeamMatchWinner,
} from './teamCalculations';
import { Team, TeamFencer, TeamMatch, TeamBout } from '../types/team.types';

const tf = (id: string, order: number, isReserve = false): TeamFencer =>
  ({ id, lastName: id, firstName: id, teamOrder: order, isReserve } as unknown as TeamFencer);

const team = (id: string, fencers: TeamFencer[], reserves: TeamFencer[] = []): Team => ({
  id, name: id, club: 'C', fencers, reserveFencers: reserves, totalPoints: 0, ranking: 0,
});

const teamA = () => team('A', [tf('a1', 1), tf('a2', 2), tf('a3', 3)]);
const teamB = () => team('B', [tf('b1', 1), tf('b2', 2), tf('b3', 3)]);

describe('generateRelayBouts', () => {
  it('génère 9 relais dans l’ordre standard', () => {
    const bouts = generateRelayBouts(teamA(), teamB());
    expect(bouts).toHaveLength(9);
    expect(bouts[0].fencerA.id).toBe('a1');
    expect(bouts[0].fencerB.id).toBe('b1');
    expect(bouts[3].fencerA.id).toBe('a1'); // 1 vs 2
    expect(bouts[3].fencerB.id).toBe('b2');
    expect(bouts.map(b => b.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('ignore les réservistes et trie par teamOrder', () => {
    const a = team('A', [tf('a3', 3), tf('a1', 1), tf('a2', 2), tf('aR', 4, true)]);
    const bouts = generateRelayBouts(a, teamB());
    expect(bouts[0].fencerA.id).toBe('a1');
  });

  it('lève une erreur si moins de 3 titulaires', () => {
    const short = team('A', [tf('a1', 1), tf('a2', 2)]);
    expect(() => generateRelayBouts(short, teamB())).toThrow();
  });
});

describe('calculateTeamScore', () => {
  it('compte uniquement les relais terminés avec vainqueur', () => {
    const match: TeamMatch = {
      id: 'm', teamA: teamA(), teamB: teamB(), bouts: [], scoreA: 0, scoreB: 0,
      status: 'in_progress', currentBoutIndex: 0,
    };
    const bout = (winner: TeamFencer, fa: TeamFencer, fb: TeamFencer, status = 'finished'): TeamBout =>
      ({ id: 'x', order: 1, fencerA: fa, fencerB: fb, scoreA: 0, scoreB: 0, maxScore: 5, status, winner } as TeamBout);
    match.bouts = [
      bout(tf('a1', 1), tf('a1', 1), tf('b1', 1)), // A
      bout(tf('b2', 2), tf('a2', 2), tf('b2', 2)), // B
      bout(tf('a3', 3), tf('a3', 3), tf('b3', 3), 'in_progress'), // ignoré
    ];
    expect(calculateTeamScore(match)).toEqual({ scoreA: 1, scoreB: 1 });
  });
});

describe('validateTeamComposition', () => {
  it('valide une équipe de 3 titulaires d’ordres 1,2,3', () => {
    expect(validateTeamComposition(teamA())).toEqual({ valid: true, errors: [] });
  });

  it('refuse moins de 3 titulaires', () => {
    const r = validateTeamComposition(team('A', [tf('a1', 1), tf('a2', 2)]));
    expect(r.valid).toBe(false);
  });

  it('refuse plus d’un réserviste', () => {
    const r = validateTeamComposition(
      team('A', [tf('a1', 1), tf('a2', 2), tf('a3', 3)], [tf('r1', 4, true), tf('r2', 5, true)])
    );
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => /reserve/i.test(e))).toBe(true);
  });
});

describe('isTeamMatchComplete / getTeamMatchWinner', () => {
  const finishedBout = (id: string, winner: TeamFencer, fa: TeamFencer, fb: TeamFencer): TeamBout =>
    ({ id, order: 1, fencerA: fa, fencerB: fb, scoreA: 0, scoreB: 0, maxScore: 5, status: 'finished', winner } as TeamBout);

  it('est complet après 9 relais terminés', () => {
    const a = teamA(), b = teamB();
    const bouts = Array.from({ length: 9 }, (_, i) => finishedBout(`x${i}`, tf('a1', 1), tf('a1', 1), tf('b1', 1)));
    const match: TeamMatch = { id: 'm', teamA: a, teamB: b, bouts, scoreA: 0, scoreB: 0, status: 'finished', currentBoutIndex: 9 };
    expect(isTeamMatchComplete(match)).toBe(true);
    expect(getTeamMatchWinner(match)).toBe(a); // A gagne tous les relais
  });

  it('retourne null si le match n’est pas terminé', () => {
    const match: TeamMatch = { id: 'm', teamA: teamA(), teamB: teamB(), bouts: [], scoreA: 0, scoreB: 0, status: 'in_progress', currentBoutIndex: 0 };
    expect(isTeamMatchComplete(match)).toBe(false);
    expect(getTeamMatchWinner(match)).toBeNull();
  });
});
