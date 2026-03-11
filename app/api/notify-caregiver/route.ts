import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: Request) {
    try {
        const { caregiverPhone, elderName, eventType, details } = await request.json();

        if (!caregiverPhone) {
            return NextResponse.json({ error: 'No caregiver phone provided' }, { status: 400 });
        }

        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.error('Twilio credentials missing');
            return NextResponse.json({ error: 'Server config error: Missing Twilio credentials' }, { status: 500 });
        }

        const client = twilio(accountSid, authToken);

        // Build appropriate message based on event type
        const messages: Record<string, string> = {
            help_requested: `🚨 AshaLink Alert: ${elderName || 'Your loved one'} has requested help from a neighbour. Type: ${details || 'General'}. Please check in on them.`,
            help_accepted: `✅ AshaLink Update: A verified volunteer has accepted the help request for ${elderName || 'your loved one'}. Details: ${details || 'N/A'}.`,
            emergency: `🆘 AshaLink EMERGENCY: ${elderName || 'Your loved one'} has triggered an emergency alert. ${details || 'Please contact them immediately.'}`,
            mood_alert: `⚠️ AshaLink Mood Alert: ${elderName || 'Your loved one'}'s mood has been low recently. Detected concerns: ${details || 'general distress'}. Consider reaching out.`,
            inactivity: `⚠️ AshaLink Alert: No activity detected from ${elderName || 'your loved one'} for an extended period. ${details || 'Please check on them.'}`,
        };

        const messageBody = messages[eventType] || messages['help_requested'];

        // Send SMS
        const message = await client.messages.create({
            body: messageBody,
            to: caregiverPhone,
            from: twilioPhoneNumber,
        });

        return NextResponse.json({
            success: true,
            messageSid: message.sid,
            eventType,
        });
    } catch (error: any) {
        console.error('Caregiver notification error:', error);
        return NextResponse.json(
            { error: 'Failed to send notification', details: error.message || String(error) },
            { status: 500 }
        );
    }
}
