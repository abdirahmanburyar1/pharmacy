'use client';

import { useState, useRef, useEffect } from 'react';

type CartItem = { productId: string; name: string; quantity: number; unitPrice: number; totalPrice: number };

export default function POSPage() {
  const [products, setProducts] = useState<{
    id: string;
    name: string;
    barcode?: string;
    sellingPrice?: string | number;
    batches: { quantity: number }[];
  }[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [token]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeRef.current?.focus();
      }
    };
    window.addEventListener('keypress', fn);
    return () => window.removeEventListener('keypress', fn);
  }, []);

  const addToCart = (p: (typeof products)[0], qty = 1) => {
    const price = Number(p.sellingPrice) || 0;
    if (price <= 0) return;
    const total = p.batches.reduce((s, b) => s + b.quantity, 0);
    if (total < qty) return;
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      if (existing.quantity + qty > total) return;
      setCart(cart.map((c) => (c.productId === p.id ? { ...c, quantity: c.quantity + qty, totalPrice: (c.quantity + qty) * c.unitPrice } : c)));
    } else {
      setCart([...cart, { productId: p.id, name: p.name, quantity: qty, unitPrice: price, totalPrice: qty * price }]);
    }
  };

  const handleBarcode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).querySelector('input');
    const code = input?.value?.trim();
    if (!code) return;
    const p = products.find((x) => x.barcode === code);
    if (p) addToCart(p);
    else {
      const bySearch = products.filter(
        (x) => x.name.toLowerCase().includes(code.toLowerCase()) || x.barcode?.includes(code)
      );
      if (bySearch.length === 1) addToCart(bySearch[0]);
    }
    input!.value = '';
  };

  const subtotal = cart.reduce((s, c) => s + c.totalPrice, 0);
  const finalTotal = Math.max(0, subtotal - discount);

  const completeSale = async () => {
    if (cart.length === 0 || !token) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
          payments: [{ method: payMethod, amount: finalTotal }],
          discount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastSale(data.saleNumber);
        setCart([]);
        setDiscount(0);
      } else {
        alert(data.error || 'Sale failed');
      }
    } catch {
      alert('Sale failed');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(search.toLowerCase())
      )
    : products.slice(0, 50);

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      <div className="flex-1 flex flex-col">
        <form onSubmit={handleBarcode} className="mb-4">
          <input
            ref={barcodeRef}
            type="text"
            placeholder="Barcode or search..."
            className="w-full px-4 py-2 border rounded-lg text-lg"
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="flex-1 overflow-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {filtered.map((p) => {
            const stock = p.batches.reduce((s, b) => s + b.quantity, 0);
            const price = Number(p.sellingPrice) || 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                disabled={stock === 0 || price <= 0}
                className="p-3 border rounded-lg text-left hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-sm text-slate-600">${price.toFixed(2)} · {stock} left</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="w-80 bg-white border rounded-lg p-4 flex flex-col">
        <h2 className="font-bold mb-4">Cart</h2>
        <div className="flex-1 overflow-auto space-y-2">
          {cart.map((c) => (
            <div key={c.productId} className="flex justify-between text-sm">
              <span className="truncate">{c.name} × {c.quantity}</span>
              <span>${c.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              placeholder="Discount"
              className="w-24 px-2 py-1 border rounded"
            />
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
          <select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-2"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile</option>
          </select>
          <button
            onClick={completeSale}
            disabled={cart.length === 0 || processing}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Complete Sale'}
          </button>
          {lastSale && <p className="text-sm text-emerald-600 mt-2">Sale #{lastSale}</p>}
        </div>
      </div>
    </div>
  );
}
