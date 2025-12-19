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

  const handleInference = useCallback(async () => {
    if (!imageB64) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload: Parameters<typeof runInference>[0] = {
        image_b64: imageB64,
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

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [imageB64, prompt, modelType, expertLabel]);

  const handleClear = useCallback(() => {
    setImageB64(null);
    setResponse(null);
    setError(null);
  }, []);

  // Extract annotations from response
  const annotations = response ? (() => {
    const parsed = parseToolCall(response.output);
    if (!parsed?.toolCall) return undefined;
    return {
      coordinate: parsed.toolCall.coordinate as [number, number] | undefined,
      bbox_2d: parsed.toolCall.bbox_2d as [number, number, number, number] | undefined,
    };
  })() : undefined;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--card-border)]">
          <h1 className="text-xl font-semibold">MoE Inference</h1>
          <ServerStatus isInferring={isLoading} />
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              Input
            </h2>

            <ImageDropzone
              onImageSelect={setImageB64}
              currentImage={imageB64}
              annotations={annotations}
            />

            <div className="mt-4 space-y-4">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what action to take..."
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm resize-y min-h-[100px] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Model Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Model Type
                </label>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as ModelType)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                >
                  {MODEL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expert Adapter (conditional) */}
              {modelType === 'expert' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Expert Adapter
                  </label>
                  <select
                    value={expertLabel}
                    onChange={(e) => setExpertLabel(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">Select adapter...</option>
                    {EXPERT_ADAPTERS.map((adapter) => (
                      <option key={adapter.label} value={adapter.label}>
                        {adapter.label}: {adapter.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleInference}
                  disabled={!imageB64 || isLoading}
                  className="flex-1 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    'Run Inference'
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 bg-[var(--card-border)] hover:bg-[var(--muted)]/30 font-medium rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Response Panel */}
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              Response
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
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

            {/* Response Content */}
            <div className="bg-[var(--background)] rounded-lg p-4 min-h-[400px] overflow-auto font-mono text-sm">
              {error && (
                <div className="text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-4">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {!response && !error && (
                <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] text-center">
                  <div className="text-4xl mb-4 opacity-50">🔍</div>
                  <p>Upload an image and enter a prompt to see results</p>
                </div>
              )}

              {response && !error && activeTab === 'output' && (
                <OutputTab response={response} />
              )}

              {response && !error && activeTab === 'timings' && (
                <TimingsTab timings={response.timings} />
              )}

              {response && !error && activeTab === 'raw' && (
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(response, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutputTab({ response }: { response: InferenceResponse }) {
  const parsed = parseToolCall(response.output);

  return (
    <div className="space-y-4">
      {parsed?.toolCall && (
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-3">
          {parsed.action && (
            <div className="text-blue-400 mb-2 text-xs uppercase tracking-wider">
              {parsed.action}
            </div>
          )}
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(parsed.toolCall, null, 2)}
          </pre>
        </div>
      )}

      {!parsed && (
        <pre className="whitespace-pre-wrap break-words">{response.output}</pre>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-[var(--card-border)] space-y-2">
        <MetadataItem label="Adapter" value={response.adapter} />
        <MetadataItem label="Expert" value={response.expert?.toString() ?? 'N/A'} />
        <MetadataItem label="Routed" value={response.routed ? 'Yes' : 'No'} />
      </div>
    </div>
  );
}

function TimingsTab({ timings }: { timings: Record<string, number> }) {
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

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--muted)] min-w-[80px]">{label}</span>
      <span className="bg-[var(--card)] px-2 py-0.5 rounded">{value}</span>
    </div>
  );
}
