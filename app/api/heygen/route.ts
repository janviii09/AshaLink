import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

    if (!HEYGEN_API_KEY) {
      return NextResponse.json({ error: "HEYGEN_API_KEY is not set" }, { status: 500 });
    }

    // New 2026 LiveAvatar Endpoint
    const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: { 
        "X-API-KEY": HEYGEN_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        avatar_id: "3c90c3cc-0d44-4b50-8888-8dd25736052a",
        mode: "LITE",
        video_settings: { quality: "medium" }
      })
    });

    const data = await res.json();

    // Enhanced defensive check
    if (!res.ok || !data.data || !data.data.token) {
      console.error("HeyGen API Error Response:", data);
      return NextResponse.json({ 
        error: data.message || "Failed to generate token",
        details: data
      }, { status: res.status });
    }

    // Success: Return the session_token to your HumanSathi component
    return NextResponse.json({ token: data.data.session_token });
    
  } catch (error) {
    console.error("Server Error in HeyGen route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}