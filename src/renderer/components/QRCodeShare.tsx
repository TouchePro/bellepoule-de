/**
 * BellePoule Modern - QR Code Share Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Competition } from '../../shared/types';
import { useTranslation } from '../hooks/useTranslation';

interface QRCodeShareProps {
  competition: Competition;
  onClose: () => void;
}

export const QRCodeShare: React.FC<QRCodeShareProps> = ({ competition, onClose }) => {
  const { t } = useTranslation();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition.id]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const info = await window.electronAPI.remote.getServerInfo();
      if (!info.success || !info.serverInfo) {
        setError(t('qrcode.server_not_running'));
        setIsGenerating(false);
        return;
      }

      const url = `${info.serverInfo.url}/competition/${competition.id}/results`;
      setShareUrl(url);

      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });
      setQrCodeUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
      setError(t('qrcode.generation_error'));
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
      alert(t('qrcode.copy_success'));
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">📱 {t('qrcode.title')}</h2>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal__body">
          <div className="qrcode__container">
            <p className="qrcode__description">
              {t('qrcode.description')}{' '}
              <strong>"{competition.title}"</strong>
            </p>

            <div className="qrcode__image-container">
              {isGenerating ? (
                <div className="qrcode__loading">
                  <div className="spinner" />
                  <p>{t('qrcode.loading')}</p>
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
                <label className="form-label">{t('qrcode.url_label')}</label>
                <div className="qrcode__url-input">
                  <input type="text" value={shareUrl} readOnly className="form-control" />
                  <button className="btn btn-secondary" onClick={copyToClipboard}>
                    📋 {t('qrcode.copy')}
                  </button>
                </div>
              </div>
            )}

            <div className="qrcode__info">
              <div className="alert alert--info">
                <strong>💡 {t('qrcode.how_to_use')}</strong>
                <ul>
                  <li>{t('qrcode.hint_scan')}</li>
                  <li>{t('qrcode.hint_copy')}</li>
                  <li>{t('qrcode.hint_spectators')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('actions.close')}
          </button>
          <button
            className="btn btn-primary"
            onClick={downloadQRCode}
            disabled={!qrCodeUrl || isGenerating}
          >
            💾 {t('qrcode.download')}
          </button>
        </div>
      </div>
    </div>
  );
};
