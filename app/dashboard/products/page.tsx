'use client';

import { useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
  unit: string;
  sellingPrice?: string;
  batches: { quantity: number; expiryDate: string }[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', barcode: '', sku: '', unit: 'pcs', sellingPrice: '', category: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const load = () => {
    if (!token) return;
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    fetch(`/api/products${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  };

  useEffect(() => {
    load();
  }, [token, search]);

  const save = async () => {
    if (!token) return;
    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    const method = editing ? 'PUT' : 'POST';
    const body = editing
      ? { name: form.name, barcode: form.barcode || undefined, sku: form.sku || undefined, unit: form.unit, sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined }
      : { ...form, sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', barcode: '', sku: '', unit: 'pcs', sellingPrice: '', category: '' });
      load();
    } else {
      const d = await res.json();
      alert(d.error || 'Failed');
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', barcode: '', sku: '', unit: 'pcs', sellingPrice: '', category: '' });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      barcode: p.barcode || '',
      sku: p.sku || '',
      unit: p.unit || 'pcs',
      sellingPrice: p.sellingPrice || '',
      category: '',
    });
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <button onClick={openAdd} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            Add Product
          </button>
        </div>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Barcode</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Stock</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.batches.reduce((s, b) => s + b.quantity, 0);
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.barcode || '-'}</td>
                  <td className="p-3">${Number(p.sellingPrice || 0).toFixed(2)}</td>
                  <td className="p-3">{stock}</td>
                  <td className="p-3">
                    <button onClick={() => openEdit(p)} className="text-emerald-600 hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <div className="space-y-3">
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                placeholder="Selling Price"
                type="number"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button onClick={save} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
