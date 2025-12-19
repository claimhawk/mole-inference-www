'use client';

import { useCallback, useState, useRef, useEffect } from 'react';

interface Props {
  onImageSelect: (imageB64: string) => void;
  currentImage: string | null;
  annotations?: { coordinate?: [number, number]; bbox_2d?: [number, number, number, number] };
}

export function ImageDropzone({ onImageSelect, currentImage, annotations }: Props) {
  const [isDragging, setIsDragging] = useState(false);
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
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage}
            alt="Uploaded"
            className="max-w-full max-h-[400px] rounded mx-auto"
          />
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
  );
}
