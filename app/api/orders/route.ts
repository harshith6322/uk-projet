import { NextRequest, NextResponse } from 'next/server'
import { getDoc, getProducts, getAllSettings } from '@/lib/google-sheets'
import { generateOrderNumber } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, phone, email, notes, items } = await req.json()

  if (!name || !phone || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const doc = await getDoc();
    const ordersSheet = doc.sheetsByTitle['Orders'];
    const productsSheet = doc.sheetsByTitle['Products'];
    
    const products = await getProducts();
    
    // Strict backend stock validation
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `One or more products were not found.` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Sorry, ${product.name} is out of stock! Only ${product.stock} left.` }, { status: 400 });
      }
    }

    const orderItems = (items as { productId: number; quantity: number }[]).map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product: { id: product?.id, name: product?.name, emoji: product?.emoji, unit: product?.unit },
        quantity: item.quantity,
        price: product?.price || 0
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const orderNumber = generateOrderNumber()

    await ordersSheet.addRow({
      'Order ID': orderNumber,
      'Date': new Date().toISOString(),
      'Name': name,
      'Email': email || '',
      'Phone': phone,
      'Items': JSON.stringify(orderItems),
      'Total': totalAmount,
      'Status': 'pending'
    });

    // Deduct stock
    const pRows = await productsSheet.getRows();
    for (const item of orderItems) {
      const row = pRows.find(r => Number(r.get('ID')) === item.product.id);
      if (row) {
        const currentStock = Number(row.get('Stock'));
        row.set('Stock', Math.max(0, currentStock - item.quantity));
        await row.save();
      }
    }

    // Send emails asynchronously (don't block the response)
    const orderDataForEmail = {
      orderNumber,
      name,
      email: email || '',
      phone,
      items: orderItems.map(i => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.price,
        unit: i.product.unit || ''
      })),
      totalAmount
    }

    const settings = await getAllSettings();
    const enableEmails = settings['EnableEmails'] !== 'FALSE';

    if (enableEmails) {
      if (email) {
        import('@/lib/email').then(m => m.sendOrderConfirmationEmail(orderDataForEmail)).catch(console.error);
      }
      import('@/lib/email').then(m => m.sendNewOrderNotificationEmail(orderDataForEmail)).catch(console.error);
    }

    return NextResponse.json({ orderNumber, totalAmount }, { status: 201 })
  } catch (err: any) {
    console.error("Failed to place order", err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
