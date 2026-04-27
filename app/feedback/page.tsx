"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function FeedbackPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const [orderId, setOrderId] = useState(searchParams.orderId || "");
  const [orderLoaded, setOrderLoaded] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  // Rating States
  const [tab, setTab] = useState<'product' | 'ux'>(searchParams.orderId ? 'product' : 'ux');
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const [productComments, setProductComments] = useState("");
  const [uxRating, setUxRating] = useState(0);
  const [uxComments, setUxComments] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.items) {
            setOrderItems(data.items);
            setOrderLoaded(true);
            setTab('product');
          }
        })
        .catch(() => {});
    }

    // Dark mode sync
    const saved = localStorage.getItem("fresh_picks_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [orderId]);

  const StarRating = ({ rating, onChange }: { rating: number, onChange: (val: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-amber-400' : 'text-cream-300 dark:text-bark-500'}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(productRatings).length === 0) {
      setError("Please rate at least one product before continuing.");
      return;
    }
    setError("");
    setTab('ux');
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uxRating === 0) {
      setError("Please provide a website rating.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const promises = [];

      // 1. Submit Product Feedback if available
      if (orderLoaded && Object.keys(productRatings).length > 0) {
        const ratingsArray = Object.values(productRatings);
        const avgRating = ratingsArray.reduce((a, b) => a + b, 0) / ratingsArray.length;
        
        promises.push(
          fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              type: 'product',
              rating: avgRating,
              comments: productComments,
              productsRated: productRatings
            })
          }).then(res => res.ok ? res.json() : res.json().then(d => Promise.reject(d.error || 'Failed to submit product feedback')))
        );
      }

      // 2. Submit UX Feedback
      promises.push(
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId || 'N/A',
            type: 'ux',
            rating: uxRating,
            comments: uxComments,
            productsRated: {}
          })
        }).then(res => res.ok ? res.json() : res.json().then(d => Promise.reject(d.error || 'Failed to submit experience feedback')))
      );

      await Promise.all(promises);
      setSuccess(true);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : "An error occurred while submitting feedback.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-grove-50 dark:bg-gray-900 pattern-bg flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl animate-pop">
          <div className="text-6xl mb-4">💚</div>
          <h2 className="text-2xl font-serif text-grove-700 dark:text-grove-300 mb-2">Thank You!</h2>
          <p className="text-bark-600 dark:text-cream-100 mb-6">Your feedback helps us grow better every day.</p>
          <Link href="/order" className="btn-primary inline-block">Return to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grove-50 dark:bg-gray-900 pattern-bg py-12 px-4 transition-colors duration-300 flex justify-center items-center">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-transparent dark:border-gray-700">
        <div className="bg-grove-700 p-6 text-center relative overflow-hidden">
          <Link href="/order" className="inline-block text-4xl mb-2 hover:scale-110 transition-transform relative z-10">🌿</Link>
          <h1 className="font-serif text-2xl text-white relative z-10">We Value Your Feedback</h1>
          {/* Progress Indicator */}
          {orderLoaded && (
            <div className="absolute bottom-0 left-0 h-1 bg-grove-500 transition-all duration-500" style={{ width: tab === 'product' ? '50%' : '100%' }}></div>
          )}
        </div>

        {/* Tabs (Visual only now, enforced flow) */}
        <div className="flex border-b border-cream-200 dark:border-gray-700">
          {orderLoaded && (
            <div className={`flex-1 text-center py-3 text-sm font-medium transition ${tab === 'product' ? 'border-b-2 border-grove-500 text-grove-700 dark:text-grove-300' : 'text-bark-400 dark:text-gray-400 bg-cream-50 dark:bg-gray-900/50'}`}>
              Step 1: Rate Your Picks
            </div>
          )}
          <div className={`flex-1 text-center py-3 text-sm font-medium transition ${tab === 'ux' ? 'border-b-2 border-grove-500 text-grove-700 dark:text-grove-300' : 'text-bark-400 dark:text-gray-400 bg-cream-50 dark:bg-gray-900/50'}`}>
            {orderLoaded ? 'Step 2: Website Experience' : 'Website Experience'}
          </div>
        </div>

        <div className="p-6">
          {error && <div className="text-red-500 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/30 rounded-xl mb-4 animate-shake">{error}</div>}

          {/* Product Feedback Tab */}
          {tab === 'product' && orderLoaded && (
            <form onSubmit={handleNextStep} className="space-y-6 animate-fade-in">
              <p className="text-sm text-bark-600 dark:text-cream-100 mb-4">How fresh were your picks for order #{orderId}?</p>
              
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-cream-50 dark:bg-gray-700 rounded-xl border border-cream-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-bark-800 dark:text-cream-50 flex items-center gap-2">
                      <span className="text-xl">{item.product.emoji}</span>
                      {item.product.name}
                    </span>
                    <StarRating 
                      rating={productRatings[item.product.name] || 0} 
                      onChange={(val) => setProductRatings(prev => ({...prev, [item.product.name]: val}))}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-bark-700 dark:text-cream-100 mb-1">Additional Comments (Optional)</label>
                <textarea 
                  className="input min-h-[80px] resize-none"
                  placeholder="Tell us more about your fresh picks..."
                  value={productComments}
                  onChange={e => setProductComments(e.target.value)}
                />
              </div>

              <button type="submit" className="w-full btn-primary flex justify-center items-center gap-2">
                Next: Rate Website <span className="text-lg">→</span>
              </button>
            </form>
          )}

          {/* UX Feedback Tab */}
          {tab === 'ux' && (
            <form onSubmit={handleSubmitAll} className="space-y-6 animate-fade-in">
              <div className="text-center py-4">
                <p className="text-sm text-bark-600 dark:text-cream-100 mb-2 font-medium">How was your experience using our website?</p>
                <div className="flex justify-center mb-2">
                  <StarRating rating={uxRating} onChange={setUxRating} />
                </div>
                <p className="text-xs text-bark-400 dark:text-bark-300">
                  {uxRating === 1 && "Poor"}
                  {uxRating === 2 && "Fair"}
                  {uxRating === 3 && "Good"}
                  {uxRating === 4 && "Very Good"}
                  {uxRating === 5 && "Excellent"}
                </p>
              </div>

              {!orderLoaded && (
                <div>
                  <label className="block text-sm font-medium text-bark-700 dark:text-cream-100 mb-1">Order ID (Optional)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Enter your order number if applicable"
                    value={orderId}
                    onChange={e => setOrderId(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-bark-700 dark:text-cream-100 mb-1">What can we improve?</label>
                <textarea 
                  className="input min-h-[120px] resize-none"
                  placeholder="Tell us what you liked or what we can do better..."
                  value={uxComments}
                  onChange={e => setUxComments(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                {orderLoaded && (
                  <button 
                    type="button" 
                    onClick={() => { setTab('product'); setError(""); }}
                    className="px-6 py-3 rounded-xl border border-cream-300 dark:border-bark-600 text-bark-600 dark:text-cream-100 font-medium hover:bg-cream-50 dark:hover:bg-bark-700 transition"
                  >
                    Back
                  </button>
                )}
                <button type="submit" disabled={loading} className="flex-1 btn-primary">
                  {loading ? "Submitting..." : "Submit All Feedback"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      <div className="absolute top-4 left-4">
        <Link href="/order" className="text-grove-600 dark:text-grove-300 text-sm hover:underline">
          ← Back to Shop
        </Link>
      </div>
    </div>
  );
}
