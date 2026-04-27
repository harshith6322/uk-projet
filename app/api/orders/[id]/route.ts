import { NextRequest, NextResponse } from 'next/server'
import { getDoc } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Orders'];
    const rows = await sheet.getRows();
    const reversedRows = [...rows].reverse();
    const row = reversedRows.find(r => r.get('Order ID') === params.id || r.get('Phone') === params.id);

    if (!row) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      orderNumber: row.get('Order ID'),
      status: row.get('Status'),
      name: row.get('Name'),
      total: row.get('Total'),
      items: JSON.parse(row.get('Items') || '[]')
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
