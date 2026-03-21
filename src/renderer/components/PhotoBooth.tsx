/**
 * BellePoule Modern - Photo Booth Component
 * Fun photo capture for fencers
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useCallback } from 'react';

interface PhotoBoothProps {
  fencerName: string;
  onPhotoCapture: (photoData: string) => void;
}

export const PhotoBooth: React.FC<PhotoBoothProps> = ({ fencerName, onPhotoCapture }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string>('none');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const overlays = [
    { id: 'none', label: 'Aucun', icon: '✨' },
    { id: 'champion', label: 'Champion', icon: '🏆' },
    { id: 'gold', label: 'Or', icon: '🥇' },
    { id: 'fencing', label: 'Escrime', icon: '🤺' },
    { id: 'cool', label: 'Cool', icon: '😎' },
  ];

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
      console.error('Error accessing camera:', err);
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
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          takePhoto();
          return 0;
        }
        return prev - 1;
      });
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
        ctx.drawImage(video, 0, 0);

        // Add overlay
        addOverlay(ctx, canvas.width, canvas.height);

        const photoData = canvas.toDataURL('image/jpeg', 0.9);
        setPhoto(photoData);
        onPhotoCapture(photoData);
        stopCamera();
      }
    }
  };

  const addOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';

    switch (selectedOverlay) {
      case 'champion':
        ctx.fillText('🏆', width / 2, height / 3);
        break;
      case 'gold':
        ctx.fillText('🥇', width / 2, height / 3);
        break;
      case 'fencing':
        ctx.fillText('🤺', width / 2, height / 3);
        break;
      case 'cool':
        ctx.fillText('😎', width / 2, height / 3);
        break;
    }

    // Add name
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(fencerName || 'Tireur', width / 2, height - 40);
    ctx.shadowBlur = 0;
  };

  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <h2 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '24px' }}>
        📸 Photo Booth
      </h2>

      {!isCapturing && !photo && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px',
            }}
          >
            📷
          </div>
          <button
            onClick={startCamera}
            style={{
              padding: '16px 32px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📸 Prendre une photo
          </button>
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
              borderRadius: '12px',
              transform: 'scaleX(-1)', // Mirror effect
            }}
          />

          {countdown > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '120px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                animation: 'pulse 1s infinite',
              }}
            >
              {countdown}
            </div>
          )}

          {/* Overlay selector */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}
          >
            {overlays.map(overlay => (
              <button
                key={overlay.id}
                onClick={() => setSelectedOverlay(overlay.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border:
                    selectedOverlay === overlay.id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  backgroundColor: selectedOverlay === overlay.id ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {overlay.icon} {overlay.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={capturePhoto}
              disabled={countdown > 0}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: countdown > 0 ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: countdown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {countdown > 0 ? '⏳ ...' : '📸 Capturer'}
            </button>
            <button
              onClick={stopCamera}
              style={{
                padding: '16px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {photo && (
        <div style={{ textAlign: 'center' }}>
          <img
            src={photo}
            alt="Captured"
            style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={retake}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              🔄 Recommencer
            </button>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `${fencerName || 'photo'}.jpg`;
                link.href = photo;
                link.click();
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              💾 Télécharger
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PhotoBooth;
