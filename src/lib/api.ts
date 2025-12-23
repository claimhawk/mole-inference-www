import type { InferenceRequest, InferenceResponse, ServerStatus } from './types';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable required`);
  return value;
}

// Endpoint URLs for different services
const ENDPOINTS = {
  moe: () => getRequiredEnv('NEXT_PUBLIC_INFERENCE_API'),
  ocr: () => process.env.NEXT_PUBLIC_OCR_API,
  sam: () => process.env.NEXT_PUBLIC_SAM_API,
};

function getEndpointForRequest(request: InferenceRequest): string {
  if (request.adapter === 'ocr') {
    const url = ENDPOINTS.ocr();
    if (!url) throw new Error('NEXT_PUBLIC_OCR_API not configured');
    return url;
  }
  if (request.adapter === 'segment') {
    const url = ENDPOINTS.sam();
    if (!url) throw new Error('NEXT_PUBLIC_SAM_API not configured');
    return url;
  }
  return ENDPOINTS.moe();
}

export async function runInference(request: InferenceRequest): Promise<InferenceResponse> {
  const endpoint = getEndpointForRequest(request);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Inference failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function checkServerStatus(): Promise<ServerStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const start = Date.now();
    const response = await fetch(ENDPOINTS.moe(), {
      method: 'OPTIONS',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - start;

    if (!response.ok) {
      return 'sleeping';
    }

    // Fast response = warm, slower = just woke up
    return latency < 500 ? 'warm' : 'waking';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return 'sleeping';
    }
    return 'unknown';
  }
}

/**
 * Trigger server warmup by hitting the health endpoint.
 * This actually spins up the Modal container if it's cold.
 * Returns the status after warmup attempt.
 */
export async function warmupServer(): Promise<ServerStatus> {
  const controller = new AbortController();
  // Allow up to 120s for cold start (Modal GPU containers can take a while)
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const start = Date.now();
    const response = await fetch(`${ENDPOINTS.moe()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - start;

    if (!response.ok) {
      return 'sleeping';
    }

    // If it took more than 5 seconds, it was a cold start
    return latency > 5000 ? 'waking' : 'warm';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return 'sleeping';
    }
    return 'unknown';
  }
}

export function parseToolCall(output: string): { action?: string; toolCall?: Record<string, unknown> } | null {
  const match = output.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
  if (!match) return null;

  try {
    const toolCall = JSON.parse(match[1]);
    return {
      action: toolCall.name,
      toolCall: toolCall.arguments,
    };
  } catch {
    return null;
  }
}
