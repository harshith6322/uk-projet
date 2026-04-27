import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const { action, details } = await req.json();
    
    // Only allow specific public audit actions to prevent abuse
    if (action !== 'CAPTCHA_FAILED_TRACKING' && action !== 'CAPTCHA_FAILED_ADMIN_LOGIN') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.ip || 'Unknown IP';
    
    // Rate limiting or simple throttling could be added here if needed,
    // but we'll trust the Google Sheets API limits for this simple implementation.
    await logAudit(action, ip, details || 'No details provided');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
