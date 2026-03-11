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

        const smsBody = `🚨 *AshaLink EMERGENCY* 🚨\nYour loved one has pressed the SOS button. They need immediate assistance! Please contact them right away.`;

        // Ensure no single Twilio error crashes the entire request
        const createCall = async (number: string) => {
            try {
                return await client.calls.create({
                    twiml: twiml,
                    to: number,
                    from: twilioPhoneNumber,
                });
            } catch (error: any) {
                console.error(`Failed to call ${number}:`, error.message);
                throw error;
            }
        };

        const createSMS = async (number: string) => {
            try {
                return await client.messages.create({
                    body: smsBody,
                    to: number,
                    from: twilioPhoneNumber,
                });
            } catch (error: any) {
                console.error(`Failed to SMS ${number}:`, error.message);
                throw error;
            }
        };

        // Initiate calls and SMS in parallel
        const promises: Promise<any>[] = [];

        phoneNumbers.forEach((number: string) => {
            promises.push(createCall(number));
            promises.push(createSMS(number));
        });

        // Add a 8 second timeout to prevent Vercel connection reset
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Twilio API Timeout')), 8000)
        );

        const results = await Promise.race([
            Promise.allSettled(promises),
            timeoutPromise
        ]) as PromiseSettledResult<any>[];

        const successfulActions = results.filter((r) => r.status === 'fulfilled');
        const failedActions = results.filter((r) => r.status === 'rejected');

        if (successfulActions.length === 0 && failedActions.length > 0) {
            const firstError = (failedActions[0] as PromiseRejectedResult).reason;
            throw new Error(`All SOS actions failed. First error: ${firstError.message || firstError}`);
        }

        return NextResponse.json({
            success: true,
            message: `Initiated ${successfulActions.length} SOS actions successfully. ${failedActions.length} failed (likely due to trial account unverified numbers).`,
            failures: failedActions.length
        });

    } catch (error: any) {
        console.error('Error processing SOS request:', error);
        return NextResponse.json(
            { error: 'Failed to process emergency alert', details: error.message || String(error) },
            { status: 500 }
        );
    }
}
