"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id: number;
  orderNumber: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  notes: string;
  items: {
    quantity: number;
    price: number;
    product: { name: string; emoji: string; unit: string };
  }[];
};
type Product = {
  id: number;
  name: string;
  emoji: string;
  price: number;
  unit: string;
  stock: number;
  active: boolean;
};
type Stats = {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingOrders: number;
  topProduct: string;
  itemTotals: { name: string; emoji: string; total: number; unit: string }[];
  bestSellers: { name: string; qty: number }[];
  salesByDay: { day: string; revenue: number }[];
  topCustomers: { phone: string; name: string; totalSpent: number; orders: number }[];
  feedbackStats?: {
    avgProductRating: string | number;
    avgUxRating: string | number;
    recentComments: { id: string; type: string; rating: number; comment: string; date: string }[];
  };
};

type AuditLog = {
  timestamp: string;
  ip: string;
  action: string;
  details: string;
};

type Tab = "dashboard" | "orders" | "stock" | "audit";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showUrgency, setShowUrgency] = useState(true);
  const [haltStore, setHaltStore] = useState(false);
  const [enableEmails, setEnableEmails] = useState(true);
  const [enableCaptcha, setEnableCaptcha] = useState(false);
  const [allowCustomerCancellation, setAllowCustomerCancellation] = useState(false);
  const [enableFeedback, setEnableFeedback] = useState(true);
  const [enableTracking, setEnableTracking] = useState(true);
  const [enableNotice, setEnableNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [haltMessage, setHaltMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const getMonday = (d: Date) => {
    const nd = new Date(d);
    const day = nd.getDay();
    const diff = nd.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(nd.setDate(diff)).toISOString().split('T')[0];
  };
  const getFriday = (d: Date) => {
    const nd = new Date(d);
    const day = nd.getDay();
    const diff = nd.getDate() - day + (day === 0 ? -6 : 1) + 4;
    return new Date(nd.setDate(diff)).toISOString().split('T')[0];
  };

  const [prepStartDate, setPrepStartDate] = useState(() => getMonday(new Date()));
  const [prepEndDate, setPrepEndDate] = useState(() => getFriday(new Date()));

  const prepSummary = useMemo(() => {
    const start = new Date(prepStartDate); start.setHours(0,0,0,0);
    const end = new Date(prepEndDate); end.setHours(23,59,59,999);
    
    const activeOrders = orders.filter(o => o.status === 'pending' && new Date(o.createdAt) >= start && new Date(o.createdAt) <= end);
    const totals: Record<number, { name: string, emoji: string, unit: string, qty: number }> = {};
    
    products.forEach(p => { if (p.active) totals[p.id] = { name: p.name, emoji: p.emoji, unit: p.unit, qty: 0 } });
    
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        const p = products.find(prod => prod.name === item.product.name);
        if (p && totals[p.id]) {
          totals[p.id].qty += item.quantity;
        }
      });
    });
    
    return { activeOrders, totals: Object.values(totals).filter(t => t.qty > 0).sort((a,b) => b.qty - a.qty) };
  }, [orders, products, prepStartDate, prepEndDate]);

  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', emoji: '🛒', description: '', price: 1, unit: 'item', stock: 10, maxPerOrder: 5 });
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupPassword, setCleanupPassword] = useState("");
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupCaptcha1, setCleanupCaptcha1] = useState(1);
  const [cleanupCaptcha2, setCleanupCaptcha2] = useState(1);
  const [cleanupCaptchaAnswer, setCleanupCaptchaAnswer] = useState("");
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    const t = Date.now();
    const [oRes, pRes, sRes, aRes, setRes] = await Promise.all([
      fetch(`/api/admin/orders?t=${t}`, { cache: 'no-store' }),
      fetch(`/api/admin/products?t=${t}`, { cache: 'no-store' }),
      fetch(`/api/admin/stats?t=${t}`, { cache: 'no-store' }),
      fetch(`/api/admin/audit?t=${t}`, { cache: 'no-store' }),
      fetch(`/api/admin/settings?t=${t}`, { cache: 'no-store' }),
    ]);
    if (oRes.status === 401) {
      router.push("/admin/login");
      return;
    }
    const [o, p, s, a, settings] = await Promise.all([
      oRes.json(),
      pRes.json(),
      sRes.json(),
      aRes.json(),
      setRes.json(),
    ]);
    setOrders(Array.isArray(o) ? o : []);
    setProducts(Array.isArray(p) ? p : []);
    setAuditLogs(Array.isArray(a) ? a : []);
    setStats(s);
    if (settings.showUrgency !== undefined) setShowUrgency(settings.showUrgency);
    if (settings.haltStore !== undefined) setHaltStore(settings.haltStore);
    if (settings.enableEmails !== undefined) setEnableEmails(settings.enableEmails);
    if (settings.enableCaptcha !== undefined) setEnableCaptcha(settings.enableCaptcha);
    if (settings.allowCustomerCancellation !== undefined) setAllowCustomerCancellation(settings.allowCustomerCancellation);
    if (settings.enableFeedback !== undefined) setEnableFeedback(settings.enableFeedback);
    if (settings.haltMessage !== undefined) setHaltMessage(settings.haltMessage);
    if (settings.enableTracking !== undefined) setEnableTracking(settings.enableTracking);
    if (settings.enableNotice !== undefined) setEnableNotice(settings.enableNotice);
    if (settings.noticeMessage !== undefined) setNoticeMessage(settings.noticeMessage);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: number | string, status: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const updateStock = async (id: number, stock: number) => {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock }),
    });
    load();
  };

  const toggleActive = async (id: number, active: boolean) => {
    // Optimistic update for instant UI feedback
    setProducts(products.map(p => p.id === id ? { ...p, active } : p));
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    // Still load to ensure consistency in background
    load();
  };

  const addProduct = async () => {
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });
    setShowAddProduct(false);
    setNewProduct({ name: '', emoji: '🛒', description: '', price: 1, unit: 'item', stock: 10, maxPerOrder: 5 });
    load();
  };

  const toggleUrgencySetting = async () => {
    const nextVal = !showUrgency;
    setShowUrgency(nextVal);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showUrgency: nextVal }),
    });
  };

  const triggerCleanup = () => {
    setCleanupCaptcha1(Math.floor(Math.random() * 10) + 1);
    setCleanupCaptcha2(Math.floor(Math.random() * 10) + 1);
    setCleanupPassword("");
    setCleanupDays(30);
    setCleanupCaptchaAnswer("");
    setCleanupError("");
    setShowCleanupModal(true);
  };

  const confirmCleanup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(cleanupCaptchaAnswer) !== cleanupCaptcha1 + cleanupCaptcha2) {
      setCleanupError("Incorrect security answer.");
      return;
    }

    setCleanupLoading(true);
    setCleanupError("");
    
    try {
      const res = await fetch("/api/admin/orders/cleanup", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cleanupPassword, days: cleanupDays })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.deletedCount > 0 && data.csvData) {
          const blob = new Blob([data.csvData], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.setAttribute('hidden', '');
          a.setAttribute('href', url);
          a.setAttribute('download', `old_orders_backup_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        alert(`Successfully deleted ${data.deletedCount} old order(s)${data.deletedCount > 0 ? ' and downloaded backup.' : '.'}`);
        setShowCleanupModal(false);
        load();
      } else {
        setCleanupError(data.error || "Failed to clear old orders.");
      }
    } catch (e) {
      setCleanupError("An error occurred while cleaning up.");
    } finally {
      setCleanupLoading(false);
    }
  };

  const downloadPrepSheet = () => {
    const activeProducts = products.filter(p => p.active);
    const activeOrders = prepSummary.activeOrders;

    if (activeOrders.length === 0) {
      alert("No pending orders to generate a prep sheet for.");
      return;
    }

    let csv = "Name," + activeProducts.map(p => p.name.replace(/,/g, '')).join(",") + ",Total Amount\n";

    const productTotals: Record<number, number> = {};
    activeProducts.forEach(p => productTotals[p.id] = 0);
    let grandTotalAmount = 0;

    activeOrders.forEach(o => {
      let row = `"${o.name.replace(/"/g, '""')}",`;
      activeProducts.forEach(p => {
        const item = o.items.find(i => i.product.name === p.name);
        const qty = item ? item.quantity : 0;
        productTotals[p.id] += qty;
        row += `${qty},`;
      });
      grandTotalAmount += o.totalAmount;
      row += `£${o.totalAmount.toFixed(2)}\n`;
      csv += row;
    });

    let totalRow = "TOTAL,";
    activeProducts.forEach(p => {
      totalRow += `${productTotals[p.id]},`;
    });
    totalRow += `£${grandTotalAmount.toFixed(2)}\n\n\n`;
    csv += totalRow;

    activeProducts.forEach(p => {
      if (productTotals[p.id] > 0) {
        csv += `"${p.name.replace(/"/g, '""')}","${productTotals[p.id]} ${p.unit}s"\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `prep_sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const filteredOrders = (filter === "all" ? orders : orders.filter((o) => o.status === filter))
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString(),
  );

  if (loading)
    return (
      <div className="min-h-screen bg-grove-900 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-5xl mb-4">🌿</div>
          <p className="text-grove-300 font-serif italic">Loading dashboard…</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <div className="flex">
        <aside className="hidden w-56 min-h-screen bg-gray-900 border-r border-gray-800 sm:flex flex-col fixed top-0 left-0 z-30">
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="font-serif text-white text-sm font-semibold">
                  Fresh Picks
                </p>
                <p className="text-gray-500 text-xs">Admin</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {(
              [
                ["dashboard", "📊", "Dashboard"],
                ["orders", "📋", "Orders"],
                ["stock", "📦", "Stock"],
                ["audit", "🛡️", "Audit Logs"],
              ] as const
            ).map(([t, icon, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${tab === t ? "bg-grove-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {t === "orders" && (stats?.pendingOrders ?? 0) > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {stats?.pendingOrders}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-800">
            <a
              href="/order"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-800 text-sm transition mb-1"
            >
              <span>🛍️</span>
              <span>View Shop</span>
            </a>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:bg-red-900/30 hover:text-red-400 text-sm transition"
            >
              <span>🔒</span>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40 flex justify-around p-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {(
            [
              ["dashboard", "📊"],
              ["orders", "📋"],
              ["stock", "📦"],
              ["audit", "🛡️"],
            ] as const
          ).map(([t, icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`p-3 rounded-xl transition relative ${tab === t ? "bg-grove-700 text-white" : "text-gray-400"}`}
            >
              <span className="text-xl">{icon}</span>
              {t === "orders" && (stats?.pendingOrders ?? 0) > 0 && (
                <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {stats?.pendingOrders}
                </span>
              )}
            </button>
          ))}
          <button onClick={logout} className="p-3 text-red-400 hover:bg-red-900/30 rounded-xl transition">
            <span className="text-xl">🔒</span>
          </button>
        </nav>

        {/* Main */}
        <main className="ml-0 sm:ml-56 flex-1 p-4 sm:p-6 min-h-screen pb-24 sm:pb-6 overflow-x-hidden">
          {/* Dashboard Tab */}
          {tab === "dashboard" && stats && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl text-white mb-6">Dashboard</h2>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Today's orders",
                    value: stats.todayOrders,
                    icon: "📋",
                    color: "text-blue-400",
                  },
                  {
                    label: "Today's revenue",
                    value: `£${Number(stats?.todayRevenue ?? 0).toFixed(2)}`,
                    icon: "💷",
                    color: "text-green-400",
                  },
                  {
                    label: "Pending orders",
                    value: stats?.pendingOrders ?? 0,
                    icon: "⏳",
                    color: "text-amber-400",
                  },
                  {
                    label: "Total revenue",
                    value: `£${Number(stats?.totalRevenue ?? 0).toFixed(2)}`,
                    icon: "📈",
                    color: "text-purple-400",
                  },
                ].map(({ label, value, icon, color }) => (
                  <div
                    key={label}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-500 text-xs uppercase tracking-widest">
                        {label}
                      </p>
                      <span className="text-xl">{icon}</span>
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Store Operations */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <h3 className="font-serif text-lg text-white mb-4">
                  Store Operations
                </h3>
                <div className="space-y-4">
                  <div>
                    <button
                      onClick={async () => {
                        const next = !haltStore;
                        setHaltStore(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ haltStore: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${haltStore ? 'bg-red-900 hover:bg-red-800 text-red-100 border border-red-700' : 'bg-green-900 hover:bg-green-800 text-green-100 border border-green-700'}`}
                    >
                      {haltStore ? '🚫 Store Halted (Click to Resume)' : '✅ Store Active (Click to Halt)'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {haltStore ? 'Customers currently cannot see products or place orders.' : 'Customers can browse and place orders normally.'}
                    </p>
                  </div>
                  {haltStore && (
                    <div className="flex gap-2 animate-slide-up">
                      <input 
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-grove-500" 
                        value={haltMessage}
                        onChange={(e) => setHaltMessage(e.target.value)}
                        placeholder="e.g. We are out of stock for the week. See you next Tuesday!"
                      />
                      <button
                        onClick={async () => {
                          await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ haltMessage }) });
                          alert('Halt message updated successfully!');
                        }}
                        className="bg-grove-600 hover:bg-grove-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-md"
                      >
                        Save Message
                      </button>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <button
                      onClick={async () => {
                        const next = !enableEmails;
                        setEnableEmails(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ enableEmails: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${enableEmails ? 'bg-blue-900 hover:bg-blue-800 text-blue-100 border border-blue-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
                    >
                      {enableEmails ? '📧 Email Notifications Active' : '🔕 Email Notifications Disabled'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {enableEmails ? 'Customers receive order confirmations and status updates.' : 'No automated emails will be sent to customers.'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <button
                      onClick={async () => {
                        const next = !enableCaptcha;
                        setEnableCaptcha(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ enableCaptcha: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${enableCaptcha ? 'bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
                    >
                      {enableCaptcha ? '🛡️ Anti-Bot Captcha Active' : '🔓 Anti-Bot Captcha Disabled'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {enableCaptcha ? 'Public tracking and admin login forms require solving a math challenge.' : 'No captcha is required for forms.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <button
                      onClick={async () => {
                        const next = !allowCustomerCancellation;
                        setAllowCustomerCancellation(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ allowCustomerCancellation: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${allowCustomerCancellation ? 'bg-red-900 hover:bg-red-800 text-red-100 border border-red-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
                    >
                      {allowCustomerCancellation ? '🚫 Customer Cancellation Enabled' : '🔒 Customer Cancellation Disabled'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {allowCustomerCancellation ? 'Customers can cancel their own pending orders from the tracking page.' : 'Only admins can cancel orders.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <button
                      onClick={async () => {
                        const next = !enableFeedback;
                        setEnableFeedback(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ enableFeedback: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${enableFeedback ? 'bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border border-indigo-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
                    >
                      {enableFeedback ? '⭐ Feedback Emails Enabled' : '⏸️ Feedback Emails Disabled'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {enableFeedback ? 'Customers receive a feedback link in their delivery email to rate products.' : 'No feedback links are sent to customers.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <button
                      onClick={async () => {
                        const next = !enableTracking;
                        setEnableTracking(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ enableTracking: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${enableTracking ? 'bg-cyan-900 hover:bg-cyan-800 text-cyan-100 border border-cyan-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
                    >
                      {enableTracking ? '📍 Public Order Tracking Enabled' : '🔒 Public Order Tracking Disabled'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {enableTracking ? 'Customers can track their orders using their order number and phone number.' : 'The public tracking page link is hidden from the shop.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <button
                      onClick={async () => {
                        const next = !enableNotice;
                        setEnableNotice(next);
                        await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ enableNotice: next }) });
                      }}
                      className={`px-4 py-3 w-full sm:w-auto font-medium rounded-xl transition shadow-lg ${enableNotice ? 'bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
                    >
                      {enableNotice ? '📢 Notice Banner Active' : '🔇 Notice Banner Disabled'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      {enableNotice ? 'Customers will see a blinking banner with the custom message below.' : 'No special notice banner is shown.'}
                    </p>
                  </div>
                  {enableNotice && (
                    <div className="flex gap-2 animate-slide-up mt-3">
                      <input 
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-grove-500" 
                        value={noticeMessage}
                        onChange={(e) => setNoticeMessage(e.target.value)}
                        placeholder="e.g. Please place orders by 7:00 AM Friday..."
                      />
                      <button
                        onClick={async () => {
                          await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ noticeMessage }) });
                          alert('Notice message updated successfully!');
                        }}
                        className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-medium transition shadow-md"
                      >
                        Save Notice
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                
                {/* Revenue Chart (7 Days) */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-serif text-lg text-white mb-6">Revenue Over Time (Last 7 Days)</h3>
                  <div className="h-48 flex items-end justify-between gap-2 mt-4">
                    {stats?.salesByDay?.map((day, i) => {
                      const maxRev = Math.max(...(stats?.salesByDay.map(d => d.revenue) || [1]));
                      const heightPercent = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 gap-2 group relative">
                          <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                            £{day.revenue.toFixed(2)}
                          </div>
                          <div className="w-full bg-gray-800 rounded-t-sm flex items-end justify-center h-full">
                            <div 
                              className="w-full bg-grove-500 hover:bg-grove-400 transition-all rounded-t-sm"
                              style={{ height: `${heightPercent}%`, minHeight: day.revenue > 0 ? '4px' : '0' }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium uppercase">{day.day}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top Customers Leaderboard */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-serif text-lg text-white mb-4">Top Customers (All Time)</h3>
                  <div className="space-y-4">
                    {stats?.topCustomers?.map((c, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-400 text-xs">
                            #{i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{c.name}</p>
                            <p className="text-[10px] text-gray-500">{c.phone} • {c.orders} Orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-grove-400">£{c.totalSpent.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                    {(!stats?.topCustomers || stats.topCustomers.length === 0) && (
                      <p className="text-gray-500 text-sm">No customers yet.</p>
                    )}
                  </div>
                </div>

                {/* Best Selling Products */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 lg:col-span-2">
                  <h3 className="font-serif text-lg text-white mb-4">Best Sellers Leaderboard</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {stats?.bestSellers?.map((p, i) => (
                      <div key={i} className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50 hover:border-grove-500/50 transition">
                        <div className="text-2xl mb-1 font-bold text-gray-600">#{i + 1}</div>
                        <p className="text-xs font-medium text-white line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-grove-400 mt-1 uppercase font-bold tracking-wider">{p.qty} Sold</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Customer Satisfaction */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <h3 className="font-serif text-lg text-white mb-6">Customer Satisfaction</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50 flex flex-col items-center">
                    <span className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Product Freshness</span>
                    <div className="text-5xl font-serif text-amber-400 mb-2">{stats?.feedbackStats?.avgProductRating || '0.0'}</div>
                    <div className="text-xs text-gray-500">Average Stars out of 5</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50 flex flex-col items-center">
                    <span className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Website Experience</span>
                    <div className="text-5xl font-serif text-grove-400 mb-2">{stats?.feedbackStats?.avgUxRating || '0.0'}</div>
                    <div className="text-xs text-gray-500">Average Stars out of 5</div>
                  </div>
                </div>
                
                {stats?.feedbackStats?.recentComments && stats.feedbackStats.recentComments.length > 0 && (
                  <div className="bg-gray-800/30 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-800/80 border-b border-gray-800 flex justify-between items-center">
                      <span className="text-sm font-medium text-white">Recent Feedback</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-4 space-y-4">
                      {stats.feedbackStats.recentComments.map((c: any, i: number) => (
                        <div key={i} className="flex gap-4 pb-4 border-b border-gray-800/50 last:border-0 last:pb-0">
                          <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-2 min-w-[60px]">
                            <span className="text-xs text-gray-500 uppercase">{c.type}</span>
                            <span className="text-lg text-amber-400 font-bold">{c.rating}★</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-300 italic">"{c.comment}"</p>
                            <p className="text-[10px] text-gray-600 mt-1">Order #{c.id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Prep Sheet Summary */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <h3 className="font-serif text-lg text-white">
                    Prep Sheet Summary
                  </h3>
                  <div className="flex items-center gap-2 text-sm bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <input type="date" value={prepStartDate} onChange={(e) => setPrepStartDate(e.target.value)} className="bg-transparent text-white outline-none text-xs" />
                    <span className="text-gray-500 text-xs">to</span>
                    <input type="date" value={prepEndDate} onChange={(e) => setPrepEndDate(e.target.value)} className="bg-transparent text-white outline-none text-xs" />
                  </div>
                </div>
                {prepSummary.totals.length === 0 ? (
                  <p className="text-gray-500 text-sm">No pending orders found for the selected date range.</p>
                ) : (
                  <div className="space-y-3">
                    {prepSummary.totals.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-4 p-3 bg-gray-800 rounded-xl"
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.name}</p>
                          <p className="text-gray-400 text-sm">
                            {item.unit}s needed
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-grove-400 text-2xl font-bold">
                            {item.qty}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent orders */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-serif text-lg text-white mb-4">
                  Recent Orders
                </h3>
                <div className="space-y-2">
                  {orders.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {o.name}
                        </p>
                        <p className="text-gray-500 text-xs font-mono">
                          {o.orderNumber}
                        </p>
                      </div>
                      <span className={`badge-${o.status} text-xs`}>
                        {o.status}
                      </span>
                      <p className="text-grove-400 font-semibold text-sm">
                        £{o.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {tab === "orders" && (
            <div className="animate-fade-in">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-2xl text-white">Orders</h2>
                  <button onClick={() => load()} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white" title="Refresh Orders">
                    🔄
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["all", "pending", "collected", "cancelled"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filter === f ? "bg-grove-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                    >
                      {f}
                    </button>
                  ))}
                  
                  <div className="h-6 w-px bg-gray-800 mx-1"></div>
                  
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                    className="bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-grove-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  
                  <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block"></div>
                  
                  <div className="flex items-center gap-2 mr-0 xl:mr-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700 w-full sm:w-auto mt-2 sm:mt-0 xl:hidden">
                    <input type="date" value={prepStartDate} onChange={(e) => setPrepStartDate(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none flex-1 text-center" />
                    <span className="text-gray-500 text-xs">to</span>
                    <input type="date" value={prepEndDate} onChange={(e) => setPrepEndDate(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none flex-1 text-center" />
                  </div>
                  <div className="hidden xl:flex items-center gap-2 mr-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700">
                    <input type="date" value={prepStartDate} onChange={(e) => setPrepStartDate(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none" />
                    <span className="text-gray-500 text-xs">to</span>
                    <input type="date" value={prepEndDate} onChange={(e) => setPrepEndDate(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none" />
                  </div>

                  <button
                    onClick={downloadPrepSheet}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-grove-700 text-white hover:bg-grove-600 transition hidden sm:flex items-center gap-1 shadow-sm"
                  >
                    <span>📥</span> Prep Sheet
                  </button>
                  <button
                    onClick={triggerCleanup}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition hidden sm:block border border-red-900/50"
                  >
                    Clear Old Orders (1 Month+)
                  </button>
                </div>
              </div>

              <div className="sm:hidden mb-4 space-y-2 mt-4 border-t border-gray-800 pt-4">
                <button
                  onClick={downloadPrepSheet}
                  className="w-full px-3 py-3 rounded-lg text-sm font-medium bg-grove-700 text-white hover:bg-grove-600 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="text-lg">📥</span> Download Prep Sheet (CSV)
                </button>
                <button
                  onClick={triggerCleanup}
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition border border-red-900/50"
                >
                  Clear Old Orders (1 Month+)
                </button>
              </div>

              <div className="space-y-3">
                {filteredOrders.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <p className="text-gray-500">
                      No {filter === "all" ? "" : filter} orders yet.
                    </p>
                  </div>
                )}
                {filteredOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                  >
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800/50 transition"
                      onClick={() =>
                        setExpandedOrder(expandedOrder === o.id ? null : o.id)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-white font-medium">{o.name}</p>
                          <span className={`badge-${o.status}`}>
                            {o.status}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {o.phone} · {o.orderNumber} ·{" "}
                          {new Date(o.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="text-grove-400 font-bold text-lg">
                        £{o.totalAmount.toFixed(2)}
                      </p>
                      <span className="text-gray-500">
                        {expandedOrder === o.id ? "▲" : "▼"}
                      </span>
                    </div>
                    {expandedOrder === o.id && (
                      <div className="border-t border-gray-800 p-4 animate-fade-in">
                        <div className="space-y-2 mb-4">
                          {o.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span>{item.product.emoji}</span>
                              <span className="text-gray-300">
                                {item.product.name}
                              </span>
                              <span className="text-gray-500">
                                × {item.quantity} {item.product.unit}
                              </span>
                              <span className="ml-auto text-grove-400">
                                £{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {o.notes && (
                          <p className="text-gray-400 text-sm italic mb-4">
                            Note: {o.notes}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {o.status === "pending" && (
                            <>
                              <button
                                onClick={() => updateStatus(o.id, "collected")}
                                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition"
                              >
                                ✓ Mark Collected
                              </button>
                              <button
                                onClick={() => updateStatus(o.id, "cancelled")}
                                className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 text-sm rounded-lg transition"
                              >
                                ✗ Cancel
                              </button>
                            </>
                          )}
                          {o.status === "collected" && (
                            <button
                              onClick={() => updateStatus(o.id, "pending")}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                            >
                              ↩ Revert to Pending
                            </button>
                          )}
                          <div className="flex flex-col gap-1 w-full bg-gray-800/50 p-3 rounded-lg border border-gray-700 mt-2">
                            <p className="text-gray-300 text-sm font-medium border-b border-gray-700 pb-2 mb-1">Customer Details</p>
                            {o.email && <p className="text-gray-400 text-sm">📧 {o.email}</p>}
                            {o.phone && <p className="text-gray-400 text-sm">📞 {o.phone}</p>}
                            <p className="text-gray-400 text-sm">🆔 {o.orderNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Tab */}
          {tab === "stock" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl text-white">
                  Stock Management
                </h2>
                <div className="flex gap-4 items-center">
                  <button
                    onClick={toggleUrgencySetting}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition border ${showUrgency ? 'bg-red-900/40 border-red-800 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                    <span>🔥 Low Stock Urgency:</span>
                    <span className={showUrgency ? 'text-red-400 font-bold' : ''}>{showUrgency ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={() => setShowAddProduct(!showAddProduct)}
                    className="px-4 py-2 bg-grove-600 hover:bg-grove-700 text-white text-sm font-medium rounded-xl transition"
                  >
                    {showAddProduct ? "Cancel" : "+ Add Product"}
                  </button>
                </div>
              </div>

              {showAddProduct && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 animate-slide-up">
                  <h3 className="font-serif text-lg text-white mb-4">Add New Product</h3>
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Emoji</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.emoji} onChange={e => setNewProduct({...newProduct, emoji: e.target.value})} placeholder="🍎" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name *</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Fresh Apples" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Description</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Crisp and sweet" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Price (£) *</label>
                      <input type="number" step="0.1" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unit *</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} placeholder="bag" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Initial Stock</label>
                      <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max/Order</label>
                      <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" value={newProduct.maxPerOrder} onChange={e => setNewProduct({...newProduct, maxPerOrder: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <button onClick={addProduct} disabled={!newProduct.name || !newProduct.emoji} className="px-4 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition w-full">
                    Save Product to Google Sheets
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-gray-900 border rounded-2xl p-5 transition ${p.active ? "border-gray-800" : "border-gray-700 opacity-60"}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{p.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{p.name}</p>
                          {p.stock === 0 && (
                            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">
                              Sold out
                            </span>
                          )}
                          {p.stock > 0 && p.stock <= 5 && (
                            <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full">
                              Low stock
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm">
                          £{p.price.toFixed(2)} / {p.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            updateStock(p.id, Math.max(0, p.stock - 5))
                          }
                          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center justify-center transition"
                        >
                          −5
                        </button>
                        <button
                          onClick={() =>
                            updateStock(p.id, Math.max(0, p.stock - 1))
                          }
                          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center justify-center transition"
                        >
                          −
                        </button>
                        <div className="text-center w-12">
                          <p className="text-2xl font-bold text-white">
                            {p.stock}
                          </p>
                          <p className="text-gray-500 text-xs">{p.unit}s</p>
                        </div>
                        <button
                          onClick={() => updateStock(p.id, p.stock + 1)}
                          className="w-8 h-8 bg-grove-700 hover:bg-grove-600 rounded-lg text-sm flex items-center justify-center transition"
                        >
                          +
                        </button>
                        <button
                          onClick={() => updateStock(p.id, p.stock + 10)}
                          className="w-8 h-8 bg-grove-700 hover:bg-grove-600 rounded-lg text-sm flex items-center justify-center transition"
                        >
                          +10
                        </button>
                      </div>
                      <button
                        onClick={() => toggleActive(p.id, !p.active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${p.active ? "bg-green-900/50 text-green-400 hover:bg-red-900/30 hover:text-red-400" : "bg-gray-700 text-gray-400 hover:bg-green-900/30 hover:text-green-400"}`}
                      >
                        {p.active ? "Active" : "Hidden"}
                      </button>
                    </div>
                    {/* Stock bar */}
                    <div className="mt-3 bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${p.stock === 0 ? "bg-red-500" : p.stock <= 5 ? "bg-amber-500" : "bg-grove-500"}`}
                        style={{
                          width: `${Math.min(100, (p.stock / 50) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Tab */}
          {tab === "audit" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl text-white">Security Audit Logs</h2>
                <button onClick={load} className="text-gray-400 hover:text-white transition">🔄 Refresh</button>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800 text-xs uppercase text-gray-500 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            No security audit logs found.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log, i) => (
                          <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-blue-400">
                              {log.ip}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                log.action.includes('SUCCESS') ? 'bg-green-900/50 text-green-400' :
                                log.action.includes('LOCKED') ? 'bg-red-900/50 text-red-400' :
                                'bg-amber-900/50 text-amber-400'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-pop relative">
            <h3 className="font-serif text-xl text-white mb-4">Add Product</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Emoji</label>
                  <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.emoji} onChange={e => setNewProduct({...newProduct, emoji: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Price (£)</label>
                  <input type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Unit</label>
                  <input type="text" placeholder="e.g. kg, item" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Stock</label>
                  <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Max/Order</label>
                  <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-grove-500" value={newProduct.maxPerOrder} onChange={e => setNewProduct({...newProduct, maxPerOrder: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition text-sm">Cancel</button>
                <button onClick={addProduct} className="flex-1 py-2 rounded-lg bg-grove-600 text-white hover:bg-grove-500 transition text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Confirmation Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-pop relative">
            <h3 className="font-serif text-xl text-red-400 mb-2">Clear Old Orders</h3>
            <p className="text-gray-400 text-sm mb-4">
              Delete orders older than a certain number of days. 
              The deleted data will be automatically downloaded as a backup CSV before deletion.
            </p>
            <form onSubmit={confirmCleanup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Delete orders older than (days)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" 
                  value={cleanupDays} 
                  onChange={e => setCleanupDays(parseInt(e.target.value) || 30)} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Admin Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" 
                  value={cleanupPassword} 
                  onChange={e => setCleanupPassword(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Security Check: {cleanupCaptcha1} + {cleanupCaptcha2}</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" 
                  value={cleanupCaptchaAnswer} 
                  onChange={e => setCleanupCaptchaAnswer(e.target.value)} 
                />
              </div>
              
              {cleanupError && <p className="text-red-400 text-xs">{cleanupError}</p>}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowCleanupModal(false)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition text-sm">Cancel</button>
                <button type="submit" disabled={cleanupLoading} className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition text-sm disabled:opacity-50">
                  {cleanupLoading ? "Deleting..." : "Confirm Deletion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
