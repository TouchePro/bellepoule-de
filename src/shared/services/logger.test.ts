/**
 * Tests unitaires - logger (singleton)
 * BellePoule Modern
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogLevel, LogCategory } from './logger';

// Silence la sortie console pendant les tests
beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  logger.clear();
  logger.setMinLevel(LogLevel.DEBUG);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger - enregistrement', () => {
  it('enregistre une entrée par appel', () => {
    logger.info(LogCategory.UI, 'bonjour');
    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('bonjour');
    expect(entries[0].category).toBe(LogCategory.UI);
    expect(entries[0].level).toBe(LogLevel.INFO);
  });

  it('conserve l’erreur passée à error()', () => {
    const err = new Error('boom');
    logger.error(LogCategory.SYSTEM, 'échec', err);
    expect(logger.getEntries()[0].error).toBe(err);
  });
});

describe('logger - filtrage par niveau minimal', () => {
  it('ignore les niveaux inférieurs au minimum', () => {
    logger.setMinLevel(LogLevel.WARN);
    logger.debug(LogCategory.UI, 'debug');
    logger.info(LogCategory.UI, 'info');
    logger.warn(LogCategory.UI, 'warn');
    logger.error(LogCategory.UI, 'error');
    expect(logger.getEntries()).toHaveLength(2); // warn + error
  });
});

describe('logger - getEntries', () => {
  it('filtre par niveau seuil', () => {
    logger.debug(LogCategory.UI, 'd');
    logger.warn(LogCategory.UI, 'w');
    logger.error(LogCategory.UI, 'e');
    expect(logger.getEntries(LogLevel.WARN)).toHaveLength(2);
  });

  it('filtre par catégorie', () => {
    logger.info(LogCategory.UI, 'ui');
    logger.info(LogCategory.DATABASE, 'db');
    expect(logger.getEntries(undefined, LogCategory.DATABASE)).toHaveLength(1);
    expect(logger.getEntries(undefined, LogCategory.DATABASE)[0].message).toBe('db');
  });
});

describe('logger - clear / export', () => {
  it('vide les entrées', () => {
    logger.info(LogCategory.UI, 'x');
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it('exporte un JSON parsable des entrées', () => {
    logger.info(LogCategory.UI, 'exp');
    const parsed = JSON.parse(logger.export());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].message).toBe('exp');
  });
});
