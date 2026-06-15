// @vitest-environment jsdom
/**
 * Tests unitaires - errorService
 * BellePoule Modern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const logError = vi.fn();
const logWarning = vi.fn();
vi.mock('../utils/errorLogger', () => ({
  logError: (...a: unknown[]) => logError(...a),
  logWarning: (...a: unknown[]) => logWarning(...a),
}));

import { ErrorService } from './errorService';

describe('ErrorService.handle', () => {
  const svc = new ErrorService();

  beforeEach(() => {
    logError.mockClear();
    logWarning.mockClear();
  });

  it('utilise logWarning pour une sévérité low', () => {
    svc.handle(new Error('soft'), 'ctx', 'low');
    expect(logWarning).toHaveBeenCalledWith('soft', 'ctx');
    expect(logError).not.toHaveBeenCalled();
  });

  it('utilise logError pour les sévérités >= medium', () => {
    const err = new Error('hard');
    svc.handle(err, 'ctx', 'high');
    expect(logError).toHaveBeenCalledWith(err, 'ctx', { severity: 'high' });
  });

  it('utilise medium par défaut', () => {
    svc.handle(new Error('x'), 'ctx');
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'ctx', { severity: 'medium' });
  });

  it('enveloppe une valeur non-Error dans une Error', () => {
    svc.handle('boom string', 'ctx', 'medium');
    const arg = logError.mock.calls[0][0];
    expect(arg).toBeInstanceOf(Error);
    expect(arg.message).toBe('boom string');
  });

  it('émet un évènement bp:critical-error en sévérité critical', () => {
    const handler = vi.fn();
    window.addEventListener('bp:critical-error', handler);
    svc.handle(new Error('fatale'), 'boot', 'critical');
    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({ message: 'fatale', context: 'boot' });
    window.removeEventListener('bp:critical-error', handler);
  });

  it('n’émet pas d’évènement pour une sévérité non critical', () => {
    const handler = vi.fn();
    window.addEventListener('bp:critical-error', handler);
    svc.handle(new Error('y'), 'ctx', 'high');
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener('bp:critical-error', handler);
  });
});
