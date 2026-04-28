import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { getDoc } from '@/lib/google-sheets'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Products'];
    const rows = await sheet.getRows();
    const row = rows.find(r => Number(r.get('ID')) === Number(params.id));
    
    if (row) {
      if (body.stock !== undefined) row.set('Stock', body.stock);
      if (body.active !== undefined) row.set('Active', body.active ? 'TRUE' : 'FALSE');
      await row.save();
      return NextResponse.json(
        { success: true },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
