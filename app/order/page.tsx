"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  emoji: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  maxPerOrder: number;
};
type CartItem = { product: Product; quantity: number };

export default function OrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [showUrgency, setShowUrgency] = useState(true);
  const [haltStore, setHaltStore] = useState(false);
  const [haltMessage, setHaltMessage] = useState("");
  const [enableTracking, setEnableTracking] = useState(true);
  const [enableNotice, setEnableNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"shop" | "checkout">("shop");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/config').then((r) => r.json())
    ]).then(([d, config]) => {
      setProducts(Array.isArray(d) ? d : []);
      if (config) {
        if (config.showUrgency !== undefined) setShowUrgency(config.showUrgency);
        if (config.haltStore !== undefined) setHaltStore(config.haltStore);
        if (config.haltMessage !== undefined) setHaltMessage(config.haltMessage);
        if (config.enableTracking !== undefined) setEnableTracking(config.enableTracking);
        if (config.enableNotice !== undefined) setEnableNotice(config.enableNotice);
        if (config.noticeMessage !== undefined) setNoticeMessage(config.noticeMessage);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("fresh_picks_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
    
    const savedForm = localStorage.getItem("fresh_picks_form");
    if (savedForm) {
      try {
        const form = JSON.parse(savedForm);
        if (form.name) setName(form.name);
        if (form.phone) setPhone(form.phone);
        if (form.email) setEmail(form.email);
        if (form.notes) setNotes(form.notes);
        if (form.step) setStep(form.step);
      } catch (e) {}
    }
    
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("fresh_picks_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("fresh_picks_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("fresh_picks_theme", "light");
      }
      return next;
    });
  };

  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem("fresh_picks_cart", JSON.stringify(cart));
      localStorage.setItem("fresh_picks_form", JSON.stringify({ name, phone, email, notes, step }));
    }
  }, [cart, name, phone, email, notes, step, cartLoaded]);

  const updateCart = (id: number, delta: number, max: number) => {
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, Math.min(cur + delta, max));
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const cartItems: CartItem[] = Object.entries(cart)
    .map(([id, qty]) => ({
      product: products.find((p) => p.id === parseInt(id))!,
      quantity: qty,
    }))
    .filter((i) => i.product);

  const total = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          notes,
          items: Object.entries(cart).map(([id, qty]) => ({
            productId: parseInt(id),
            quantity: qty,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart({});
        setStep("shop");
        setNotes("");
        router.push(`/order-confirmation?order=${data.orderNumber}`);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError("Failed to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-5xl mb-4">🌿</div>
          <p className="text-bark-400 font-serif italic">
            Loading fresh picks…
          </p>
        </div>
      </div>
    );

  if (haltStore) {
    return (
           <div className="min-h-screen pattern-bg flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center animate-slide-up shadow-2xl">
          <div className="text-6xl mb-6 grayscale opacity-80 animate-bounce-slow">🏪</div>
          <h1 className="font-serif text-3xl text-grove-800 mb-4">Store Closed</h1>
          <div className="bg-cream-100 rounded-2xl p-6 mb-8 border border-cream-200">
            <p className="text-bark-700 font-medium text-lg leading-relaxed">
              {haltMessage || "We are out of stock for the week. See you next week!"}
            </p>
          </div>
          <Link href="/status" className="btn-primary w-full text-center inline-block">
            Track an existing order
          </Link>
          <Link href="/admin" className="text-bark-400 text-xs mt-6 inline-block hover:underline">
            Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grove-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl hover:rotate-12 transition-transform">🌿</div>
            <div>
              <h1 className="font-serif text-xl leading-none">{process.env.NEXT_PUBLIC_SITE_NAME || "Fresh Picks"}</h1>
              <p className="text-xs text-grove-100 mt-1 opacity-90">{process.env.NEXT_PUBLIC_SITE_SUBTITLE || "Farm fresh, delivered with love"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative group">
              <Link
                href="/admin"
                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-2 rounded-full bg-grove-800/50 hover:bg-red-900/80 text-white text-xs transition cursor-pointer border border-grove-700 hover:border-red-500/50"
              >
                <span>🔒</span>
                <span className="hidden sm:inline ml-1.5 text-gray-300 group-hover:text-red-200">Admin</span>
              </Link>
              <div className="absolute top-full right-0 mt-2 w-60 bg-red-950 text-red-100 text-xs p-3 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition shadow-xl z-50 pointer-events-none border border-red-800">
                <p className="font-bold text-red-400 mb-1">⚠ RESTRICTED AREA</p>
                <p>This portal is strictly for Admin usage only. Unauthorized access attempts will be detected by the system and logged.</p>
              </div>
            </div>

            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-2 rounded-full bg-grove-500/40 hover:bg-grove-400/60 border border-grove-400/30 text-white text-xs transition cursor-pointer"
              aria-label="Toggle Dark Mode"
            >
              <span>{isDarkMode ? "☀️" : "🌙"}</span>
            </button>

            {enableTracking && (
              <Link 
                href="/status" 
                className="flex items-center gap-1.5 bg-grove-500/40 hover:bg-grove-400/60 border border-grove-400/30 text-white text-xs font-medium px-3 py-2 rounded-full transition shadow-sm animate-pulse"
              >
                <span className="animate-bounce">📍</span>
                <span className="hidden sm:inline">Track Order</span>
              </Link>
            )}
            
            {itemCount > 0 && (
              <button
                onClick={() => setStep("checkout")}
                className="flex items-center gap-2 bg-white text-grove-700 font-medium text-sm px-4 py-2 rounded-full hover:bg-cream-100 transition animate-fade-in shadow-md"
              >
                <span>🛒</span>
                <span className="hidden sm:inline">
                  {itemCount} item{itemCount > 1 ? "s" : ""}
                </span>
                <span className="font-bold">£{total.toFixed(2)}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {enableNotice && noticeMessage && (
          <div className="bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 rounded-xl p-4 mb-6 text-center shadow-sm animate-pulse">
            <p className="font-medium whitespace-pre-wrap">{noticeMessage}</p>
          </div>
        )}

        {step === "shop" && (
          <div className="animate-slide-up">
            <div className="text-center mb-10 mt-6 px-4">
              <h2 className="text-3xl md:text-4xl font-serif text-grove-800 dark:text-grove-300 mb-3 drop-shadow-sm">
                {process.env.NEXT_PUBLIC_HERO_TITLE || "This Week's Fresh Picks"}
              </h2>
              {/* <p className="text-bark-500 dark:text-bark-300">
                {process.env.NEXT_PUBLIC_HERO_SUBTITLE || "Place your order before 10 PM · Collection details shared in the group"}
              </p> */}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${itemCount > 0 ? 'pb-32' : ''}`}>
              {products.map((p, i) => {
                const qty = cart[p.id] || 0;
                const outOfStock = p.stock === 0;
                const stockLow = p.stock > 0 && p.stock <= 5;
                return (
                  <div
                    key={p.id}
                    className="card p-4 flex flex-col md:flex-row items-center gap-4 animate-fade-in hover:border-grove-300 transition-colors h-full"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="text-4xl w-16 h-16 flex items-center justify-center bg-cream-100 dark:bg-gray-800 rounded-xl flex-shrink-0">
                      {p.emoji}
                    </div>
                    <div className="flex-1 w-full text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                        <h3 className="font-serif font-semibold text-bark-700 dark:text-cream-100">
                          {p.name}
                        </h3>
                        {outOfStock && (
                          <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 px-2 py-0.5 rounded-full">
                            Sold out
                          </span>
                        )}
                        {stockLow && !outOfStock && showUrgency && (
                          <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 font-bold px-2.5 py-0.5 rounded-full animate-pulse border border-red-200 dark:border-red-800 flex items-center gap-1 shadow-sm">
                            <span>🔥</span> Selling fast! Only {p.stock} left
                          </span>
                        )}
                      </div>
                      <p className="text-bark-400 dark:text-bark-300 text-xs mt-1 line-clamp-2 md:line-clamp-1">
                        {p.description}
                      </p>
                      <p className="text-grove-600 dark:text-grove-300 font-semibold mt-2">
                        £{p.price.toFixed(2)}{" "}
                        <span className="text-bark-400 dark:text-bark-300 font-normal text-xs">
                          / {p.unit}
                        </span>
                      </p>
                    </div>
                    {!outOfStock && (
                      <div className="flex items-center justify-center gap-3 mt-4 md:mt-0 md:ml-auto flex-shrink-0">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() =>
                                updateCart(p.id, -1, p.stock)
                              }
                              className="w-8 h-8 rounded-full border border-cream-400 dark:border-gray-400 flex items-center justify-center hover:bg-cream-200 dark:hover:bg-gray-500 transition text-gray-600 dark:text-cream-100 font-bold"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-gray-700 dark:text-cream-50 animate-pop">
                              {qty}
                            </span>
                            <button
                              onClick={() =>
                                updateCart(
                                  p.id,
                                  1,
                                  Math.min(p.stock, p.stock),
                                )
                              }
                              className="w-8 h-8 rounded-full bg-grove-600 text-white flex items-center justify-center hover:bg-grove-700 transition font-bold"
                              disabled={qty >= Math.min(p.stock, p.stock)}
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              updateCart(
                                p.id,
                                1,
                                Math.min(p.stock, p.stock),
                              )
                            }
                            className="btn-primary text-sm py-2 px-6"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {itemCount > 0 && (
              <div className="fixed bottom-6 left-0 right-0 px-4 z-30">
                <div className="max-w-5xl mx-auto">
                  <button
                    onClick={() => setStep("checkout")}
                    className="w-full btn-primary py-4 text-lg shadow-2xl shadow-grove-900/20"
                  >
                    Review Order · £{total.toFixed(2)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "checkout" && (
          <div className="animate-slide-up max-w-2xl mx-auto">
            <button
              onClick={() => setStep("shop")}
              className="flex items-center gap-2 text-bark-400 hover:text-bark-600 mb-6 transition"
            >
              ← Back to shop
            </button>
            <h2 className="font-serif text-2xl text-grove-700 dark:text-grove-300 mb-6">
              Your Order
            </h2>

            <div className="card p-4 mb-6">
              {cartItems.map(({ product: p, quantity: q }) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-3 border-b border-cream-200 last:border-0"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-bark-700 dark:text-cream-100">{p.name}</p>
                    <p className="text-bark-400 dark:text-bark-300 text-sm">
                      £{p.price.toFixed(2)} × {q} {p.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCart(p.id, -1, p.stock)}
                      className="w-7 h-7 rounded-full border border-cream-400 flex items-center justify-center hover:bg-cream-200 transition text-sm"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-semibold">{q}</span>
                    <button
                      onClick={() =>
                        updateCart(p.id, 1, Math.min(p.stock, p.stock))
                      }
                      className="w-7 h-7 rounded-full bg-grove-600 text-white flex items-center justify-center hover:bg-grove-700 transition text-sm"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-semibold text-grove-700 dark:text-grove-300 w-16 text-right">
                    £{(p.price * q).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 font-bold text-lg">
                <span className="font-serif text-bark-700 dark:text-cream-100">Total</span>
                <span className="text-grove-600 dark:text-grove-300">£{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-serif text-lg text-bark-700 dark:text-cream-100">Your Details</h3>
              <div>
                <label className="block text-sm text-bark-400 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-bark-400 mb-1">
                  WhatsApp number <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  placeholder="+44 7xxx xxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </div>
              <div>
                <label className="block text-sm text-bark-400 mb-1">
                  Email{" "}
                  <span className="text-bark-300 text-xs">
                    (optional – for confirmation)
                  </span>
                </label>
                <input
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm text-bark-400 mb-1">
                  Notes{" "}
                  <span className="text-bark-300 text-xs">(optional)</span>
                </label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Any special requests…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={
                  submitting || !name.trim() || !phone.trim() || itemCount === 0
                }
                className="btn-primary w-full py-4 text-lg mt-2"
              >
                {submitting
                  ? "Placing order…"
                  : `Place Order · £${total.toFixed(2)}`}
              </button>
              <p className="text-center text-bark-400 text-xs">
                Collection details will be shared in the WhatsApp group
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
