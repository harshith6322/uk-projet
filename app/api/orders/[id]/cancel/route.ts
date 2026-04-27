import { NextRequest, NextResponse } from 'next/server';
import { getDoc, getAllSettings } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const settings = await getAllSettings();

    // Check if customer cancellation is allowed
    if (settings['AllowCustomerCancellation'] !== 'TRUE') {
      return NextResponse.json({ error: 'Order cancellation is not available at this time.' }, { status: 403 });
    }

    const doc = await getDoc();
    const ordersSheet = doc.sheetsByTitle['Orders'];
    const productsSheet = doc.sheetsByTitle['Products'];
    const rows = await ordersSheet.getRows();
    const row = rows.find(r => r.get('Order ID') === params.id);

    if (!row) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const currentStatus = row.get('Status');
    if (currentStatus === 'cancelled') {
      return NextResponse.json({ error: 'Order is already cancelled.' }, { status: 400 });
    }
    if (currentStatus === 'collected') {
      return NextResponse.json({ error: 'Collected orders cannot be cancelled.' }, { status: 400 });
    }

    // Mark as cancelled
    row.set('Status', 'cancelled');
    await row.save();

    // Restore stock
    const items = JSON.parse(row.get('Items') || '[]');
    const pRows = await productsSheet.getRows();
    for (const item of items) {
      const pRow = pRows.find(r => Number(r.get('ID')) === item.product?.id);
      if (pRow) {
        const current = Number(pRow.get('Stock'));
        pRow.set('Stock', current + item.quantity);
        await pRow.save();
      }
    }

    // Send emails if enabled
    const enableEmails = settings['EnableEmails'] !== 'FALSE';
    if (enableEmails) {
      const orderData = {
        orderNumber: params.id,
        name: row.get('Name') || 'Customer',
        email: row.get('Email') || '',
        items: items.map((i: any) => ({
          name: i.product?.name || '',
          quantity: i.quantity,
          price: i.price,
          unit: i.product?.unit || '',
        })),
        totalAmount: Number(row.get('Total')),
      };
      import('@/lib/email').then(m => m.sendOrderCancellationEmail(orderData)).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Cancel order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
