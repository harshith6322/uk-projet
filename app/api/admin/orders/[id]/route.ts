import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { getDoc, getAllSettings } from '@/lib/google-sheets'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Orders'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Order ID') === params.id);
    
    if (row) {
      if (body.status !== undefined) {
        row.set('Status', body.status);
      }
      if (body.paid !== undefined) {
        try {
          row.set('Paid', body.paid ? 'TRUE' : 'FALSE');
        } catch (e) {
          console.error("Paid column might not exist", e);
        }
      }
      await row.save();
      
      if (body.status !== undefined) {
        const email = row.get('Email');
        if (email) {
          const settings = await getAllSettings();
          if (settings['EnableEmails'] !== 'FALSE') {
            import('@/lib/email').then(m => m.sendOrderStatusUpdateEmail(
              email,
              row.get('Name') || 'Customer',
              params.id,
              body.status,
              req.nextUrl.origin,
              settings['EnableFeedback'] !== 'FALSE'
            )).catch(console.error);
          }
        }
      }

      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
