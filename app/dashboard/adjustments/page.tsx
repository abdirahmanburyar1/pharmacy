'use client';

import { useEffect, useState } from 'react';

type Adjustment = {
  id: string;
  referenceNo: string;
  reason: string;
  status: string;
  items: { quantityChange: number; product: { name: string }; batch: { batchNumber: string } }[];
};

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [status, setStatus] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const load = () => {
    if (!token) return;
    const q = status ? `?status=${status}` : '';
    fetch(`/api/adjustments${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setAdjustments)
      .catch(() => setAdjustments([]));
  };

  useEffect(() => {
    load();
  }, [token, status]);

  const submit = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/adjustments/${id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) load();
  };

  const approve = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/adjustments/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock Adjustments</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded">
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="APPROVED">Approved</option>
        </select>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Ref #</th>
              <th className="text-left p-3">Reason</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.referenceNo}</td>
                <td className="p-3">{a.reason}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    a.status === 'APPROVED' ? 'bg-green-100' : a.status === 'PENDING_APPROVAL' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>{a.status.replace('_', ' ')}</span>
                </td>
                <td className="p-3">
                  {a.status === 'DRAFT' && <button onClick={() => submit(a.id)} className="text-emerald-600 hover:underline">Submit</button>}
                  {a.status === 'PENDING_APPROVAL' && <button onClick={() => approve(a.id)} className="text-green-600 hover:underline">Approve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
