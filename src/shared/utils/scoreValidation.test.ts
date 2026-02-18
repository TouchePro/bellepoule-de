/**
 * Tests unitaires pour la validation des scores
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import {
  validateMatchScore,
  checkDuplicateMatches,
  validatePoolMatches,
  formatValidationMessage,
  isValidCompleteScore,
} from './scoreValidation';
import { Match, MatchStatus, Score } from '../types';

// Helper pour créer un score
const createScore = (value: number): Score => ({
  value,
  isVictory: true,
  isAbstention: false,
  isExclusion: false,
  isForfait: false,
});

// Helper pour créer un match
const createMockMatch = (
  id: string,
  fencerAId: string,
  fencerBId: string,
  status: MatchStatus = MatchStatus.FINISHED
): Match => ({
  id,
  number: 1,
  fencerA: {
    id: fencerAId,
    ref: 1,
    lastName: 'A',
    firstName: 'A',
    gender: 'M' as any,
    nationality: 'FRA',
    status: 'Q' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  fencerB: {
    id: fencerBId,
    ref: 2,
    lastName: 'B',
    firstName: 'B',
    gender: 'M' as any,
    nationality: 'FRA',
    status: 'Q' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  scoreA: null,
  scoreB: null,
  maxScore: 5,
  status,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('validateMatchScore', () => {
  it('should validate correct score', () => {
    const result = validateMatchScore(5, 3, 5);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect scores exceeding max', () => {
    const result = validateMatchScore(6, 3, 5);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('MAX_SCORE_EXCEEDED');
  });

  it('should detect negative scores', () => {
    const result = validateMatchScore(-1, 3, 5);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('INVALID_SCORE');
  });

  it('should detect tie when not allowed', () => {
    const result = validateMatchScore(3, 3, 5);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('INCONSISTENT_RESULT');
  });

  it('should allow tie when explicitly allowed', () => {
    const result = validateMatchScore(3, 3, 5, { allowTie: true });
    expect(result.isValid).toBe(true);
  });

  it('should warn when winner does not have max score', () => {
    const result = validateMatchScore(4, 3, 5);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('INCONSISTENT_RESULT');
  });

  it('should warn about unilateral score', () => {
    const result = validateMatchScore(5, 0, 5);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('unilatéral');
  });

  it('should handle null scores', () => {
    const result = validateMatchScore(null, null, 5);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('checkDuplicateMatches', () => {
  const matches: Match[] = [createMockMatch('m1', 'f1', 'f2'), createMockMatch('m2', 'f3', 'f4')];

  it('should return null when no duplicate', () => {
    const error = checkDuplicateMatches(matches, 'm3', 'f5', 'f6');
    expect(error).toBeNull();
  });

  it('should detect exact duplicate', () => {
    const error = checkDuplicateMatches(matches, 'm3', 'f1', 'f2');
    expect(error).not.toBeNull();
    expect(error?.type).toBe('DUPLICATE_MATCH');
  });

  it('should detect reverse duplicate', () => {
    const error = checkDuplicateMatches(matches, 'm3', 'f2', 'f1');
    expect(error).not.toBeNull();
    expect(error?.type).toBe('DUPLICATE_MATCH');
  });

  it('should ignore cancelled matches', () => {
    const cancelledMatches = [createMockMatch('m1', 'f1', 'f2', MatchStatus.CANCELLED)];
    const error = checkDuplicateMatches(cancelledMatches, 'm2', 'f1', 'f2');
    expect(error).toBeNull();
  });
});

describe('validatePoolMatches', () => {
  it('should validate all matches in pool', () => {
    const matches: Match[] = [
      { ...createMockMatch('m1', 'f1', 'f2'), scoreA: createScore(5), scoreB: createScore(3) },
      { ...createMockMatch('m2', 'f1', 'f3'), scoreA: createScore(6), scoreB: createScore(2) },
    ];

    const results = validatePoolMatches(matches, 5);
    expect(results.size).toBe(2);
    expect(results.get('m1')?.isValid).toBe(true);
    expect(results.get('m2')?.isValid).toBe(false);
  });
});

describe('formatValidationMessage', () => {
  it('should format error messages', () => {
    const result = {
      isValid: false,
      errors: [
        { type: 'INVALID_SCORE' as any, message: 'Score invalide', severity: 'error' as any },
      ],
      warnings: [
        { type: 'INCONSISTENT_RESULT' as any, message: 'Attention', severity: 'warning' as any },
      ],
    };

    const message = formatValidationMessage(result);
    expect(message).toContain('❌ Score invalide');
    expect(message).toContain('⚠️ Attention');
  });

  it('should return empty string for valid result', () => {
    const result = { isValid: true, errors: [], warnings: [] };
    const message = formatValidationMessage(result);
    expect(message).toBe('');
  });
});

describe('isValidCompleteScore', () => {
  it('should return true for valid complete score', () => {
    expect(isValidCompleteScore(createScore(5), createScore(3), 5)).toBe(true);
  });

  it('should return false for null scores', () => {
    expect(isValidCompleteScore(null, createScore(3), 5)).toBe(false);
  });

  it('should return false for invalid score', () => {
    expect(isValidCompleteScore(createScore(6), createScore(3), 5)).toBe(false);
  });
});
