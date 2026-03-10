import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Hardcoded key for direct use
    const HEYGEN_API_KEY = "sk_V2_hgu_kUyTrOHKmx8_qIozJymcO3bDssHDv9yIt6iE0GbeHar5";

    const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: { 
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json"
      },
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

    // Success: Return the token to your HumanSathi component
    return NextResponse.json({ token: data.data.token });
    
  } catch (error) {
    console.error("Server Error in HeyGen route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}