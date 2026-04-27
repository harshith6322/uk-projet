import { NextResponse } from 'next/server'
import { getAllSettings } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  const settings = await getAllSettings();
  const response = NextResponse.json({ 
    showUrgency: settings['ShowLowStockUrgency'] !== 'FALSE',
    haltStore: settings['HaltStore'] === 'TRUE',
    enableCaptcha: settings['EnableCaptcha'] === 'TRUE',
    allowCustomerCancellation: settings['AllowCustomerCancellation'] === 'TRUE',
    haltMessage: settings['HaltMessage'] || 'We are out of stock for the week. See you next week!'
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}
