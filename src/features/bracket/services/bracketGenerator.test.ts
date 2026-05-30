import { describe, it, expect } from 'vitest';
import { BracketGenerator } from './bracketGenerator';
import { Fencer, FencerStatus, Gender } from '../../../shared/types';

// ============================================================================
// Helpers
// ============================================================================

const makeFencer = (id: string, ref: number): Fencer => ({
  id,
  ref,
  lastName: `Tireur${ref}`,
  firstName: 'Test',
  gender: Gender.MALE,
  nationality: 'FRA',
  status: FencerStatus.CHECKED_IN,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ============================================================================
// BracketGenerator.generate
// ============================================================================

describe('BracketGenerator.generate', () => {
  it('generates correct node count for table of 8', () => {
    // Table of 8: rounds 3,2,1 → 4+2+1 = 7 nodes
    const fencers = Array.from({ length: 8 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 8 });
    expect(nodes).toHaveLength(7);
  });

  it('generates correct node count for table of 16', () => {
    // 8+4+2+1 = 15 nodes
    const fencers = Array.from({ length: 16 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 16 });
    expect(nodes).toHaveLength(15);
  });

  it('generates correct node count for table of 4', () => {
    // 2+1 = 3 nodes
    const fencers = Array.from({ length: 4 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 4 });
    expect(nodes).toHaveLength(3);
  });

  it('generates correct node count for table of 2', () => {
    const fencers = [makeFencer('f1', 1), makeFencer('f2', 2)];
    const nodes = BracketGenerator.generate({ fencers, tableSize: 2 });
    expect(nodes).toHaveLength(1);
  });

  it('assigns unique node IDs', () => {
    const fencers = Array.from({ length: 8 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 8 });
    const ids = nodes.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('final match is at round=1 (lowest round)', () => {
    // round=1 = final, round=totalRounds = first competition round
    const fencers = Array.from({ length: 8 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 8 });
    const finalNodes = nodes.filter(n => n.round === 1);
    expect(finalNodes).toHaveLength(1);
  });

  it('first competition round (highest round number) has tableSize/2 nodes', () => {
    const fencers = Array.from({ length: 8 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 8 });
    const maxRound = Math.max(...nodes.map(n => n.round));
    const firstRoundNodes = nodes.filter(n => n.round === maxRound);
    expect(firstRoundNodes).toHaveLength(4);
  });

  it('all rounds except the first competition round have parent links', () => {
    // round < totalRounds → has a parentA or parentB pointing to the next round
    // The first competition round (maxRound) has no parents
    const fencers = Array.from({ length: 8 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 8 });
    const maxRound = Math.max(...nodes.map(n => n.round));
    const nodesWithParents = nodes.filter(n => n.round < maxRound);
    nodesWithParents.forEach(node => {
      const hasParent = node.parentA !== undefined || node.parentB !== undefined;
      expect(hasParent).toBe(true);
    });
  });

  it('parent links point to valid node IDs', () => {
    const fencers = Array.from({ length: 8 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 8 });
    const idSet = new Set(nodes.map(n => n.id));
    nodes.forEach(node => {
      if (node.parentA) expect(idSet.has(node.parentA)).toBe(true);
      if (node.parentB) expect(idSet.has(node.parentB)).toBe(true);
    });
  });

  it('isBye is false on generated nodes by default', () => {
    const fencers = Array.from({ length: 4 }, (_, i) => makeFencer(`f${i}`, i + 1));
    const nodes = BracketGenerator.generate({ fencers, tableSize: 4 });
    nodes.forEach(node => expect(node.isBye).toBe(false));
  });

  it('accepts empty seededFencers without error', () => {
    const fencers = Array.from({ length: 4 }, (_, i) => makeFencer(`f${i}`, i + 1));
    expect(() =>
      BracketGenerator.generate({ fencers, seededFencers: [], tableSize: 4 })
    ).not.toThrow();
  });
});

// ============================================================================
// BracketGenerator.generateByes
// ============================================================================

describe('BracketGenerator.generateByes', () => {
  it('returns empty array when fencerCount equals tableSize', () => {
    const byes = BracketGenerator.generateByes(8, 8);
    expect(byes).toHaveLength(0);
  });

  it('returns correct bye count', () => {
    const byes = BracketGenerator.generateByes(6, 8);
    expect(byes).toHaveLength(2);
  });

  it('returns tableSize byes when fencerCount is 0', () => {
    const byes = BracketGenerator.generateByes(0, 8);
    expect(byes).toHaveLength(8);
  });

  it('bye positions are within bracket bounds', () => {
    const tableSize = 16;
    const byes = BracketGenerator.generateByes(12, tableSize);
    byes.forEach(pos => {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThan(tableSize);
    });
  });

  it('returns 1 bye for 15 fencers in table of 16', () => {
    const byes = BracketGenerator.generateByes(15, 16);
    expect(byes).toHaveLength(1);
  });
});
