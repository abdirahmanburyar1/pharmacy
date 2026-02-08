'use client';

import { useEffect, useState } from 'react';

type Purchase = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  supplier: { name: string };
  createdBy: { name: string };
  items: { quantity: number; product: { name: string } }[];
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [status, setStatus] = useState('');
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; batches: { id: string }[] }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ supplierId: '', items: [{ productId: '', batchNumber: '', expiryDate: '', quantity: 1, unitPrice: 0 }], notes: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const load = () => {
    if (!token) return;
    const q = status ? `?status=${status}` : '';
    fetch(`/api/purchases${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setPurchases)
      .catch(() => setPurchases([]));
  };

  useEffect(() => {
    load();
  }, [token, status]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
    fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [token]);

  const createPurchase = async () => {
    if (!token || !form.supplierId || !form.items.every((i) => i.productId && i.quantity)) return;
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        supplierId: form.supplierId,
        items: form.items.map((i) => ({ ...i, expiryDate: i.expiryDate || new Date().toISOString().slice(0, 10) })),
        notes: form.notes,
      }),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ supplierId: '', items: [{ productId: '', batchNumber: '', expiryDate: '', quantity: 1, unitPrice: 0 }], notes: '' });
      load();
    } else {
      const d = await res.json();
      alert(d.error || 'Failed');
    }
  };

  const submit = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/purchases/${id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) load();
    else alert((await res.json()).error);
  };

  const approve = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/purchases/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) load();
    else alert((await res.json()).error);
  };

  const reject = async (id: string) => {
    if (!token) return;
    const reason = prompt('Rejection reason?');
    const res = await fetch(`/api/purchases/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) load();
    else alert((await res.json()).error);
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { productId: '', batchNumber: '', expiryDate: '', quantity: 1, unitPrice: 0 }] });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchases</h1>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            New Purchase
          </button>
        </div>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Order #</th>
              <th className="text-left p-3">Supplier</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created By</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.orderNumber}</td>
                <td className="p-3">{p.supplier?.name}</td>
                <td className="p-3">${Number(p.totalAmount).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    p.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    p.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    p.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100'
                  }`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3">{p.createdBy?.name}</td>
                <td className="p-3">
                  {p.status === 'DRAFT' && (
                    <button onClick={() => submit(p.id)} className="text-emerald-600 hover:underline mr-2">Submit</button>
                  )}
                  {p.status === 'PENDING_APPROVAL' && (
                    <>
                      <button onClick={() => approve(p.id)} className="text-green-600 hover:underline mr-2">Approve</button>
                      <button onClick={() => reject(p.id)} className="text-red-600 hover:underline">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">New Purchase</h2>
            <div className="space-y-3 mb-4">
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 flex-wrap">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[i] = { ...item, productId: e.target.value };
                      setForm({ ...form, items });
                    }}
                    className="flex-1 min-w-[120px] px-3 py-2 border rounded"
                  >
                    <option value="">Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Batch #"
                    value={item.batchNumber}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[i] = { ...item, batchNumber: e.target.value };
                      setForm({ ...form, items });
                    }}
                    className="w-24 px-3 py-2 border rounded"
                  />
                  <input
                    type="date"
                    value={item.expiryDate}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[i] = { ...item, expiryDate: e.target.value };
                      setForm({ ...form, items });
                    }}
                    className="w-32 px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity || ''}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[i] = { ...item, quantity: parseInt(e.target.value) || 0 };
                      setForm({ ...form, items });
                    }}
                    className="w-20 px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    step="0.01"
                    value={item.unitPrice || ''}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 };
                      setForm({ ...form, items });
                    }}
                    className="w-20 px-3 py-2 border rounded"
                  />
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-emerald-600 hover:underline">+ Add item</button>
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={createPurchase} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
