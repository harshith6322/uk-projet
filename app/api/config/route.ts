import { NextResponse } from 'next/server'
import { getAllSettings } from '@/lib/google-sheets'

export const revalidate = 15;

export async function GET() {
  const settings = await getAllSettings();
  const response = NextResponse.json({ 
    showUrgency: settings['ShowLowStockUrgency'] !== 'FALSE',
    haltStore: settings['HaltStore'] === 'TRUE',
    enableCaptcha: settings['EnableCaptcha'] === 'TRUE',
    allowCustomerCancellation: settings['AllowCustomerCancellation'] === 'TRUE',
    haltMessage: settings['HaltMessage'] || 'We are out of stock for the week. See you next week!',
    enableTracking: settings['EnableTracking'] !== 'FALSE', // default true
    enableNotice: settings['EnableNotice'] === 'TRUE', // default false
    noticeMessage: settings['NoticeMessage'] || 'Please place orders by 7:00 AM Friday Collection: Friday 6–8 PM'
  });
  return response;
}
