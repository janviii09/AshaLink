import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tts
 * 
 * Converts text to speech using ElevenLabs Text-to-Speech API.
 * Used by the RAG-powered HumanSathi to speak AI responses aloud.
 * 
 * Returns an audio/mpeg stream that can be played in the browser.
 */

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Use "Rachel" voice — warm, friendly female voice (good for elderly companion)
    // You can change this voice ID to any voice from your ElevenLabs account
    const VOICE_ID = 'XrExE9yKIg1WjnnlVkGX'; // Rachel — warm and caring

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.substring(0, 1000), // Limit to avoid long audio
          model_id: 'eleven_multilingual_v2', // Supports Hindi + English
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.4, // Slightly expressive — warm tone
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs TTS error:', error);
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    // Stream the audio back to the client
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('TTS route error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'TTS failed', details: message }, { status: 500 });
  }
}
