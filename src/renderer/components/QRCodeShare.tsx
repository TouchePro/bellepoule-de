/**
 * BellePoule Modern - QR Code Share Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Competition } from '../../shared/types';

interface QRCodeShareProps {
  competition: Competition;
  onClose: () => void;
}

export const QRCodeShare: React.FC<QRCodeShareProps> = ({ competition, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [competition]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const info = await window.electronAPI.remote.getServerInfo();
      if (!info.success || !info.serverInfo) {
        setError(
          'Le serveur distant doit être démarré pour partager les résultats.\nActivez la saisie distante depuis l\'onglet correspondant.'
        );
        setIsGenerating(false);
        return;
      }

      const url = `${info.serverInfo.url}/competition/${competition.id}/results`;
      setShareUrl(url);

      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });
      setQrCodeUrl(dataUrl);
    } catch (err) {
      console.error('Erreur génération QR:', err);
      setError('Erreur lors de la génération du QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `qrcode-${competition.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('URL copiée dans le presse-papier !');
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">📱 Partager les résultats</h2>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal__body">
          <div className="qrcode__container">
            <p className="qrcode__description">
              Scannez ce QR code pour accéder aux résultats de la compétition{' '}
              <strong>"{competition.title}"</strong>
            </p>

            <div className="qrcode__image-container">
              {isGenerating ? (
                <div className="qrcode__loading">
                  <div className="spinner" />
                  <p>Génération du QR code...</p>
                </div>
              ) : error ? (
                <div className="alert alert--error" style={{ whiteSpace: 'pre-line' }}>
                  {error}
                </div>
              ) : (
                <img src={qrCodeUrl} alt="QR Code" className="qrcode__canvas" width={300} height={300} />
              )}
            </div>

            {!error && shareUrl && (
              <div className="qrcode__url">
                <label className="form-label">URL de partage :</label>
                <div className="qrcode__url-input">
                  <input type="text" value={shareUrl} readOnly className="form-control" />
                  <button className="btn btn-secondary" onClick={copyToClipboard}>
                    📋 Copier
                  </button>
                </div>
              </div>
            )}

            <div className="qrcode__info">
              <div className="alert alert--info">
                <strong>💡 Comment utiliser :</strong>
                <ul>
                  <li>Scannez le QR code avec votre smartphone</li>
                  <li>ou copiez l'URL pour la partager</li>
                  <li>Les spectateurs peuvent voir les résultats en temps réel</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
          <button
            className="btn btn-primary"
            onClick={downloadQRCode}
            disabled={!qrCodeUrl || isGenerating}
          >
            💾 Télécharger le QR Code
          </button>
        </div>
      </div>
    </div>
  );
};
