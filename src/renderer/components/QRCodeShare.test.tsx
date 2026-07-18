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

const competition = { id: 'c1', title: 'Open Test' } as unknown as Competition;

beforeEach(() => {
  (window as any).electronAPI = {
    remote: { getServerInfo: vi.fn(async () => ({ success: false })) },
  };
});
afterEach(() => { delete (window as any).electronAPI; });

describe('QRCodeShare', () => {
  it('affiche le titre du mode résultats et les onglets', () => {
    render(<QRCodeShare competition={competition} onClose={vi.fn()} />);
    expect(screen.getByText(/Ergebnisse teilen/)).toBeInTheDocument();
    expect(screen.getByText('🏆 Ergebnisse')).toBeInTheDocument();
    expect(screen.getByText('✅ Check-in')).toBeInTheDocument();
  });

  it('affiche un message si le serveur distant n’est pas démarré', async () => {
    render(<QRCodeShare competition={competition} onClose={vi.fn()} />);
    expect(await screen.findByText(/Remote-Server muss gestartet sein/i)).toBeInTheDocument();
  });

  it('bascule vers l’onglet pointage', () => {
    render(<QRCodeShare competition={competition} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('✅ Check-in'));
    expect(screen.getByText(/QR-Code für den Check-in/)).toBeInTheDocument();
  });

  it('le bouton Fermer déclenche onClose', () => {
    const onClose = vi.fn();
    render(<QRCodeShare competition={competition} onClose={onClose} />);
    fireEvent.click(screen.getByText('Schließen'));
    expect(onClose).toHaveBeenCalled();
  });
});
