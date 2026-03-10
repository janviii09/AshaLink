import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: Request) {
    try {
        const { phoneNumbers } = await request.json();

        if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            return NextResponse.json(
                { error: 'No phone numbers provided' },
                { status: 400 }
            );
        }

        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.error("Twilio credentials missing. SID:", !!accountSid, "Auth:", !!authToken, "Phone:", !!twilioPhoneNumber);
            return NextResponse.json(
                { error: 'Server configuration error: Missing Twilio credentials' },
                { status: 500 }
            );
        }

        const client = twilio(accountSid, authToken);

        // TwiML for the voice message (Hindi - Devanagari)
        const twiml = `
      <Response>
        <Say voice="Polly.Aditi">
          यह आपकासाथी से एक आपातकालीन संदेश है।
          आपके परिवार को तुरंत सहायता की आवश्यकता है।
          कृपया अभी संपर्क करें।
        </Say>
      </Response>
    `;

        // Initiate calls in parallel
        const callPromises = phoneNumbers.map((number: string) => {
            return client.calls.create({
                twiml: twiml,
                to: number,
                from: twilioPhoneNumber,
            });
        });

        const results = await Promise.allSettled(callPromises);

        const successfulCalls = results.filter((r) => r.status === 'fulfilled');
        const failedCalls = results.filter((r) => r.status === 'rejected');

        if (failedCalls.length > 0) {
            console.error('Some calls failed:', failedCalls);
        }

        if (successfulCalls.length === 0 && failedCalls.length > 0) {
            const firstError = (failedCalls[0] as PromiseRejectedResult).reason;
            throw new Error(`All calls failed. First error: ${firstError.message || firstError}`);
        }

        return NextResponse.json({
            success: true,
            message: `Initiated ${successfulCalls.length} calls`,
            failures: failedCalls.length
        });

    } catch (error: any) {
        console.error('Error processing SOS request:', error);
        return NextResponse.json(
            { error: 'Failed to process emergency alert', details: error.message || String(error) },
            { status: 500 }
        );
    }
}
