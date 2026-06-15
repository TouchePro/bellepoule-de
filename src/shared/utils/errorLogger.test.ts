// @vitest-environment jsdom
/**
 * Tests unitaires - errorLogger
 * BellePoule Modern
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  logError,
  logWarning,
  logInfo,
  getErrorLogs,
  clearErrorLogs,
  getErrorStats,
  exportLogs,
} from './errorLogger';

beforeEach(() => {
  localStorage.clear();
});

describe('logError / getErrorLogs', () => {
  it('persiste une erreur avec message et stack', () => {
    logError(new Error('boom'), 'MonComposant', { foo: 1 });
    const logs = getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('boom');
    expect(logs[0].component).toBe('MonComposant');
    expect(logs[0].context).toEqual({ foo: 1 });
    expect(logs[0].timestamp).toBeInstanceOf(Date);
  });

  it('accepte une chaîne en entrée (sans stack)', () => {
    logError('texte erreur');
    const logs = getErrorLogs();
    expect(logs[0].message).toBe('texte erreur');
    expect(logs[0].stack).toBeUndefined();
  });
});

describe('logWarning / logInfo', () => {
  it('enregistre les niveaux warn et info', () => {
    logWarning('attention');
    logInfo('pour info');
    const levels = getErrorLogs().map(l => l.level);
    expect(levels).toEqual(['warn', 'info']);
  });
});

describe('getErrorStats', () => {
  it('compte par niveau et liste les récents', () => {
    logError(new Error('e1'));
    logError(new Error('e2'));
    logWarning('w1');
    logInfo('i1');
    const stats = getErrorStats();
    expect(stats.total).toBe(4);
    expect(stats.errors).toBe(2);
    expect(stats.warnings).toBe(1);
    expect(stats.infos).toBe(1);
    expect(stats.recent).toHaveLength(4); // tous < 24h
  });
});

describe('clearErrorLogs', () => {
  it('supprime tous les logs', () => {
    logError(new Error('x'));
    clearErrorLogs();
    expect(getErrorLogs()).toHaveLength(0);
  });
});

describe('exportLogs', () => {
  it('exporte un JSON parsable', () => {
    logInfo('exp');
    const parsed = JSON.parse(exportLogs());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].message).toBe('exp');
  });
});

describe('trim à 100 entrées', () => {
  it('ne conserve que les 100 dernières', () => {
    for (let i = 0; i < 120; i++) logInfo(`msg-${i}`);
    const logs = getErrorLogs();
    expect(logs).toHaveLength(100);
    expect(logs[logs.length - 1].message).toBe('msg-119');
    expect(logs[0].message).toBe('msg-20');
  });
});
