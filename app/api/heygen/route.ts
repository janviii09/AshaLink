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
        avatar_id: "26393b8e-e944-4367-98ef-e2bc75c4b792",
        mode: "LITE",
        video_settings: { quality: "medium" }
      })
    });

    const data = await res.json();
    console.log("DEBUG: HeyGen Token Response:", JSON.stringify(data, null, 2));

    // The new 2026 API uses 'session_token' inside the 'data' object
    const sessionToken = data.data?.session_token || data.session_token || data.data?.token;

    if (!res.ok || !sessionToken) {
      console.error("HeyGen API Error Detail:", data);
      return NextResponse.json({
        error: data.message || "Failed to generate session token",
        details: data
      }, { status: res.status });
    }

    // Success: Return the token to your HumanSathi component
    return NextResponse.json({ token: sessionToken });

  } catch (error) {
    console.error("Server Error in HeyGen route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}