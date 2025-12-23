'use client';

import { useCallback, useState, useRef, useEffect } from 'react';

interface Props {
  onImageSelect: (imageB64: string) => void;
  currentImage: string | null;
  annotations?: { coordinate?: [number, number]; bbox_2d?: [number, number, number, number] };
  enableBboxDraw?: boolean;
  // Multi-bbox support
  drawnBboxes?: ([number, number, number, number] | null)[];
  activeBboxIndex?: 0 | 1;
  onBboxChange?: (bbox: [number, number, number, number] | null) => void;
  onBboxSelect?: (idx: 0 | 1) => void;
  // SAM masks - array of 2D boolean arrays, positioned within active bbox
  samMasks?: boolean[][][];
  // SAM detected boxes [x1, y1, x2, y2] in pixel coords relative to cropped region
  samBoxes?: number[][];
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

export function ImageDropzone({ onImageSelect, currentImage, annotations, enableBboxDraw, drawnBboxes = [null, null], activeBboxIndex = 0, onBboxChange, onBboxSelect, samMasks, samBoxes }: Props) {
  // Get active bbox for drawing
  const drawnBbox = drawnBboxes[activeBboxIndex];
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number } | null>(null);
  const [maskImageUrl, setMaskImageUrl] = useState<string | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'top' | 'right' | 'bottom' | 'left' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [hoverEdge, setHoverEdge] = useState<'top' | 'right' | 'bottom' | 'left' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Edge detection threshold in RU coordinates
  const EDGE_THRESHOLD = 20;

  // Convert SAM mask array to canvas image URL
  useEffect(() => {
    if (!samMasks || samMasks.length === 0 || !samMasks[0] || samMasks[0].length === 0) {
      setMaskImageUrl(null);
      return;
    }

    // Take first mask (most confident)
    const mask = samMasks[0];
    const height = mask.length;
    const width = mask[0]?.length || 0;
    if (width === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isMasked = mask[y]?.[x];
        if (isMasked) {
          // Purple/magenta with 50% opacity
          imageData.data[idx] = 168;     // R
          imageData.data[idx + 1] = 85;  // G
          imageData.data[idx + 2] = 247; // B
          imageData.data[idx + 3] = 128; // A (50%)
        } else {
          imageData.data[idx + 3] = 0;   // Fully transparent
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    setMaskImageUrl(canvas.toDataURL());
  }, [samMasks]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageDimensions(null); // Reset dimensions until new image loads
      onImageSelect(result);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

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

  // Convert mouse position to RU coordinates (0-1000), clamped to image bounds
  const getRelativePosition = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const container = imageContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000);
    // Clamp to image bounds
    return { x: Math.max(0, Math.min(1000, x)), y: Math.max(0, Math.min(1000, y)) };
  }, []);

  // Detect which edge/corner the mouse is near
  const detectEdge = useCallback((pos: { x: number; y: number }, bbox: [number, number, number, number]): typeof hoverEdge => {
    const [x1, y1, x2, y2] = bbox;
    const nearLeft = Math.abs(pos.x - x1) < EDGE_THRESHOLD;
    const nearRight = Math.abs(pos.x - x2) < EDGE_THRESHOLD;
    const nearTop = Math.abs(pos.y - y1) < EDGE_THRESHOLD;
    const nearBottom = Math.abs(pos.y - y2) < EDGE_THRESHOLD;
    const inXRange = pos.x >= x1 - EDGE_THRESHOLD && pos.x <= x2 + EDGE_THRESHOLD;
    const inYRange = pos.y >= y1 - EDGE_THRESHOLD && pos.y <= y2 + EDGE_THRESHOLD;

    // Corners first (higher priority)
    if (nearTop && nearLeft) return 'tl';
    if (nearTop && nearRight) return 'tr';
    if (nearBottom && nearLeft) return 'bl';
    if (nearBottom && nearRight) return 'br';
    // Edges
    if (nearTop && inXRange) return 'top';
    if (nearBottom && inXRange) return 'bottom';
    if (nearLeft && inYRange) return 'left';
    if (nearRight && inYRange) return 'right';
    return null;
  }, [EDGE_THRESHOLD]);

  // Get cursor style based on edge
  const getCursorStyle = useCallback((edge: typeof hoverEdge): string => {
    switch (edge) {
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      case 'tl':
      case 'br':
        return 'nwse-resize';
      case 'tr':
      case 'bl':
        return 'nesw-resize';
      default:
        return 'crosshair';
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableBboxDraw || !currentImage) return;
    const pos = getRelativePosition(e);

    // Check if clicking on an edge of existing bbox
    if (drawnBbox) {
      const edge = detectEdge(pos, drawnBbox);
      if (edge) {
        setResizeEdge(edge);
        return;
      }
    }

    // Start new draw
    setIsDrawing(true);
    setDrawStart(pos);
    setCurrentDraw(pos);
  }, [enableBboxDraw, currentImage, getRelativePosition, drawnBbox, detectEdge]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelativePosition(e);

    // Handle edge resize
    if (resizeEdge && drawnBbox) {
      const [x1, y1, x2, y2] = drawnBbox;
      let newBbox: [number, number, number, number] = [x1, y1, x2, y2];

      switch (resizeEdge) {
        case 'left':
          newBbox = [Math.min(pos.x, x2 - 20), y1, x2, y2];
          break;
        case 'right':
          newBbox = [x1, y1, Math.max(pos.x, x1 + 20), y2];
          break;
        case 'top':
          newBbox = [x1, Math.min(pos.y, y2 - 20), x2, y2];
          break;
        case 'bottom':
          newBbox = [x1, y1, x2, Math.max(pos.y, y1 + 20)];
          break;
        case 'tl':
          newBbox = [Math.min(pos.x, x2 - 20), Math.min(pos.y, y2 - 20), x2, y2];
          break;
        case 'tr':
          newBbox = [x1, Math.min(pos.y, y2 - 20), Math.max(pos.x, x1 + 20), y2];
          break;
        case 'bl':
          newBbox = [Math.min(pos.x, x2 - 20), y1, x2, Math.max(pos.y, y1 + 20)];
          break;
        case 'br':
          newBbox = [x1, y1, Math.max(pos.x, x1 + 20), Math.max(pos.y, y1 + 20)];
          break;
      }
      onBboxChange?.(newBbox);
      return;
    }

    // Update hover cursor for existing bbox
    if (drawnBbox && enableBboxDraw && !isDrawing) {
      const edge = detectEdge(pos, drawnBbox);
      setHoverEdge(edge);
    }

    // Handle drawing
    if (isDrawing) {
      setCurrentDraw(pos);
    }
  }, [resizeEdge, drawnBbox, onBboxChange, enableBboxDraw, isDrawing, getRelativePosition, detectEdge]);

  const handleMouseUp = useCallback(() => {
    // Finish resize
    if (resizeEdge) {
      setResizeEdge(null);
      return;
    }

    // Finish drawing
    if (!isDrawing || !drawStart || !currentDraw) {
      setIsDrawing(false);
      return;
    }
    // Create bbox in format [x1, y1, x2, y2]
    const x1 = Math.min(drawStart.x, currentDraw.x);
    const y1 = Math.min(drawStart.y, currentDraw.y);
    const x2 = Math.max(drawStart.x, currentDraw.x);
    const y2 = Math.max(drawStart.y, currentDraw.y);
    // Only save if box has some size
    if (x2 - x1 > 10 && y2 - y1 > 10) {
      onBboxChange?.([x1, y1, x2, y2]);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw(null);
  }, [resizeEdge, isDrawing, drawStart, currentDraw, onBboxChange]);

  const clearBbox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onBboxChange?.(null);
  }, [onBboxChange]);

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
          <div className="flex flex-col items-center group">
            {/* Inline-block wrapper shrinks to image size for accurate coordinate positioning */}
            <div
              ref={imageContainerRef}
              className="relative inline-block"
              style={{ cursor: enableBboxDraw ? getCursorStyle(hoverEdge) : 'default' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt="Uploaded"
                className="max-w-full max-h-[600px] rounded block select-none"
                draggable={false}
                onLoad={handleImageLoad}
              />
              {/* Magnify button */}
              <button
                onClick={openFullscreen}
                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                title="View fullscreen (ESC to close)"
              >
                <MagnifyIcon className="w-5 h-5" />
              </button>
              {/* Clear bbox button */}
              {enableBboxDraw && drawnBbox && (
                <button
                  onClick={clearBbox}
                  className="absolute top-2 left-2 px-2 py-1 bg-red-500/80 hover:bg-red-500 rounded text-white text-xs font-medium z-10"
                  title="Clear selection"
                >
                  Clear
                </button>
              )}
              {/* Drawing indicator */}
              {enableBboxDraw && !drawnBbox && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500/80 rounded text-white text-xs">
                  Draw box to crop region
                </div>
              )}
              {/* Coordinate dot - RU coords (0-1000) convert to percentages */}
              {annotations?.coordinate && (
                <div
                  className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg pointer-events-none"
                  style={{
                    left: `${annotations.coordinate[0] / 10}%`,
                    top: `${annotations.coordinate[1] / 10}%`,
                  }}
                />
              )}
              {/* Response bounding box */}
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
              {/* User-drawn bboxes (up to 2) */}
              {drawnBboxes.map((bbox, idx) => bbox && (
                <div
                  key={idx}
                  className={`absolute border-2 ${idx === 0 ? 'border-blue-400 bg-blue-400/20' : 'border-green-400 bg-green-400/20'} ${activeBboxIndex === idx ? 'border-solid' : 'border-dashed opacity-60'}`}
                  style={{
                    left: `${bbox[0] / 10}%`,
                    top: `${bbox[1] / 10}%`,
                    width: `${(bbox[2] - bbox[0]) / 10}%`,
                    height: `${(bbox[3] - bbox[1]) / 10}%`,
                  }}
                >
                  {/* Clickable label */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBboxSelect?.(idx as 0 | 1);
                    }}
                    className={`absolute -top-6 left-0 px-2 py-0.5 text-xs font-bold rounded ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'} cursor-pointer hover:opacity-80`}
                  >
                    {idx + 1}
                  </button>
                </div>
              ))}
              {/* Drawing preview */}
              {isDrawing && drawStart && currentDraw && (
                <div
                  className="absolute border-2 border-dashed border-blue-400 bg-blue-400/10 pointer-events-none"
                  style={{
                    left: `${Math.min(drawStart.x, currentDraw.x) / 10}%`,
                    top: `${Math.min(drawStart.y, currentDraw.y) / 10}%`,
                    width: `${Math.abs(currentDraw.x - drawStart.x) / 10}%`,
                    height: `${Math.abs(currentDraw.y - drawStart.y) / 10}%`,
                  }}
                />
              )}
              {/* SAM mask overlay - positioned within drawnBbox or full image */}
              {maskImageUrl && (
                <img
                  src={maskImageUrl}
                  alt="Segmentation mask"
                  className="absolute pointer-events-none"
                  style={drawnBbox ? {
                    left: `${drawnBbox[0] / 10}%`,
                    top: `${drawnBbox[1] / 10}%`,
                    width: `${(drawnBbox[2] - drawnBbox[0]) / 10}%`,
                    height: `${(drawnBbox[3] - drawnBbox[1]) / 10}%`,
                  } : {
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
              {/* SAM detected boxes - render within drawnBbox region */}
              {samBoxes && samBoxes.length > 0 && samMasks?.[0] && (() => {
                // Get cropped image dimensions from mask
                const maskHeight = samMasks[0].length;
                const maskWidth = samMasks[0][0]?.length || 1;
                const bboxWidth = drawnBbox ? (drawnBbox[2] - drawnBbox[0]) : 1000;
                const bboxHeight = drawnBbox ? (drawnBbox[3] - drawnBbox[1]) : 1000;
                const bboxLeft = drawnBbox ? drawnBbox[0] : 0;
                const bboxTop = drawnBbox ? drawnBbox[1] : 0;

                return samBoxes.map((box, idx) => {
                  // box is [x1, y1, x2, y2] in pixel coords of cropped image
                  const x1 = bboxLeft + (box[0] / maskWidth) * bboxWidth;
                  const y1 = bboxTop + (box[1] / maskHeight) * bboxHeight;
                  const x2 = bboxLeft + (box[2] / maskWidth) * bboxWidth;
                  const y2 = bboxTop + (box[3] / maskHeight) * bboxHeight;
                  return (
                    <div
                      key={idx}
                      className="absolute border-2 border-yellow-400 bg-yellow-400/20 pointer-events-none"
                      style={{
                        left: `${x1 / 10}%`,
                        top: `${y1 / 10}%`,
                        width: `${(x2 - x1) / 10}%`,
                        height: `${(y2 - y1) / 10}%`,
                      }}
                    />
                  );
                });
              })()}
            </div>
            {/* Image dimensions - fixed height to avoid CLS */}
            <div className="h-5 mt-2 text-xs text-[var(--muted)] font-mono">
              {imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px` : '\u00A0'}
            </div>
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
            className="relative inline-block max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt="Fullscreen view"
              className="max-w-full max-h-[95vh] object-contain rounded-lg block"
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
