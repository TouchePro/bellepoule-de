/**
 * BellePoule Modern - Fencer Photo Management
 * Component for uploading and displaying fencer photos
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useCallback } from 'react';

interface FencerPhotoProps {
  photo?: string;
  firstName: string;
  lastName: string;
  onPhotoChange?: (photoBase64: string | undefined) => void;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
}

export const FencerPhoto: React.FC<FencerPhotoProps> = ({
  photo,
  firstName,
  lastName,
  onPhotoChange,
  size = 'medium',
  editable = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    small: 'w-10 h-10 text-xs',
    medium: 'w-16 h-16 text-sm',
    large: 'w-24 h-24 text-base',
  };

  const getInitials = () => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  const resizeImage = (
    file: File,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with JPEG compression
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("L'image ne doit pas dépasser 5 Mo");
        return;
      }

      setIsLoading(true);
      try {
        const base64 = await resizeImage(file);
        onPhotoChange?.(base64);
      } catch (error) {
        console.error('Error processing image:', error);
        alert("Erreur lors du traitement de l'image");
      } finally {
        setIsLoading(false);
      }
    },
    [onPhotoChange]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Veuillez déposer une image valide');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("L'image ne doit pas dépasser 5 Mo");
        return;
      }

      setIsLoading(true);
      try {
        const base64 = await resizeImage(file);
        onPhotoChange?.(base64);
      } catch (error) {
        console.error('Error processing image:', error);
        alert("Erreur lors du traitement de l'image");
      } finally {
        setIsLoading(false);
      }
    },
    [onPhotoChange]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    onPhotoChange?.(undefined);
  }, [onPhotoChange]);

  return (
    <div className="relative inline-block">
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full overflow-hidden cursor-pointer
          flex items-center justify-center
          transition-all duration-200
          ${isDragging ? 'ring-4 ring-blue-400 scale-105' : ''}
          ${editable ? 'hover:ring-2 hover:ring-blue-300' : ''}
          ${photo ? '' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold'}
        `}
        onClick={() => editable && fileInputRef.current?.click()}
        onDrop={editable ? handleDrop : undefined}
        onDragOver={editable ? handleDragOver : undefined}
        onDragLeave={editable ? handleDragLeave : undefined}
        title={editable ? 'Cliquer ou glisser-déposer une photo' : ''}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-1/2 w-1/2 border-2 border-white border-t-transparent" />
        ) : photo ? (
          <img
            src={photo}
            alt={`${firstName} ${lastName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials()}</span>
        )}
      </div>

      {editable && photo && (
        <button
          onClick={e => {
            e.stopPropagation();
            handleRemovePhoto();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
          title="Supprimer la photo"
        >
          ×
        </button>
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center pointer-events-none">
          <span className="text-blue-700 text-xs font-medium">Déposer ici</span>
        </div>
      )}
    </div>
  );
};

export default FencerPhoto;
