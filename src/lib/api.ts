import type { InferenceRequest, InferenceResponse, ServerStatus } from './types';

// Use local API proxy to avoid CORS issues with Modal
const API_PROXY = '/api/inference';

// Direct Modal endpoint for health checks
function getMoeEndpoint(): string {
  const url = process.env.NEXT_PUBLIC_INFERENCE_API;
  if (!url) throw new Error('NEXT_PUBLIC_INFERENCE_API environment variable required');
  return url;
}

export async function runInference(request: InferenceRequest): Promise<InferenceResponse> {
  const response = await fetch(API_PROXY, {
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
    const response = await fetch(getMoeEndpoint(), {
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
    const response = await fetch(`${getMoeEndpoint()}/health`, {
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

export function parseToolCall(output: string | undefined | null): { action?: string; toolCall?: Record<string, unknown> } | null {
  if (!output) return null;
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
