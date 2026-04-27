import { NextRequest, NextResponse } from 'next/server';
import { logFeedback, hasFeedbackForOrder } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { orderId, type, rating, comments, productsRated } = data;

    if (!type || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (orderId && orderId !== 'N/A') {
      const alreadySubmitted = await hasFeedbackForOrder(orderId, type);
      if (alreadySubmitted) {
        return NextResponse.json({ error: 'Feedback already submitted for this order' }, { status: 409 });
      }
    }

    await logFeedback(
      orderId || 'N/A',
      type,
      rating,
      comments || '',
      productsRated ? JSON.stringify(productsRated) : '{}'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
