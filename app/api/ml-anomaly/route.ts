import { NextResponse } from 'next/server';

/**
 * POST /api/ml-anomaly
 * 
 * Proxies anomaly detection requests to the Python ML backend.
 * The backend runs pre-trained models (Isolation Forest, Random Forest, 
 * Gradient Boosting) to classify electricity readings as normal or anomalous.
 * 
 * Falls back gracefully if the Python backend is not running.
 */

const ML_BACKEND_URL = 'http://127.0.0.1:8000';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Support both single and batch predictions
        const isBatch = Array.isArray(body.readings);
        const endpoint = isBatch
            ? `${ML_BACKEND_URL}/predict/anomaly/batch`
            : `${ML_BACKEND_URL}/predict/anomaly`;

        const mlResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
        });

        if (!mlResponse.ok) {
            const errText = await mlResponse.text();
            return NextResponse.json(
                { error: 'ML backend error', details: errText },
                { status: mlResponse.status }
            );
        }

        const result = await mlResponse.json();
        return NextResponse.json(result);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                error: 'ML backend unavailable',
                details: message,
                hint: 'Start the Python backend: cd backend && python3 -m uvicorn main:app --port 8000',
            },
            { status: 503 }
        );
    }
}
