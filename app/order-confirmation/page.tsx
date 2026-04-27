'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function Confirmation() {
  const params = useSearchParams()
  const order = params.get('order')
  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center animate-slide-up">
        <div className="text-6xl mb-4 animate-pop">🎉</div>
        <h1 className="font-serif text-2xl text-grove-700 mb-2">Order Placed!</h1>
        <p className="text-bark-400 mb-6">Thank you for your order. Srinu will have it ready for collection.</p>
        {order && (
          <div className="bg-cream-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-bark-400 uppercase tracking-widest mb-1">Order Number</p>
            <p className="font-mono font-bold text-grove-600 text-xl">{order}</p>
          </div>
        )}
        <p className="text-sm text-bark-400 mb-6">Collection details will be shared in the WhatsApp group. Check your email for confirmation.</p>
        <div className="space-y-3">
          <Link href="/status" className="btn-primary block text-center">Track Order Status</Link>
          <Link href="/order" className="block text-center text-grove-600 hover:underline">Order More</Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return <Suspense><Confirmation /></Suspense>
}
