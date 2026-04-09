"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import AccountSuspended from "@/components/AccountSuspended";
import { usePathname } from "next/navigation";
import Button from "@/components/Button";
import {
  FaSignOutAlt,
  FaUser,
  FaWallet,
  FaGift,
  FaChartLine,
  FaBars,
  FaTimes,
  FaExchangeAlt,
  FaHistory,
  FaHeadset,
} from "react-icons/fa";
import { createPortal } from "react-dom";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Check if user is inactive
  const isUserInactive = user?.status === 'inactive';

  // Auto logout if user is inactive
  useEffect(() => {
    if (isUserInactive) {
      const timer = setTimeout(() => {
        logout();
      }, 300000); // 5 minutes
      return () => clearTimeout(timer);
    }
  }, [isUserInactive, logout]);

  // If user is inactive, show AccountSuspended component
  if (isUserInactive) {
    return (
      <AuthGuard>
        <AccountSuspended email={user?.email} userId={user?.userId} />
      </AuthGuard>
    );
  }

  // Navigation items with larger icons
  const navItems = [
    { href: "/trade", icon: <FaChartLine className="w-7 h-7" />, label: "Trade" },
    { href: "/deposit", icon: <FaWallet className="w-7 h-7" />, label: "Deposit" },
    { href: "/withdrawal", icon: <FaExchangeAlt className="w-7 h-7" />, label: "Withdrawal" },
    { href: "/trade-history", icon: <FaHistory className="w-7 h-7" />, label: "Trade History" },
    { href: "/support", icon: <FaHeadset className="w-7 h-7" />, label: "Support" },
    { href: "/account", icon: <FaUser className="w-7 h-7" />, label: "Account" },
  ];

  // Get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.lastName) return user.lastName[0].toUpperCase();
    if (user?.name) return user.name[0].toUpperCase();
    return "U";
  };

  // Get full name
  const getUserName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.lastName) return user.lastName;
    if (user?.name) return user.name;
    return "User";
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  // Normal layout for active users
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-900 text-gray-100">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-80 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Wider for larger icons */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-24 bg-gray-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-center h-20 px-2 bg-gray-900 border-b border-gray-700">
              <div className="flex flex-col items-center space-y-1">
                <div className="w-14 h-10 relative">
                  <Image 
                    src="/logo.png" 
                    alt="BeeCoin Logo" 
                    fill 
                    className="object-contain" 
                    priority
                  />
                </div>
                <span className="text-xs font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent text-center leading-tight">
                  BeeCoin
                </span>
              </div>
            </div>

            {/* Navigation - Larger buttons */}
            <nav className="flex-1 px-3 py-6 space-y-3 overflow-y-auto">
              {navItems.map((item) => (
                <div
                  key={item.href}
                  className="relative flex items-center justify-center"
                  onMouseEnter={(e) => {
                    if (window.innerWidth >= 1024) {
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      setTooltip({ text: item.label, x: rect.right + 12, y: rect.top + rect.height / 2 });
                    }
                  }}
                  onMouseLeave={() => {
                    if (window.innerWidth >= 1024) setTooltip(null);
                  }}
                  onClick={(e) => {
                    if (window.innerWidth < 1024) {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      setTooltip({ text: item.label, x: rect.right + 12, y: rect.top + rect.height / 2 });
                      setTimeout(() => setTooltip(null), 1500);
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-green-600 to-yellow-600 text-white shadow-lg scale-105"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white hover:scale-105"
                    }`}
                  >
                    {item.icon}
                  </Link>
                </div>
              ))}
            </nav>

            {/* Sign out - Larger button */}
            <div className="p-4 border-t border-gray-700">
              <Button
                onClick={() => {
                  logout();
                  setSidebarOpen(false);
                }}
                variant="secondary"
                className="w-full justify-center text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-xl py-4"
              >
                <FaSignOutAlt className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header - Larger elements */}
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              {/* Mobile menu button - Larger */}
              <div className="lg:hidden">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-label="Toggle menu"
                >
                  {sidebarOpen ? (
                    <FaTimes className="w-6 h-6" />
                  ) : (
                    <FaBars className="w-6 h-6" />
                  )}
                </button>
              </div>

              <div className="hidden lg:block flex-1"></div>

              {/* Right side - Larger user info */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="relative group">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center text-white font-bold text-lg cursor-pointer">
                      {getUserInitials()}
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded py-1.5 px-3 whitespace-nowrap">
                      {getUserName()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                  <span className="ml-3 text-base font-medium hidden md:block text-white">{getUserName()}</span>
                </div>

                <Button
                  onClick={logout}
                  variant="secondary"
                  size="md"
                  icon={<FaSignOutAlt className="w-5 h-5" />}
                  className="hidden lg:flex px-4 py-2"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-900">{children}</main>
        </div>

        {/* Tooltip Portal - Larger tooltip */}
        {tooltip &&
          createPortal(
            <div
              className="fixed bg-gray-800 text-white text-sm rounded-lg py-2 px-3 z-50 pointer-events-none shadow-lg font-medium"
              style={{
                top: tooltip.y,
                left: tooltip.x,
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              {tooltip.text}
            </div>,
            document.body
          )}
      </div>
    </AuthGuard>
  );
}