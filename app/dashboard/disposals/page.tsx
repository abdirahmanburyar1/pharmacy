'use client';

import { useEffect, useState } from 'react';

type Disposal = {
  id: string;
  referenceNo: string;
  reason: string;
  status: string;
  totalValue: string;
  items: { quantity: number; product: { name: string } }[];
};

export default function DisposalsPage() {
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [status, setStatus] = useState('');
  const [expiredBatches, setExpiredBatches] = useState<{ id: string; batchNumber: string; quantity: number; product: { name: string } }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ reason: 'expired', items: [] as { batchId: string; quantity: number }[], notes: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const load = () => {
    if (!token) return;
    const q = status ? `?status=${status}` : '';
    fetch(`/api/disposals${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setDisposals)
      .catch(() => setDisposals([]));
  };

  useEffect(() => {
    load();
  }, [token, status]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/batches/expired', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setExpiredBatches)
      .catch(() => setExpiredBatches([]));
  }, [token]);

  const createFromExpired = () => {
    const items = expiredBatches.map((b) => ({ batchId: b.id, quantity: b.quantity }));
    setForm({ reason: 'expired', items, notes: 'Bulk disposal of expired stock' });
    setShowModal(true);
  };

  const createDisposal = async () => {
    if (!token || !form.items.length) return;
    const res = await fetch('/api/disposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ reason: 'expired', items: [], notes: '' });
      load();
    } else {
      alert((await res.json()).error);
    }
  };

  const submit = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/disposals/${id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) load();
  };

  const approve = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/disposals/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Disposals</h1>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending</option>
            <option value="APPROVED">Approved</option>
          </select>
          {expiredBatches.length > 0 && (
            <button onClick={createFromExpired} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
              Dispose Expired ({expiredBatches.length})
            </button>
          )}
        </div>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Ref #</th>
              <th className="text-left p-3">Reason</th>
              <th className="text-left p-3">Value</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {disposals.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.referenceNo}</td>
                <td className="p-3">{d.reason}</td>
                <td className="p-3">${Number(d.totalValue).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    d.status === 'APPROVED' ? 'bg-green-100' : d.status === 'PENDING_APPROVAL' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>{d.status.replace('_', ' ')}</span>
                </td>
                <td className="p-3">
                  {d.status === 'DRAFT' && <button onClick={() => submit(d.id)} className="text-emerald-600 hover:underline">Submit</button>}
                  {d.status === 'PENDING_APPROVAL' && <button onClick={() => approve(d.id)} className="text-green-600 hover:underline">Approve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && form.items.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Disposal</h2>
            <p className="text-slate-600 mb-4">{form.items.length} batch(es) - ${form.items.reduce((s, i) => s + i.quantity, 0)} units</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={createDisposal} className="px-4 py-2 bg-emerald-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
