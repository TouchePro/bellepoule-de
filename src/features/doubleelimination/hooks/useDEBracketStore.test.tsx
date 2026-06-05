// @vitest-environment jsdom
/**
 * Tests unitaires - useDEBracketStore (double élimination)
 * BellePoule Modern
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDEBracketStore } from './useDEBracketStore';

const get = () => useDEBracketStore.getState();

beforeEach(() => get().clearBracket());

describe('generateBracket', () => {
  it('crée un tableau winners + finale pour 8 tireurs', () => {
    const ids = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const bracket = get().generateBracket('c1', ids);
    expect(bracket.size).toBe(8);
    expect(bracket.competitionId).toBe('c1');
    expect(bracket.final).toHaveLength(1);
    // 1er tour winners = 4 matchs
    const round1 = bracket.winnersBracket.filter(n => n.round === 1);
    expect(round1).toHaveLength(4);
    // les tireurs sont assignés au 1er tour
    expect(round1[0].fencerAId).toBe('1');
    expect(round1[0].fencerBId).toBe('2');
    // seeds attribués
    expect(get().fencers).toHaveLength(8);
    expect(get().fencers[0].seed).toBe(1);
  });

  it('arrondit la taille à la puissance de 2 supérieure', () => {
    const bracket = get().generateBracket('c1', ['1', '2', '3', '4', '5']);
    expect(bracket.size).toBe(8);
  });
});

describe('updateMatchResult', () => {
  it('enregistre le score, le vainqueur et marque le match terminé', () => {
    const bracket = get().generateBracket('c1', ['1', '2', '3', '4']);
    const node = bracket.winnersBracket.find(n => n.round === 1)!;
    get().updateMatchResult(node.id, 15, 8);
    const updated = get().bracket!.winnersBracket.find(n => n.id === node.id)!;
    expect(updated.scoreA).toBe(15);
    expect(updated.scoreB).toBe(8);
    expect(updated.isComplete).toBe(true);
    expect(updated.winnerId).toBe(node.fencerAId);
  });
});

describe('clearBracket', () => {
  it('réinitialise le tableau et les tireurs', () => {
    get().generateBracket('c1', ['1', '2', '3', '4']);
    get().clearBracket();
    expect(get().bracket).toBeNull();
    expect(get().fencers).toEqual([]);
  });
});
