// @vitest-environment jsdom
/**
 * Tests de composant - QRCodeShare
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QRCodeShare } from './QRCodeShare';
import { Competition } from '../../shared/types';
import { TranslationProvider } from '../contexts/TranslationContext';

const competition = { id: 'c1', title: 'Open Test' } as unknown as Competition;

beforeEach(() => {
  (window as any).electronAPI = {
    remote: { getServerInfo: vi.fn(async () => ({ success: false })) },
  };
});
afterEach(() => { delete (window as any).electronAPI; });

describe('QRCodeShare', () => {
  it('affiche le titre du mode résultats et les onglets', () => {
    render(
      <TranslationProvider>
        <QRCodeShare competition={competition} onClose={vi.fn()} />
      </TranslationProvider>
    );
    expect(screen.getByText(/Ergebnisse teilen/)).toBeInTheDocument();
    expect(screen.getByText('🏆 Ergebnisse')).toBeInTheDocument();
    expect(screen.getByText('✅ Check-in')).toBeInTheDocument();
  });

  it('affiche un message si le serveur distant n’est pas démarré', async () => {
    // TranslationProvider charge les traductions dans son propre useEffect, qui
    // s'exécute APRÈS celui de QRCodeShare (les effets des enfants se déclenchent
    // avant ceux du parent). Si QRCodeShare est monté en même temps que le
    // Provider, son effet de montage (generateQRCode) capture donc un `t` figé
    // sur des traductions encore vides, et le message d'erreur reste sur la clé
    // brute. On monte donc le Provider seul d'abord (ses traductions se chargent
    // de façon synchrone), puis QRCodeShare ensuite, pour que son premier rendu
    // voie déjà les traductions chargées.
    const { rerender } = render(<TranslationProvider>{null}</TranslationProvider>);
    rerender(
      <TranslationProvider>
        <QRCodeShare competition={competition} onClose={vi.fn()} />
      </TranslationProvider>
    );
    expect(await screen.findByText(/Remote-Server muss gestartet sein/i)).toBeInTheDocument();
  });

  it('bascule vers l’onglet pointage', () => {
    render(
      <TranslationProvider>
        <QRCodeShare competition={competition} onClose={vi.fn()} />
      </TranslationProvider>
    );
    fireEvent.click(screen.getByText('✅ Check-in'));
    expect(screen.getByText(/QR-Code für den Check-in/)).toBeInTheDocument();
  });

  it('le bouton Fermer déclenche onClose', () => {
    const onClose = vi.fn();
    render(
      <TranslationProvider>
        <QRCodeShare competition={competition} onClose={onClose} />
      </TranslationProvider>
    );
    fireEvent.click(screen.getByText('Schließen'));
    expect(onClose).toHaveBeenCalled();
  });
});
