// @vitest-environment jsdom
/**
 * Tests de composant - ErrorBoundary
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Boom: React.FC = () => {
  throw new Error('explosion');
};

beforeEach(() => {
  // les ErrorBoundary loggent l'erreur via console.error
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('rend les enfants quand il n’y a pas d’erreur', () => {
    render(
      <ErrorBoundary>
        <div>contenu normal</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('contenu normal')).toBeInTheDocument();
  });

  it('affiche l’UI par défaut quand un enfant lève une erreur', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
  });

  it('affiche le fallback personnalisé s’il est fourni', () => {
    render(
      <ErrorBoundary fallback={<div>repli perso</div>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('repli perso')).toBeInTheDocument();
  });
});
