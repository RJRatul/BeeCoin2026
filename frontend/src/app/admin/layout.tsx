'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaUsers,
  FaExchangeAlt,
  FaMoneyBillWave,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartLine,
  FaHome,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      router.push('/admin-login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    toast.success('Logged out successfully');
    router.push('/admin-login');
  };

  const navItems = [
    { href: '/admin/dashboard', icon: <FaHome className="w-5 h-5" />, label: 'Dashboard' },
    { href: '/admin/users', icon: <FaUsers className="w-5 h-5" />, label: 'Users' },
    { href: '/admin/trading-pairs', icon: <FaChartLine className="w-5 h-5" />, label: 'Trading Pairs' },
    { href: '/admin/deposits', icon: <FaMoneyBillWave className="w-5 h-5" />, label: 'Deposits' },
    { href: '/admin/withdrawals', icon: <FaExchangeAlt className="w-5 h-5" />, label: 'Withdrawals' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true;
    if (path !== '/admin' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 relative">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
                Admin Panel
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-green-600 to-yellow-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <FaSignOutAlt className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <FaBars className="w-6 h-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Admin</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}