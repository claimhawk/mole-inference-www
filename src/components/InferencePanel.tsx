'use client';

import { useState, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { ImageDropzone } from './ImageDropzone';
import { ServerStatus } from './ServerStatus';
import { runInference, parseToolCall } from '@/lib/api';
import { MODEL_TYPES, EXPERT_ADAPTERS, type ModelType, type InferenceResponse } from '@/lib/types';

type Tab = 'output' | 'timings' | 'raw';

export function InferencePanel() {
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Click the submit button');
  const [modelType, setModelType] = useState<ModelType>('auto');
  const [expertLabel, setExpertLabel] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<InferenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('output');
  const [lastSuccessfulRequest, setLastSuccessfulRequest] = useState<Date | null>(null);
  const [drawnBbox, setDrawnBbox] = useState<[number, number, number, number] | null>(null);
  const [sentImageDimensions, setSentImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Crop image to bbox region and return as base64 with dimensions
  const cropImageToBbox = useCallback(async (
    imgB64: string,
    bbox: [number, number, number, number]
  ): Promise<{ b64: string; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ b64: imgB64, width: img.width, height: img.height });
          return;
        }
        // Convert RU coords (0-1000) to pixels
        const x1 = Math.round((bbox[0] / 1000) * img.width);
        const y1 = Math.round((bbox[1] / 1000) * img.height);
        const x2 = Math.round((bbox[2] / 1000) * img.width);
        const y2 = Math.round((bbox[3] / 1000) * img.height);
        const cropWidth = x2 - x1;
        const cropHeight = y2 - y1;
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        ctx.drawImage(img, x1, y1, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        resolve({ b64: canvas.toDataURL('image/png'), width: cropWidth, height: cropHeight });
      };
      img.src = imgB64;
    });
  }, []);

  // Get original image dimensions
  const getImageDimensions = useCallback(async (imgB64: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = imgB64;
    });
  }, []);

  const handleInference = useCallback(async () => {
    if (!imageB64) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);  // Clear previous response
    setSentImageDimensions(null);

    try {
      // Crop image if bbox is drawn (all modes)
      let imageToSend = imageB64;
      if (drawnBbox) {
        const cropped = await cropImageToBbox(imageB64, drawnBbox);
        imageToSend = cropped.b64;
        setSentImageDimensions({ width: cropped.width, height: cropped.height });
      } else {
        const dims = await getImageDimensions(imageB64);
        setSentImageDimensions(dims);
      }

      const payload: Parameters<typeof runInference>[0] = {
        image_b64: imageToSend,
        prompt: prompt || 'What action should be taken?',
      };

      if (modelType === 'ocr') {
        payload.adapter = 'ocr';
      } else if (modelType === 'segment') {
        payload.adapter = 'segment';
      } else if (modelType === 'expert' && expertLabel !== '') {
        payload.expert = expertLabel;
      }

      const result = await runInference(payload);
      setResponse(result);
      setLastSuccessfulRequest(new Date());

      const errorMsg = result.error as string | null | undefined;
      if (errorMsg) {
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [imageB64, prompt, modelType, expertLabel, drawnBbox, cropImageToBbox, getImageDimensions]);

  const handleClear = useCallback(() => {
    setImageB64(null);
    setResponse(null);
    setError(null);
    setDrawnBbox(null);
  }, []);

  // Clear previous response when drawing a new bbox
  const handleBboxChange = useCallback((bbox: [number, number, number, number] | null) => {
    setDrawnBbox(bbox);
    // Clear old response so previous annotations don't show
    if (bbox !== null) {
      setResponse(null);
      setError(null);
    }
  }, []);

  // Enable bbox drawing for all modes, but lock while loading
  const enableBboxDraw = !isLoading;

  // Transform coordinates from cropped region (0-1000) to original image coords
  const transformToOriginal = useCallback((
    coord: [number, number],
    bbox: [number, number, number, number]
  ): [number, number] => {
    const [bx1, by1, bx2, by2] = bbox;
    const x = bx1 + (coord[0] / 1000) * (bx2 - bx1);
    const y = by1 + (coord[1] / 1000) * (by2 - by1);
    return [Math.round(x), Math.round(y)];
  }, []);

  const transformBboxToOriginal = useCallback((
    responseBbox: [number, number, number, number],
    drawnBox: [number, number, number, number]
  ): [number, number, number, number] => {
    const [bx1, by1, bx2, by2] = drawnBox;
    const width = bx2 - bx1;
    const height = by2 - by1;
    return [
      Math.round(bx1 + (responseBbox[0] / 1000) * width),
      Math.round(by1 + (responseBbox[1] / 1000) * height),
      Math.round(bx1 + (responseBbox[2] / 1000) * width),
      Math.round(by1 + (responseBbox[3] / 1000) * height),
    ];
  }, []);

  // Extract annotations from response (MoE responses have output field with tool_call)
  const annotations = response ? (() => {
    const output = response.output as string | undefined;
    if (!output) return undefined;
    const parsed = parseToolCall(output);
    if (!parsed?.toolCall) return undefined;

    let coordinate = parsed.toolCall.coordinate as [number, number] | undefined;
    let bbox_2d = parsed.toolCall.bbox_2d as [number, number, number, number] | undefined;

    // Transform coords if we cropped the image
    if (drawnBbox) {
      if (coordinate) {
        coordinate = transformToOriginal(coordinate, drawnBbox);
      }
      if (bbox_2d) {
        bbox_2d = transformBboxToOriginal(bbox_2d, drawnBbox);
      }
    }

    return { coordinate, bbox_2d };
  })() : undefined;

  // Extract SAM masks and boxes from response
  const samMasks = response?.masks as boolean[][][] | undefined;
  const samBoxes = response?.boxes as number[][] | undefined;

  // Debug log SAM response
  if (response?.masks || response?.boxes) {
    console.log('[SAM Debug]', {
      maskCount: samMasks?.length,
      boxCount: samBoxes?.length,
      boxes: samBoxes,
      maskShape: samMasks?.[0] ? `${samMasks[0].length}x${samMasks[0][0]?.length}` : 'none',
    });
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--card-border)]">
          <h1 className="text-xl font-semibold">MoE Inference</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted)] font-mono">
              {process.env.NEXT_PUBLIC_GIT_COMMIT}
            </span>
            <ServerStatus isInferring={isLoading} lastSuccessfulRequest={lastSuccessfulRequest} />
          </div>
        </header>

        {/* Single column step-by-step layout */}
        <div className="space-y-6">
          {/* Step 1: Model Type */}
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              1. Select Model
            </h2>
            <div className="flex gap-4 flex-wrap">
              <select
                value={modelType}
                onChange={(e) => {
                  setModelType(e.target.value as ModelType);
                  setDrawnBbox(null);
                  setResponse(null);
                  setError(null);
                }}
                className="flex-1 min-w-[200px] px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                {MODEL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} ({type.description})
                  </option>
                ))}
              </select>
              {modelType === 'expert' && (
                <select
                  value={expertLabel}
                  onChange={(e) => setExpertLabel(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="flex-1 min-w-[200px] px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select adapter...</option>
                  {EXPERT_ADAPTERS.map((adapter) => (
                    <option key={adapter.label} value={adapter.label}>
                      {adapter.label}: {adapter.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Step 2: Image */}
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              2. Upload Image {!isLoading && <span className="text-blue-400 ml-2">(draw box to crop region)</span>}{isLoading && <span className="text-yellow-400 ml-2">(locked)</span>}
            </h2>
            <ImageDropzone
              onImageSelect={(img) => {
                setImageB64(img);
                setDrawnBbox(null);
                setResponse(null);
                setError(null);
              }}
              currentImage={imageB64}
              annotations={annotations}
              enableBboxDraw={enableBboxDraw}
              drawnBbox={drawnBbox}
              onBboxChange={handleBboxChange}
              samMasks={samMasks}
              samBoxes={samBoxes}
            />
          </div>

          {/* Step 3: Prompt & Run */}
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              {modelType === 'ocr' ? '3. Run OCR' : '3. Enter Prompt & Run'}
            </h2>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={modelType === 'segment' ? "Object to segment (e.g. 'calendar', 'button')" : "Describe what action to take..."}
                  className={`w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm resize-none h-[42px] focus:outline-none focus:border-[var(--primary)] ${modelType === 'ocr' ? 'opacity-0 pointer-events-none' : ''}`}
                  tabIndex={modelType === 'ocr' ? -1 : 0}
                />
              </div>
              <button
                onClick={handleInference}
                disabled={!imageB64 || isLoading}
                className="px-6 h-[42px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  modelType === 'ocr' ? 'Run OCR' : 'Run'
                )}
              </button>
              <button
                onClick={handleClear}
                className="px-4 h-[42px] bg-[var(--card-border)] hover:bg-[var(--muted)]/30 font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* OCR Text Preview - rendered content above raw JSON */}
          {(() => {
            const ocrText = response ? String(response.text || response.raw || '') : '';
            if (!ocrText || error) return null;

            // Detect if content has HTML tags
            const hasHtmlTags = /<[a-z][\s\S]*>/i.test(ocrText);

            return (
              <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
                  OCR Output {hasHtmlTags && <span className="text-blue-400 ml-2">(HTML)</span>}
                </h2>
                <div className="bg-[var(--background)] rounded-lg p-4 max-h-[300px] overflow-auto">
                  {hasHtmlTags ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--card-border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--card-border)] [&_th]:px-2 [&_th]:py-1"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ocrText) }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                      {ocrText}
                    </pre>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Results */}
          {(response || error) && (
            <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Raw Response
                </h2>
                <div className="flex gap-2">
                  {(['output', 'timings', 'raw'] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                        activeTab === tab
                          ? 'bg-[var(--card-border)] text-white border-[var(--muted)]/50'
                          : 'border-[var(--card-border)] text-[var(--muted)] hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--background)] rounded-lg p-4 max-h-[400px] overflow-auto font-mono text-sm">
                {error && (
                  <div className="text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-4">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                {response && !error && activeTab === 'output' && (
                  <OutputTab response={response} sentDimensions={sentImageDimensions} />
                )}

                {response && !error && activeTab === 'timings' && (
                  <TimingsTab timings={response.timings as Record<string, number> | undefined} />
                )}

                {response && !error && activeTab === 'raw' && (
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(response, null, 2)}
                  </pre>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutputTab({ response, sentDimensions }: { response: InferenceResponse; sentDimensions: { width: number; height: number } | null }) {
  const output = response.output as string | undefined;
  const parsed = output ? parseToolCall(output) : null;
  const args = parsed?.toolCall as Record<string, unknown> | undefined;

  // Expert routing info
  const adapter = response.adapter as string | undefined;
  const expert = response.expert as number | undefined;
  const routed = response.routed as boolean | undefined;

  return (
    <div className="space-y-4">
      {/* Sent Image Dimensions */}
      {sentDimensions && (
        <div className="bg-[var(--card)] rounded-lg p-3">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Sent Image</div>
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm font-mono">
            {sentDimensions.width} × {sentDimensions.height} px
          </span>
        </div>
      )}

      {/* Routing Info */}
      {(adapter || expert !== undefined) && (
        <div className="bg-[var(--card)] rounded-lg p-3">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Routing</div>
          <div className="flex flex-wrap gap-3">
            {expert !== undefined && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">
                Expert {expert}
              </span>
            )}
            {adapter && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm font-mono">
                {adapter}
              </span>
            )}
            {routed && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                via Router
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tool Call */}
      {args && (() => {
        const action = args.action as string | undefined;
        const coordinate = args.coordinate as number[] | undefined;
        const annotation = args.annotation as string | undefined;
        const text = args.text as string | undefined;
        // Scroll-specific args
        const direction = args.direction as string | undefined;
        const pixels = args.pixels as number | undefined;
        const amount = args.amount as number | undefined;
        const scrollAmount = args.scroll_amount as number | undefined;
        return (
          <div className="bg-[var(--card)] rounded-lg p-3">
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Tool Call</div>
            <div className="space-y-2">
              {action && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Action:</span>
                  <span className="font-mono text-yellow-400">{action}</span>
                </div>
              )}
              {coordinate && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Coordinate:</span>
                  <span className="font-mono text-cyan-400">[{coordinate.join(', ')}]</span>
                </div>
              )}
              {direction && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Direction:</span>
                  <span className="font-mono text-pink-400">{direction}</span>
                </div>
              )}
              {(pixels ?? amount ?? scrollAmount) !== undefined && (() => {
                const scrollValue = pixels ?? amount ?? scrollAmount ?? 0;
                const scrollDir = scrollValue < 0 ? '↑ Up' : '↓ Down';
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted)]">Scroll:</span>
                    <span className="font-mono text-pink-400">{Math.abs(scrollValue)}px {scrollDir}</span>
                  </div>
                );
              })()}
              {text && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Text:</span>
                  <span className="text-orange-400">&quot;{text}&quot;</span>
                </div>
              )}
              {annotation && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Annotation:</span>
                  <span className="text-green-400">{annotation}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Raw JSON fallback */}
      {!args && (
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}

function TimingsTab({ timings }: { timings: Record<string, number> | undefined }) {
  if (!timings) {
    return <div className="text-[var(--muted)]">No timing data available</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(timings).map(([key, value]) => (
        <div key={key} className="flex justify-between px-3 py-2 bg-[var(--card)] rounded">
          <span className="text-[var(--muted)] capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="text-green-400 font-mono">{(value * 1000).toFixed(1)}ms</span>
        </div>
      ))}
    </div>
  );
}

