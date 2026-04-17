/**
 * BellePoule Modern - Photo Booth Component
 * Webcam selfie capture for fencers
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { logger, LogCategory } from '@shared/services/logger';

interface PhotoBoothProps {
  onConfirm: (photoData: string) => void;
  onClose: () => void;
}

export const PhotoBooth: React.FC<PhotoBoothProps> = ({ onConfirm, onClose }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isCapturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCapturing]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      logger.error(LogCategory.UI, 'Error accessing camera', err as Error);
      alert("Impossible d'accéder à la caméra");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    let count = 3;
    setCountdown(count);
    intervalRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        takePhoto();
      }
    }, 1000);
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror the capture to match the selfie preview
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        // Resize to 300x300 with centered square crop
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = 300;
        outputCanvas.height = 300;
        const outCtx = outputCanvas.getContext('2d');
        if (outCtx) {
          const side = Math.min(canvas.width, canvas.height);
          const sx = (canvas.width - side) / 2;
          const sy = (canvas.height - side) / 2;
          outCtx.drawImage(canvas, sx, sy, side, side, 0, 0, 300, 300);
          const photoData = outputCanvas.toDataURL('image/jpeg', 0.8);
          setPhoto(photoData);
          stopCamera();
        }
      }
    }
  };

  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  return (
    <div>
      {!isCapturing && !photo && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px',
            }}
          >
            📷
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={startCamera}>
              Démarrer la caméra
            </button>
          </div>
        </div>
      )}

      {isCapturing && (
        <div style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              borderRadius: '8px',
              transform: 'scaleX(-1)',
            }}
          />

          {countdown > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '100px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {countdown}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={capturePhoto}
              disabled={countdown > 0}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {countdown > 0 ? `${countdown}…` : '📸 Capturer'}
            </button>
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="btn btn-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {photo && (
        <div style={{ textAlign: 'center' }}>
          <img
            src={photo}
            alt="Aperçu"
            style={{
              width: '100%',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={retake} className="btn btn-secondary">
              Recommencer
            </button>
            <button onClick={() => onConfirm(photo)} className="btn btn-primary">
              Utiliser cette photo
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PhotoBooth;
