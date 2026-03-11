import { NextResponse } from 'next/server';

/**
 * POST /api/medicine-identify
 * 
 * Receives a base64-encoded image of a medicine (tablet, capsule, or strip)
 * and sends it to Groq's Vision API to identify:
 *   - Medicine name
 *   - Common purpose/use
 *   - Typical dosage
 *   - Important warnings
 * 
 * WHY Groq Vision?
 * Groq provides free-tier access to Llama vision models that can analyze images.
 * We use `llama-3.2-11b-vision-preview` which is fast and sufficient for 
 * describing what's in a medicine photo.
 * 
 * IMPORTANT: This is NOT a certified medical tool. The response always includes
 * a disclaimer telling users to verify with their doctor.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: Request) {
    try {
        // 1. Extract the base64 image from the request body
        const { image } = await request.json();

        if (!image) {
            return NextResponse.json(
                { error: 'No image provided' },
                { status: 400 }
            );
        }

        if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
            return NextResponse.json(
                { error: 'GROQ_API_KEY is not configured. Please add it to .env.local' },
                { status: 500 }
            );
        }

        // 2. Send to Groq Vision API
        //    We construct a chat completion request with an image_url content part.
        //    The model "sees" the image and responds based on our prompt.
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.2-11b-vision-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `You are a medicine identification assistant. Look at this image of a medicine (tablet, capsule, or strip). Identify:
1. Likely medicine name
2. Common purpose/use
3. Typical dosage
4. Important warnings or side effects

IMPORTANT: Always add a disclaimer that this is AI-based identification and must be verified by a doctor or pharmacist.

Respond ONLY with this JSON format (no other text):
{
  "name": "medicine name",
  "purpose": "what this medicine is commonly used for",
  "dosage": "typical dosage information",
  "warnings": "important warnings or side effects",
  "disclaimer": "AI-based identification - always verify with your doctor or pharmacist"
}`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    // The image is sent as a base64 data URL
                                    url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
                                },
                            },
                        ],
                    },
                ],
                temperature: 0.3,  // Low temperature for more factual/consistent responses
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Groq API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to identify medicine', details: errorData },
                { status: 500 }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 3. Parse the JSON response from the LLM
        //    The model should return valid JSON, but we handle parsing errors gracefully
        try {
            // Extract JSON from the response (in case the model wraps it in markdown code blocks)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return NextResponse.json(parsed);
            }
            // If no JSON found, return the raw text with a structured fallback
            return NextResponse.json({
                name: 'Unknown',
                purpose: content,
                dosage: 'Please consult your doctor',
                warnings: 'Please consult your doctor',
                disclaimer: 'AI-based identification - always verify with your doctor or pharmacist',
            });
        } catch {
            return NextResponse.json({
                name: 'Unknown',
                purpose: content,
                dosage: 'Please consult your doctor',
                warnings: 'Please consult your doctor',
                disclaimer: 'AI-based identification - always verify with your doctor or pharmacist',
            });
        }

    } catch (error: unknown) {
        console.error('Error in medicine identification:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: 'Failed to process medicine identification', details: message },
            { status: 500 }
        );
    }
}
