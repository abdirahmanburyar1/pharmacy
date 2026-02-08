'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    products: number;
    todaySales: number;
    pendingPurchases: number;
    expiringSoon: number;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/products', { headers: h }).then((r) => r.json()),
      fetch('/api/reports/daily-sales', { headers: h }).then((r) => r.json()),
      fetch('/api/purchases?status=PENDING_APPROVAL', { headers: h }).then((r) => r.json()),
      fetch('/api/batches/expiring-soon?days=30', { headers: h }).then((r) => r.json()),
    ])
      .then(([products, daily, purchases, expiring]) => {
        setStats({
          products: Array.isArray(products) ? products.length : 0,
          todaySales: daily?.totalSales ?? 0,
          pendingPurchases: Array.isArray(purchases) ? purchases.length : 0,
          expiringSoon: Array.isArray(expiring) ? expiring.length : 0,
        });
      })
      .catch(() => setStats({ products: 0, todaySales: 0, pendingPurchases: 0, expiringSoon: 0 }));
  }, []);

  if (!stats) {
    return <div className="text-slate-600">Loading dashboard...</div>;
  }

  const cards = [
    { label: 'Products', value: stats.products, color: 'bg-blue-500' },
    { label: "Today's Sales", value: `$${stats.todaySales.toFixed(2)}`, color: 'bg-emerald-600' },
    { label: 'Pending Purchases', value: stats.pendingPurchases, color: 'bg-amber-500' },
    { label: 'Expiring Soon (30d)', value: stats.expiringSoon, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${c.color} text-white p-4 rounded-lg`}>
            <p className="text-sm opacity-90">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
