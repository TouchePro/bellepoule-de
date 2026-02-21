/**
 * Tests unitaires pour le système de touches par zone FFE Sabre Laser
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import {
  createTouch,
  undoLastTouch,
  getTouchSummary,
  ZONE_COLORS,
  ZONE_BG_CLASSES,
} from './touchSystem';
import { Touch, TargetZone, MatchMode, Match, ZONE_POINTS } from '../types';

// ============================================================================
// Helper pour créer un match de test
// ============================================================================

const createMockMatch = (mode: MatchMode = MatchMode.NORMAL): Match => ({
  id: 'm1',
  number: 1,
  mode,
  status: 'in_progress',
  createdAt: new Date(),
  updatedAt: new Date(),
} as Match);

const createMockTouch = (
  fencerId: string,
  zone: TargetZone,
  points: number,
  isReversed: boolean = false
): Touch => ({
  id: `touch-${Date.now()}-${Math.random()}`,
  matchId: 'm1',
  fencerId,
  zone,
  points,
  timestamp: new Date(),
  isValidInSuddenDeath: false,
  isReversed,
});

// ============================================================================
// Tests pour les constantes ZONE_POINTS
// ============================================================================

describe('ZONE_POINTS - Points par zone FFE', () => {
  
  it('Zone A (Main/Arme) = 1 point', () => {
    expect(ZONE_POINTS[TargetZone.ZONE_A]).toBe(1);
  });
  
  it('Zone B (Bras/Jambes) = 3 points', () => {
    expect(ZONE_POINTS[TargetZone.ZONE_B]).toBe(3);
  });
  
  it('Zone C (Tête/Tronc) = 5 points', () => {
    expect(ZONE_POINTS[TargetZone.ZONE_C]).toBe(5);
  });
  
});

// ============================================================================
// Tests pour createTouch
// ============================================================================

describe('createTouch', () => {
  
  describe('Mode Normal - Toutes zones valides', () => {
    
    it('Zone A crée une touche de 1 point', () => {
      const match = createMockMatch();
      const result = createTouch('m1', 'f1', TargetZone.ZONE_A, match);
      
      expect(result.success).toBe(true);
      expect(result.touch).toBeDefined();
      expect(result.touch?.points).toBe(1);
      expect(result.touch?.zone).toBe(TargetZone.ZONE_A);
    });
    
    it('Zone B crée une touche de 3 points', () => {
      const match = createMockMatch();
      const result = createTouch('m1', 'f1', TargetZone.ZONE_B, match);
      
      expect(result.success).toBe(true);
      expect(result.touch?.points).toBe(3);
    });
    
    it('Zone C crée une touche de 5 points', () => {
      const match = createMockMatch();
      const result = createTouch('m1', 'f1', TargetZone.ZONE_C, match);
      
      expect(result.success).toBe(true);
      expect(result.touch?.points).toBe(5);
    });
    
    it('assigne correctement matchId et fencerId', () => {
      const match = createMockMatch();
      const result = createTouch('match-123', 'fencer-456', TargetZone.ZONE_A, match);
      
      expect(result.touch?.matchId).toBe('match-123');
      expect(result.touch?.fencerId).toBe('fencer-456');
    });
    
    it('génère un ID unique', () => {
      const match = createMockMatch();
      const touch1 = createTouch('m1', 'f1', TargetZone.ZONE_A, match);
      const touch2 = createTouch('m1', 'f1', TargetZone.ZONE_A, match);
      
      expect(touch1.touch?.id).not.toBe(touch2.touch?.id);
    });
    
    it('ajoute un timestamp', () => {
      const before = new Date();
      const match = createMockMatch();
      const result = createTouch('m1', 'f1', TargetZone.ZONE_B, match);
      const after = new Date();
      
      expect(result.touch?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.touch?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
    
  });
  
  describe('Mode Mort Subite - Seule Zone C compte', () => {
    
    it('Zone C donne 5 points normalement', () => {
      const match = createMockMatch(MatchMode.SUDDEN_DEATH_CHALLENGER);
      const result = createTouch('m1', 'f1', TargetZone.ZONE_C, match);
      
      expect(result.success).toBe(true);
      expect(result.touch?.points).toBe(5);
      expect(result.reversed).toBeFalsy();
    });
    
    it('Zone A donne 0 points (reversed)', () => {
      const match = createMockMatch(MatchMode.SUDDEN_DEATH_CHALLENGER);
      const result = createTouch('m1', 'f1', TargetZone.ZONE_A, match);
      
      expect(result.success).toBe(true);
      expect(result.touch?.points).toBe(0);
      expect(result.reversed).toBe(true);
      expect(result.touch?.isReversed).toBe(true);
    });
    
    it('Zone B donne 0 points (reversed)', () => {
      const match = createMockMatch(MatchMode.SUDDEN_DEATH_TIMEOUT);
      const result = createTouch('m1', 'f1', TargetZone.ZONE_B, match);
      
      expect(result.success).toBe(true);
      expect(result.touch?.points).toBe(0);
      expect(result.reversed).toBe(true);
    });
    
  });
  
});

// ============================================================================
// Tests pour undoLastTouch
// ============================================================================

describe('undoLastTouch', () => {
  
  it('supprime la dernière touche du tireur', () => {
    const touches: Touch[] = [
      createMockTouch('f1', TargetZone.ZONE_A, 1),
      createMockTouch('f1', TargetZone.ZONE_B, 3),
      createMockTouch('f1', TargetZone.ZONE_C, 5),
    ];
    // Forcer des IDs différents
    touches[0].id = 't1';
    touches[1].id = 't2';
    touches[2].id = 't3';
    
    const result = undoLastTouch(touches, 'f1');
    
    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === 't3')).toBeUndefined();
  });
  
  it('ne supprime que les touches du tireur spécifié', () => {
    const touches: Touch[] = [
      { ...createMockTouch('f1', TargetZone.ZONE_A, 1), id: 't1' },
      { ...createMockTouch('f2', TargetZone.ZONE_B, 3), id: 't2' },
      { ...createMockTouch('f1', TargetZone.ZONE_C, 5), id: 't3' },
    ];
    
    const result = undoLastTouch(touches, 'f1');
    
    expect(result).toHaveLength(2);
    // t3 (f1) supprimé, t2 (f2) conservé
    expect(result.find(t => t.id === 't2')).toBeDefined();
    expect(result.find(t => t.id === 't3')).toBeUndefined();
  });
  
  it('retourne le tableau intact si pas de touches pour ce tireur', () => {
    const touches: Touch[] = [
      { ...createMockTouch('f2', TargetZone.ZONE_A, 1), id: 't1' },
    ];
    
    const result = undoLastTouch(touches, 'f1');
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });
  
  it('retourne tableau vide si tableau vide', () => {
    const result = undoLastTouch([], 'f1');
    
    expect(result).toHaveLength(0);
  });
  
});

// ============================================================================
// Tests pour getTouchSummary
// ============================================================================

describe('getTouchSummary', () => {
  
  it('calcule le total des points', () => {
    const touches: Touch[] = [
      createMockTouch('f1', TargetZone.ZONE_A, 1),
      createMockTouch('f1', TargetZone.ZONE_B, 3),
      createMockTouch('f1', TargetZone.ZONE_C, 5),
    ];
    
    const summary = getTouchSummary(touches, 'f1');
    
    expect(summary.totalPoints).toBe(9); // 1 + 3 + 5
  });
  
  it('compte les touches par zone', () => {
    const touches: Touch[] = [
      createMockTouch('f1', TargetZone.ZONE_A, 1),
      createMockTouch('f1', TargetZone.ZONE_A, 1),
      createMockTouch('f1', TargetZone.ZONE_B, 3),
      createMockTouch('f1', TargetZone.ZONE_C, 5),
      createMockTouch('f1', TargetZone.ZONE_C, 5),
      createMockTouch('f1', TargetZone.ZONE_C, 5),
    ];
    
    const summary = getTouchSummary(touches, 'f1');
    
    expect(summary.byZone[TargetZone.ZONE_A]).toBe(2);
    expect(summary.byZone[TargetZone.ZONE_B]).toBe(1);
    expect(summary.byZone[TargetZone.ZONE_C]).toBe(3);
  });
  
  it('ignore les touches reversed', () => {
    const touches: Touch[] = [
      createMockTouch('f1', TargetZone.ZONE_C, 5, false),
      createMockTouch('f1', TargetZone.ZONE_A, 0, true),  // reversed
      createMockTouch('f1', TargetZone.ZONE_B, 0, true),  // reversed
    ];
    
    const summary = getTouchSummary(touches, 'f1');
    
    expect(summary.totalPoints).toBe(5);
    expect(summary.byZone[TargetZone.ZONE_C]).toBe(1);
    expect(summary.byZone[TargetZone.ZONE_A]).toBe(0);
    expect(summary.byZone[TargetZone.ZONE_B]).toBe(0);
  });
  
  it('filtre par tireur', () => {
    const touches: Touch[] = [
      createMockTouch('f1', TargetZone.ZONE_C, 5),
      createMockTouch('f2', TargetZone.ZONE_C, 5),
      createMockTouch('f1', TargetZone.ZONE_A, 1),
    ];
    
    const summaryF1 = getTouchSummary(touches, 'f1');
    const summaryF2 = getTouchSummary(touches, 'f2');
    
    expect(summaryF1.totalPoints).toBe(6);
    expect(summaryF2.totalPoints).toBe(5);
  });
  
  it('retourne 0 si pas de touches', () => {
    const summary = getTouchSummary([], 'f1');
    
    expect(summary.totalPoints).toBe(0);
    expect(summary.byZone[TargetZone.ZONE_A]).toBe(0);
    expect(summary.byZone[TargetZone.ZONE_B]).toBe(0);
    expect(summary.byZone[TargetZone.ZONE_C]).toBe(0);
  });
  
});

// ============================================================================
// Tests pour les constantes de style
// ============================================================================

describe('Constantes de style', () => {
  
  it('ZONE_COLORS définit les couleurs hex', () => {
    expect(ZONE_COLORS[TargetZone.ZONE_A]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ZONE_COLORS[TargetZone.ZONE_B]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ZONE_COLORS[TargetZone.ZONE_C]).toMatch(/^#[0-9a-f]{6}$/i);
  });
  
  it('ZONE_BG_CLASSES définit les classes Tailwind', () => {
    expect(ZONE_BG_CLASSES[TargetZone.ZONE_A]).toContain('bg-');
    expect(ZONE_BG_CLASSES[TargetZone.ZONE_B]).toContain('bg-');
    expect(ZONE_BG_CLASSES[TargetZone.ZONE_C]).toContain('bg-');
  });
  
});
