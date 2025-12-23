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
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}
