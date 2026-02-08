'use client';

import { useEffect, useState } from 'react';

export default function ReportsPage() {
  const [daily, setDaily] = useState<{ totalSales: number; transactionCount: number } | null>(null);
  const [profit, setProfit] = useState<{ revenue: number; cost: number; profit: number; margin: number } | null>(null);
  const [inventory, setInventory] = useState<{ totalValue: number } | null>(null);
  const [lowStock, setLowStock] = useState<unknown[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    fetch('/api/reports/daily-sales', { headers: h }).then((r) => r.json()).then(setDaily).catch(() => setDaily(null));
    fetch('/api/reports/profit', { headers: h }).then((r) => r.json()).then(setProfit).catch(() => setProfit(null));
    fetch('/api/reports/inventory-valuation', { headers: h }).then((r) => r.json()).then(setInventory).catch(() => setInventory(null));
    fetch('/api/reports/low-stock', { headers: h }).then((r) => r.json()).then(setLowStock).catch(() => setLowStock([]));
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-slate-600 mb-2">Today&apos;s Sales</h3>
          <p className="text-2xl font-bold text-emerald-600">${daily?.totalSales?.toFixed(2) ?? '0.00'}</p>
          <p className="text-sm text-slate-500">{daily?.transactionCount ?? 0} transactions</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-slate-600 mb-2">Profit (All Time)</h3>
          <p className="text-2xl font-bold">${profit?.profit?.toFixed(2) ?? '0.00'}</p>
          <p className="text-sm text-slate-500">Revenue: ${profit?.revenue?.toFixed(2) ?? '0'} · Margin: {(profit?.margin ?? 0).toFixed(1)}%</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-slate-600 mb-2">Inventory Value</h3>
          <p className="text-2xl font-bold">${inventory?.totalValue?.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-slate-600 mb-2">Low Stock</h3>
          <p className="text-2xl font-bold text-amber-600">{Array.isArray(lowStock) ? lowStock.length : 0} products</p>
        </div>
      </div>
    </div>
  );
}
