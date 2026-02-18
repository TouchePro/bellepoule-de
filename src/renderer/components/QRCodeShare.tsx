/**
 * BellePoule Modern - QR Code Share Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Competition } from '../../shared/types';

interface QRCodeShareProps {
  competition: Competition;
  onClose: () => void;
}

export const QRCodeShare: React.FC<QRCodeShareProps> = ({ competition, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      // Créer une URL unique pour la compétition
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/competition/${competition.id}/results`;
      setShareUrl(url);

      // Essayer d'utiliser l'API QR Code si disponible
      if (typeof window !== 'undefined') {
        // Générer un QR code simple avec une API externe (pas besoin de librairie)
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

        // Créer une image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Dessiner le QR code
              ctx.drawImage(img, 0, 0, 300, 300);

              // Ajouter un logo au centre (optionnel)
              drawLogo(ctx, 300, 300);

              setQrCodeUrl(canvas.toDataURL('image/png'));
              setIsGenerating(false);
            }
          }
        };

        img.onerror = () => {
          // Fallback : générer un QR code manuellement simple
          generateManualQRCode(url);
        };

        img.src = qrApiUrl;
      }
    } catch (err) {
      console.error('Erreur génération QR:', err);
      setError('Erreur lors de la génération du QR code');
      setIsGenerating(false);
    }
  };

  const drawLogo = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Dessiner un cercle blanc au centre pour le logo
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 35;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ajouter le texte BP
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#3B82F6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BP', centerX, centerY);
  };

  const generateManualQRCode = (url: string) => {
    // Fallback simple si l'API échoue
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fond blanc
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 300, 300);

        // Bordure
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 300, 300);

        // Texte
        ctx.font = '16px Arial';
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code non disponible', 150, 130);
        ctx.fillText("Utilisez l'URL ci-dessous", 150, 160);

        setQrCodeUrl(canvas.toDataURL('image/png'));
      }
    }
    setIsGenerating(false);
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
              Scannez ce QR code pour accéder aux résultats de la compétition
              <strong>"{competition.title}"</strong>
            </p>

            <div className="qrcode__image-container">
              {isGenerating ? (
                <div className="qrcode__loading">
                  <div className="spinner" />
                  <p>Génération du QR code...</p>
                </div>
              ) : error ? (
                <div className="alert alert--error">{error}</div>
              ) : (
                <canvas ref={canvasRef} width={300} height={300} className="qrcode__canvas" />
              )}
            </div>

            <div className="qrcode__url">
              <label className="form-label">URL de partage :</label>
              <div className="qrcode__url-input">
                <input type="text" value={shareUrl} readOnly className="form-control" />
                <button className="btn btn-secondary" onClick={copyToClipboard}>
                  📋 Copier
                </button>
              </div>
            </div>

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
