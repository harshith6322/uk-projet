import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/auth'
import { getOrders, getFeedbackStats } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const allOrders = await getOrders()
    const feedbackStats = await getFeedbackStats()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const todayOrders = allOrders.filter(o => {
      const orderDate = new Date(o.date);
      return orderDate >= todayStart && o.status !== 'cancelled';
    })

    const totalRevenue = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0)
    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0)
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length

    const itemMap: Record<string, { name: string; emoji: string; unit: string; total: number }> = {}
    for (const order of todayOrders) {
      for (const item of (order.items || [])) {
        const pName = item.product?.name;
        if (pName) {
          if (!itemMap[pName]) {
            itemMap[pName] = { name: pName, emoji: item.product.emoji, unit: item.product.unit, total: 0 }
          }
          itemMap[pName].total += item.quantity
        }
      }
    }
    const itemTotals = Object.values(itemMap).sort((a, b) => b.total - a.total)

    const allTimeMap: Record<string, number> = {}
    for (const order of allOrders) {
      for (const item of (order.items || [])) {
        const pName = item.product?.name;
        if (pName) {
          allTimeMap[pName] = (allTimeMap[pName] || 0) + item.quantity
        }
      }
    }
    const topProduct = Object.entries(allTimeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    
    // Top Best Sellers with Details
    const bestSellers = Object.entries(allTimeMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Sales by day (Last 7 days)
    const salesByDay = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const targetYear = d.getFullYear();
      const targetMonth = d.getMonth();
      const targetDate = d.getDate();

      const revenue = allOrders
        .filter(o => {
          if (o.status === 'cancelled') return false;
          const od = new Date(o.date);
          return od.getFullYear() === targetYear && od.getMonth() === targetMonth && od.getDate() === targetDate;
        })
        .reduce((sum, o) => sum + Number(o.total), 0);
      return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue };
    }).reverse();

    // Top Customers
    const customerMap: Record<string, { phone: string, name: string, totalSpent: number, orders: number }> = {};
    for (const order of allOrders.filter(o => o.status !== 'cancelled')) {
      if (!customerMap[order.phone]) {
        customerMap[order.phone] = { phone: order.phone, name: order.name, totalSpent: 0, orders: 0 };
      }
      customerMap[order.phone].totalSpent += Number(order.total);
      customerMap[order.phone].orders++;
    }
    const topCustomers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

    return NextResponse.json({
      totalOrders: allOrders.length,
      todayOrders: todayOrders.length,
      totalRevenue,
      todayRevenue,
      pendingOrders,
      topProduct,
      itemTotals,
      bestSellers,
      salesByDay,
      topCustomers,
      feedbackStats,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
