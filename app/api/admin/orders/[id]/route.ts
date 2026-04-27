import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { getDoc, getAllSettings } from '@/lib/google-sheets'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Orders'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Order ID') === params.id);
    
    if (row) {
      row.set('Status', status);
      await row.save();
      
      const email = row.get('Email');
      if (email) {
        const settings = await getAllSettings();
        if (settings['EnableEmails'] !== 'FALSE') {
          import('@/lib/email').then(m => m.sendOrderStatusUpdateEmail(
            email,
            row.get('Name') || 'Customer',
            params.id,
            status,
            req.nextUrl.origin,
            settings['EnableFeedback'] !== 'FALSE'
          )).catch(console.error);
        }
      }

      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
