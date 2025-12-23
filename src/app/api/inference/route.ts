import { NextRequest, NextResponse } from 'next/server';

// Server-side endpoints (no CORS issues)
const ENDPOINTS = {
  moe: process.env.NEXT_PUBLIC_INFERENCE_API,
  ocr: process.env.NEXT_PUBLIC_OCR_API,
  sam: process.env.NEXT_PUBLIC_SAM_API,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adapter, ...payload } = body;

    // Select endpoint based on adapter
    let endpoint: string | undefined;
    if (adapter === 'ocr') {
      endpoint = ENDPOINTS.ocr;
    } else if (adapter === 'segment') {
      endpoint = ENDPOINTS.sam;
    } else {
      endpoint = ENDPOINTS.moe;
    }

    if (!endpoint) {
      return NextResponse.json(
        { error: `Endpoint not configured for adapter: ${adapter || 'moe'}` },
        { status: 500 }
      );
    }

    // Forward request to Modal
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adapter ? { ...payload, adapter } : payload),
    });

    const data = await response.json();

    // Log SAM responses to see mask structure
    if (adapter === 'segment') {
      const masks = data.masks;
      console.log('[SAM Response]', JSON.stringify({
        maskCount: masks?.length,
        maskShape: masks?.[0]?.length ? `${masks[0].length}x${masks[0][0]?.length}` : 'empty',
        firstMaskSample: masks?.[0]?.[0]?.slice(0, 10), // first 10 values of first row
        boxes: data.boxes,
        scores: data.scores,
        error: data.error,
        allKeys: Object.keys(data),
      }, null, 2));
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}
