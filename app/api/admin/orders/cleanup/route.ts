import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { cleanupOldOrders, verifyPassword } from '@/lib/google-sheets'

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { password, days } = await req.json();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const isValid = await verifyPassword(password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
    }

    const daysToKeep = days && days > 0 ? days : 30;
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const { deletedCount, deletedData } = await cleanupOldOrders(ip, daysToKeep);
    
    let csvData = "";
    if (deletedData && deletedData.length > 0) {
      const headers = Object.keys(deletedData[0]).join(',');
      const rows = deletedData.map((row: any) => 
        Object.values(row).map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      csvData = `${headers}\n${rows}`;
    }

    return NextResponse.json({ success: true, deletedCount, csvData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
