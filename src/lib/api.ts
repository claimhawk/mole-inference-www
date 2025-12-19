import type { InferenceRequest, InferenceResponse, ServerStatus } from './types';

const API_BASE = process.env.NEXT_PUBLIC_INFERENCE_API || 'https://claimhawk--mole-inference-server-infer.modal.run';

export async function runInference(request: InferenceRequest): Promise<InferenceResponse> {
  const response = await fetch(API_BASE, {
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
    const response = await fetch(API_BASE, {
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
