import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { getProducts, getDoc } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Products'];
    const newId = Date.now();
    await sheet.addRow({
      'ID': newId,
      'Name': body.name,
      'Emoji': body.emoji,
      'Description': body.description,
      'Price': body.price,
      'Unit': body.unit,
      'Stock': body.stock,
      'MaxPerOrder': body.maxPerOrder,
      'Active': 'TRUE'
    });
    return NextResponse.json({ success: true, id: newId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
