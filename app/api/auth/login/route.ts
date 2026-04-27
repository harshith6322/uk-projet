import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, getMaxOtpAttempts, logAudit } from '@/lib/google-sheets'
import { signAdminToken } from '@/lib/auth'
import { sendOtpEmail, sendSecurityAlertEmail } from '@/lib/email'

const globalAny: any = globalThis;
if (!globalAny.otpStore) globalAny.otpStore = new Map<string, { otp: string, expires: number, attempts: number }>();
if (!globalAny.rateLimitStore) globalAny.rateLimitStore = new Map<string, { count: number, resetAt: number }>();

const otpStore = globalAny.otpStore;
const rateLimitStore = globalAny.rateLimitStore;

function checkRateLimit(ip: string): boolean {
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS = 10; // Max 10 login/otp requests per 15 mins per IP
  
  const now = Date.now();
  let data = rateLimitStore.get(ip);
  
  if (!data || now > data.resetAt) {
    data = { count: 1, resetAt: now + WINDOW_MS };
  } else {
    data.count++;
  }
  
  rateLimitStore.set(ip, data);
  return data.count <= MAX_REQUESTS;
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'Unknown IP';
  const userAgent = req.headers.get('user-agent') || 'Unknown Device';
  
  if (!checkRateLimit(ip)) {
    await logAudit('IP_BLOCKED', ip, 'IP rate limit exceeded (Suspicious activity detected)');
    
    // Only send the email once every 15 minutes per IP to avoid spamming the admin
    const data = rateLimitStore.get(ip);
    if (data && data.count === 11) {
       await sendSecurityAlertEmail('IP_BLOCKED', 'A malicious IP was blocked for brute-forcing.', ip, userAgent);
    }
    
    return NextResponse.json({ error: 'Your IP has been temporarily blocked due to too many suspicious requests. Please try again in 15 minutes.' }, { status: 429 });
  }

  try {
    if (body.otp) {
      const stored = otpStore.get('admin');
      if (!stored) {
        return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 })
      }
      
      const maxAttempts = await getMaxOtpAttempts();

      if (stored.attempts >= maxAttempts) {
        otpStore.delete('admin');
        await logAudit('OTP_LOCKED', ip, 'Max attempts reached for OTP');
        await sendSecurityAlertEmail('OTP_LOCKED', 'An attacker ran out of OTP attempts.', ip, userAgent);
        return NextResponse.json({ error: 'Too many failed attempts. Please login again.' }, { status: 429 })
      }

      if (stored.otp === body.otp && Date.now() < stored.expires) {
        otpStore.delete('admin');
        await logAudit('LOGIN_SUCCESS', ip, 'Admin successfully logged in with OTP');
        await sendSecurityAlertEmail('LOGIN_SUCCESS', 'Admin dashboard was successfully accessed.', ip, userAgent);
        
        const token = signAdminToken()
        const res = NextResponse.json({ message: 'Logged in' })
        res.cookies.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        })
        return res;
      }
      
      // Failed attempt
      stored.attempts += 1;
      const remaining = maxAttempts - stored.attempts;
      
      if (remaining <= 0) {
        otpStore.delete('admin');
        await logAudit('OTP_LOCKED', ip, 'Failed OTP attempt. Locked out.');
        return NextResponse.json({ error: 'Account locked due to too many failed attempts. Please request a new OTP.' }, { status: 429 })
      }
      
      await logAudit('OTP_FAILED', ip, `Failed OTP attempt. ${remaining} left. Provided: ${body.otp}`);
      return NextResponse.json({ error: `Invalid OTP. You have ${remaining} attempt${remaining === 1 ? '' : 's'} left.` }, { status: 401 })
    }

    const isValid = await verifyPassword(body.password);
    
    if (isValid) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set('admin', { otp, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
      
      await logAudit('PASSWORD_SUCCESS', ip, 'Password correct. OTP sent to email.');

      const adminEmail = process.env.SMTP_USER || process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendOtpEmail(adminEmail, otp);
      } else {
        return NextResponse.json({ error: 'Admin email not configured for OTP' }, { status: 500 });
      }

      return NextResponse.json({ requireOtp: true, message: 'OTP sent to email' });
    } else {
      await logAudit('PASSWORD_FAILED', ip, `Attempted invalid password: ${body.password}`);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.toString() }, { status: 500 })
  }
}
