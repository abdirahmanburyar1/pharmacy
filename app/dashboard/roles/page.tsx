'use client';

import { useEffect, useState } from 'react';

export default function RolesPage() {
  const [roles, setRoles] = useState<{ id: string; name: string; rolePermissions: { permission: { code: string } }[] }[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    fetch('/api/roles', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Roles & Permissions</h1>
      <div className="grid gap-4">
        {roles.map((r) => (
          <div key={r.id} className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{r.name}</h3>
            <div className="flex flex-wrap gap-2">
              {r.rolePermissions?.map((rp) => (
                <span key={rp.permission.code} className="px-2 py-1 bg-slate-100 rounded text-sm">
                  {rp.permission.code}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
