'use client';

import { useState, useCallback } from 'react';
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

  // Crop image to bbox region and return as base64
  const cropImageToBbox = useCallback(async (
    imgB64: string,
    bbox: [number, number, number, number]
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imgB64);
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
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imgB64;
    });
  }, []);

  const handleInference = useCallback(async () => {
    if (!imageB64) return;

    setIsLoading(true);
    setError(null);

    try {
      // Crop image if bbox is drawn (all modes)
      let imageToSend = imageB64;
      if (drawnBbox) {
        imageToSend = await cropImageToBbox(imageB64, drawnBbox);
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
  }, [imageB64, prompt, modelType, expertLabel, drawnBbox, cropImageToBbox]);

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

  // Enable bbox drawing for all modes (auto, expert, ocr, segment)
  const enableBboxDraw = true;

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
                onChange={(e) => setModelType(e.target.value as ModelType)}
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
              2. Upload Image {enableBboxDraw && <span className="text-blue-400 ml-2">(draw box to crop region)</span>}
            </h2>
            <ImageDropzone
              onImageSelect={setImageB64}
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
              3. Enter Prompt & Run
            </h2>
            <div className="flex gap-4 items-center">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={modelType === 'segment' ? "Object to segment (e.g. 'calendar', 'button')" : "Describe what action to take..."}
                className="flex-1 px-3 py-2.5 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm resize-none h-[42px] focus:outline-none focus:border-[var(--primary)]"
              />
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
                  'Run'
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

          {/* Results */}
          {(response || error) && (
            <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Results
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
                  <OutputTab response={response} />
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

function OutputTab({ response }: { response: InferenceResponse }) {
  // Just dump the whole response - no fancy parsing
  return (
    <pre className="whitespace-pre-wrap break-words">
      {JSON.stringify(response, null, 2)}
    </pre>
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

