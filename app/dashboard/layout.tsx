'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const nav = [
  { href: '/dashboard', label: 'Dashboard', perm: 'view_reports' },
  { href: '/dashboard/pos', label: 'POS', perm: 'sell_medicine' },
  { href: '/dashboard/products', label: 'Products', perm: 'manage_products' },
  { href: '/dashboard/purchases', label: 'Purchases', perm: 'view_purchases' },
  { href: '/dashboard/disposals', label: 'Disposals', perm: 'dispose_stock' },
  { href: '/dashboard/adjustments', label: 'Adjustments', perm: 'adjust_stock' },
  { href: '/dashboard/reports', label: 'Reports', perm: 'view_reports' },
  { href: '/dashboard/users', label: 'Users', perm: 'manage_users' },
  { href: '/dashboard/roles', label: 'Roles', perm: 'manage_roles' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const visibleNav = nav.filter((n) => hasPermission(n.perm));

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-slate-800 text-white flex flex-col">
        <div className="p-4 font-semibold border-b border-slate-700">Pharmacy POS</div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded ${
                pathname === item.href ? 'bg-emerald-600' : 'hover:bg-slate-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-sm text-slate-400 truncate">{user.email}</p>
          <button
            onClick={logout}
            className="mt-2 text-sm text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
