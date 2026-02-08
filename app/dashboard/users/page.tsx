'use client';

import { useEffect, useState } from 'react';

type User = { id: string; email: string; name: string; isActive: boolean; userRoles: { role: { name: string } }[] };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => setUsers([]));
    fetch('/api/roles', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((r) => setRoles(r.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))))
      .catch(() => setRoles([]));
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Roles</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.userRoles?.map((r) => r.role.name).join(', ') || '-'}</td>
                <td className="p-3">{u.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
