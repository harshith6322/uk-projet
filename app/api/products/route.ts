import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/google-sheets'

export const revalidate = 30;

export async function GET() {
  try {
    const products = await getProducts();
    // Only return products that are actively marked as TRUE for the public shop page
    const activeProducts = products.filter((p) => p.active);
    return NextResponse.json(activeProducts);
  } catch (error) {
    console.error("Failed to fetch products", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
