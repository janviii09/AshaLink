import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: Request) {
    try {
        const { phoneNumbers, locationUrl } = await request.json();

        if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            return NextResponse.json(
                { error: 'No phone numbers provided' },
                { status: 400 }
            );
        }

        if (!locationUrl) {
            return NextResponse.json(
                { error: 'No location URL provided' },
                { status: 400 }
            );
        }

        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.error('Twilio credentials missing');
            return NextResponse.json(
                { error: 'Server configuration error: Missing Twilio credentials' },
                { status: 500 }
            );
        }

        const client = twilio(accountSid, authToken);
        const messageBody = `🚨 *AshaLink EMERGENCY* 🚨\nYour loved one needs immediate help and has shared their live location:\n${locationUrl}\n\nPlease check on them right away!`;

        // Send SMS to all emergency contacts in parallel
        const smsPromises = phoneNumbers.map((number: string) => {
            return client.messages.create({
                body: messageBody,
                to: number,
                from: twilioPhoneNumber,
            });
        });

        const results = await Promise.allSettled(smsPromises);

        const successfulSMS = results.filter((r) => r.status === 'fulfilled');
        const failedSMS = results.filter((r) => r.status === 'rejected');

        if (failedSMS.length > 0) {
            console.error('Some SMS failed:', failedSMS);
        }

        if (successfulSMS.length === 0 && failedSMS.length > 0) {
            const firstError = (failedSMS[0] as PromiseRejectedResult).reason;
            throw new Error(`All SMS failed. First error: ${firstError.message || firstError}`);
        }

        return NextResponse.json({
            success: true,
            message: `Sent location to ${successfulSMS.length} contacts`,
            failures: failedSMS.length
        });

    } catch (error: any) {
        console.error('Error processing location SMS:', error);
        return NextResponse.json(
            { error: 'Failed to send location alerts', details: error.message || String(error) },
            { status: 500 }
        );
    }
}
