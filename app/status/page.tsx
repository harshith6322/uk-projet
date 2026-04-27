"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function OrderStatus() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [enableCaptcha, setEnableCaptcha] = useState(false);
  const [captchaNum1, setCaptchaNum1] = useState(1);
  const [captchaNum2, setCaptchaNum2] = useState(1);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const [allowCancellation, setAllowCancellation] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.enableCaptcha) {
          setEnableCaptcha(true);
          setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
          setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
        }
        if (data.allowCustomerCancellation) {
          setAllowCancellation(true);
        }
      })
      .catch(() => {});

    // Dark mode sync
    const saved = localStorage.getItem("fresh_picks_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const checkStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    if (enableCaptcha) {
      if (parseInt(captchaAnswer) !== captchaNum1 + captchaNum2) {
        setError("Incorrect security answer.");
        setCaptchaAnswer("");
        setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
        setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CAPTCHA_FAILED_TRACKING', details: `Failed captcha on order tracking for ID: ${orderId}` })
        });
        return;
      }
    }

    setLoading(true);
    setError("");
    setStatus(null);
    setCancelSuccess(false);
    setCancelError("");
    try {
      const res = await fetch(`/api/orders/${orderId.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setError("Order not found. Please check your Order ID.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setShowConfirm(false);
    setCancelLoading(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/orders/${status.orderNumber}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCancelSuccess(true);
        setStatus((prev: any) => ({ ...prev, status: 'cancelled' }));
      } else {
        setCancelError(data.error || "Could not cancel the order.");
      }
    } catch {
      setCancelError("An error occurred while cancelling.");
    } finally {
      setCancelLoading(false);
    }
  };

  const canCancel = allowCancellation && status && status.status === 'pending' && !cancelSuccess;

  return (
    <div className="min-h-screen bg-grove-50 dark:bg-gray-900 pattern-bg flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-transparent dark:border-gray-700">
        <div className="bg-grove-700 p-6 text-center">
          <Link href="/order" className="inline-block text-4xl mb-2 hover:scale-110 transition-transform">🌿</Link>
          <h1 className="font-serif text-2xl text-white">Track Your Order</h1>
          <p className="text-grove-200 text-sm mt-1">Real-time status updates</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={checkStatus} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-cream-100 mb-1">
                Order ID or Phone Number
              </label>
              <input
                type="text"
                placeholder="Order ID or Phone Number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="input"
              />
            </div>
            
            {enableCaptcha && (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/30">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200 flex-1">
                  Security Check: What is {captchaNum1} + {captchaNum2}?
                </span>
                <input
                  type="number"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-16 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-cream-50 text-gray-800"
                  placeholder="?"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-grove-600 hover:bg-grove-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md"
            >
              {loading ? "..." : "Track"}
            </button>
          </form>

          {error && <div className="text-red-500 dark:text-red-400 text-center text-sm p-4 bg-red-50 dark:bg-red-900/30 rounded-xl mb-4">{error}</div>}

          {status && (
            <div className="animate-slide-up space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-mono">{status.orderNumber}</span>
                <span className="font-bold text-gray-800 dark:text-cream-100">{status.name}</span>
              </div>

              {/* Status Animation Container */}
              <div className="relative py-8">
                {status.status === "pending" && (
                  <div className="text-center animate-pulse">
                    <div className="text-6xl mb-4">🛒</div>
                    <h2 className="text-xl font-serif text-grove-700">Order Confirmed!</h2>
                    <p className="text-gray-500 text-sm mt-2">We are gathering your fresh picks.</p>
                  </div>
                )}
                
                {status.status === "collected" && (
                  <div className="text-center animate-bounce-slow">
                    <div className="text-6xl mb-4">🛍️</div>
                    <h2 className="text-xl font-serif text-green-600">Packed &amp; Ready!</h2>
                    <p className="text-gray-500 text-sm mt-2">Your order is ready for collection.</p>
                  </div>
                )}

                {status.status === "cancelled" && (
                  <div className="text-center opacity-70">
                    <div className="text-6xl mb-4 grayscale">❌</div>
                    <h2 className="text-xl font-serif text-red-600">Order Cancelled</h2>
                    <p className="text-gray-500 text-sm mt-2">Please contact us if this was a mistake.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-cream-200 dark:border-bark-500 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-cream-50 mb-3">Order Details</h3>
                <div className="space-y-2">
                  {status.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>{item.quantity}x {item.product.name}</span>
                      <span>£{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-grove-800 dark:text-grove-300 pt-2 border-t border-cream-100 dark:border-bark-500">
                    <span>Total</span>
                    <span>£{Number(status.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Cancel Section */}
              {canCancel && !showConfirm && (
                <div className="border-t border-cream-200 dark:border-bark-500 pt-4">
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={cancelLoading}
                    className="w-full py-3 px-4 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition text-sm"
                  >
                    🚫 Cancel This Order
                  </button>
                </div>
              )}

              {/* Confirmation Dialog */}
              {showConfirm && (
                <div className="border-t border-red-200 dark:border-red-800 pt-4 animate-fade-in">
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 mb-3">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Are you sure?</p>
                    <p className="text-xs text-red-600 dark:text-red-400">This will permanently cancel your order and restore the stock. This cannot be undone.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition shadow-md"
                    >
                      {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
                    </button>
                  </div>
                </div>
              )}

              {cancelError && (
                <div className="text-red-500 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
                  {cancelError}
                </div>
              )}

              {cancelSuccess && (
                <div className="text-green-700 dark:text-green-300 text-sm p-3 bg-green-50 dark:bg-green-900/30 rounded-xl text-center">
                  ✅ Your order has been cancelled. Stock has been restored.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Link href="/order" className="mt-6 text-grove-600 dark:text-grove-300 text-sm hover:underline">
        ← Back to Shop
      </Link>
    </div>
  );
}
