'use client';

import { useCallback, useState, useRef, useEffect } from 'react';

interface Props {
  onImageSelect: (imageB64: string) => void;
  currentImage: string | null;
  annotations?: { coordinate?: [number, number]; bbox_2d?: [number, number, number, number] };
}

function MagnifyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

export function ImageDropzone({ onImageSelect, currentImage, annotations }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageSelect(result);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!currentImage) {
      fileInputRef.current?.click();
    }
  }, [currentImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const openFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        closeFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, closeFullscreen]);

  // Prevent browser default drag behavior globally
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg transition-all
          ${isDragging ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--card-border)]'}
          ${currentImage ? 'p-3' : 'p-10 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {currentImage ? (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt="Uploaded"
              className="max-w-full max-h-[400px] rounded mx-auto"
            />
            {/* Magnify button */}
            <button
              onClick={openFullscreen}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="View fullscreen (ESC to close)"
            >
              <MagnifyIcon className="w-5 h-5" />
            </button>
            {/* Coordinate dot */}
            {annotations?.coordinate && (
              <div
                className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg pointer-events-none"
                style={{
                  left: `${annotations.coordinate[0] / 10}%`,
                  top: `${annotations.coordinate[1] / 10}%`,
                }}
              />
            )}
            {/* Bounding box */}
            {annotations?.bbox_2d && (
              <div
                className="absolute border-2 border-green-400 bg-green-400/10 pointer-events-none"
                style={{
                  left: `${annotations.bbox_2d[0] / 10}%`,
                  top: `${annotations.bbox_2d[1] / 10}%`,
                  width: `${(annotations.bbox_2d[2] - annotations.bbox_2d[0]) / 10}%`,
                  height: `${(annotations.bbox_2d[3] - annotations.bbox_2d[1]) / 10}%`,
                }}
              />
            )}
          </div>
        ) : (
          <div className="text-center text-[var(--muted)]">
            <p className="mb-2">
              <span className="text-[var(--primary)] font-medium">Drop image here</span>
              {' '}or click to browse
            </p>
            <p className="text-xs">PNG, JPG, WebP supported</p>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={closeFullscreen}
        >
          <div className="absolute top-4 right-4 text-white/60 text-sm">
            Press ESC or click to close
          </div>

          <div
            className="relative max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt="Fullscreen view"
              className="max-w-full max-h-[95vh] object-contain rounded-lg"
            />
            {annotations?.coordinate && (
              <div
                className="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg pointer-events-none"
                style={{
                  left: `${annotations.coordinate[0] / 10}%`,
                  top: `${annotations.coordinate[1] / 10}%`,
                }}
              />
            )}
            {annotations?.bbox_2d && (
              <div
                className="absolute border-2 border-green-400 bg-green-400/10 pointer-events-none"
                style={{
                  left: `${annotations.bbox_2d[0] / 10}%`,
                  top: `${annotations.bbox_2d[1] / 10}%`,
                  width: `${(annotations.bbox_2d[2] - annotations.bbox_2d[0]) / 10}%`,
                  height: `${(annotations.bbox_2d[3] - annotations.bbox_2d[1]) / 10}%`,
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
