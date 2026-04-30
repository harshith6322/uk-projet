import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { getAllSettings, setSetting } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const settings = await getAllSettings();
  const response = NextResponse.json({ 
    showUrgency: settings['ShowLowStockUrgency'] !== 'FALSE',
    haltStore: settings['HaltStore'] === 'TRUE',
    enableEmails: settings['EnableEmails'] !== 'FALSE',
    enableCaptcha: settings['EnableCaptcha'] === 'TRUE',
    allowCustomerCancellation: settings['AllowCustomerCancellation'] === 'TRUE',
    enableFeedback: settings['EnableFeedback'] !== 'FALSE', // default to true
    haltMessage: settings['HaltMessage'] || 'We are out of stock for the week. See you next week!',
    enableTracking: settings['EnableTracking'] !== 'FALSE',
    enableNotice: settings['EnableNotice'] === 'TRUE',
    noticeMessage: settings['NoticeMessage'] || 'Please place orders by 7:00 AM Friday Collection: Friday 6–8 PM'
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json();
  if (typeof body.showUrgency === 'boolean') {
    await setSetting('ShowLowStockUrgency', body.showUrgency ? 'TRUE' : 'FALSE');
  }
  if (typeof body.haltStore === 'boolean') {
    await setSetting('HaltStore', body.haltStore ? 'TRUE' : 'FALSE');
  }
  if (typeof body.enableEmails === 'boolean') {
    await setSetting('EnableEmails', body.enableEmails ? 'TRUE' : 'FALSE');
  }
  if (typeof body.enableCaptcha === 'boolean') {
    await setSetting('EnableCaptcha', body.enableCaptcha ? 'TRUE' : 'FALSE');
  }
  if (typeof body.allowCustomerCancellation === 'boolean') {
    await setSetting('AllowCustomerCancellation', body.allowCustomerCancellation ? 'TRUE' : 'FALSE');
  }
  if (typeof body.enableFeedback === 'boolean') {
    await setSetting('EnableFeedback', body.enableFeedback ? 'TRUE' : 'FALSE');
  }
  if (typeof body.haltMessage === 'string') {
    await setSetting('HaltMessage', body.haltMessage);
  }
  if (typeof body.enableTracking === 'boolean') {
    await setSetting('EnableTracking', body.enableTracking ? 'TRUE' : 'FALSE');
  }
  if (typeof body.enableNotice === 'boolean') {
    await setSetting('EnableNotice', body.enableNotice ? 'TRUE' : 'FALSE');
  }
  if (typeof body.noticeMessage === 'string') {
    await setSetting('NoticeMessage', body.noticeMessage);
  }
  return NextResponse.json({ success: true });
}
