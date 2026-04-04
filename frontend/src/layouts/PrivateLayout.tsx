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
  FaRobot,
  FaBars,
  FaTimes,
  FaExchangeAlt,
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

  // Navigation items
  const navItems = [
    { href: "/trade", icon: <FaChartLine className="w-5 h-5" />, label: "Trade" },
    { href: "/aiTrade", icon: <FaRobot className="w-5 h-5" />, label: "ALGO Trade" },
    { href: "/referral", icon: <FaGift className="w-5 h-5" />, label: "Referral" },
    { href: "/deposit", icon: <FaWallet className="w-5 h-5" />, label: "Deposit" },
    { href: "/withdrawal", icon: <FaExchangeAlt className="w-5 h-5" />, label: "Withdrawal" },
    { href: "/account", icon: <FaUser className="w-5 h-5" />, label: "Account" },
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

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-20 bg-gray-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-center h-16 px-2 bg-gray-900 border-b border-gray-700">
              <div className="flex flex-col items-center space-y-1">
                <div className="w-12 h-8 relative">
                  <Image 
                    src="/logo.png" 
                    alt="BeeCoin Logo" 
                    fill 
                    className="object-contain" 
                    priority
                  />
                </div>
                <span className="text-xs font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent text-center leading-tight">
                  BeeCoin
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <div
                  key={item.href}
                  className="relative flex items-center justify-center"
                  onMouseEnter={(e) => {
                    if (window.innerWidth >= 1024) {
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      setTooltip({ text: item.label, x: rect.right + 8, y: rect.top + rect.height / 2 });
                    }
                  }}
                  onMouseLeave={() => {
                    if (window.innerWidth >= 1024) setTooltip(null);
                  }}
                  onClick={(e) => {
                    if (window.innerWidth < 1024) {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      setTooltip({ text: item.label, x: rect.right + 8, y: rect.top + rect.height / 2 });
                      setTimeout(() => setTooltip(null), 1500);
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors duration-200 ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </Link>
                </div>
              ))}
            </nav>

            {/* Sign out */}
            <div className="p-3 border-t border-gray-700">
              <Button
                onClick={() => {
                  logout();
                  setSidebarOpen(false);
                }}
                variant="secondary"
                className="w-full justify-center text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg py-3"
              >
                <FaSignOutAlt className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              {/* Mobile menu button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-label="Toggle menu"
                >
                  {sidebarOpen ? (
                    <FaTimes className="w-5 h-5" />
                  ) : (
                    <FaBars className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="hidden lg:block flex-1"></div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="relative group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold cursor-pointer">
                      {getUserInitials()}
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {getUserName()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                  <span className="ml-2 text-sm font-medium hidden md:block">{getUserName()}</span>
                </div>

                <Button
                  onClick={logout}
                  variant="secondary"
                  size="sm"
                  icon={<FaSignOutAlt className="w-4 h-4" />}
                  className="hidden lg:flex"
                  aria-label="Sign out"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-900">{children}</main>
        </div>

        {/* Tooltip Portal */}
        {tooltip &&
          createPortal(
            <div
              className="fixed bg-gray-800 text-white text-xs rounded py-1 px-2 z-50 pointer-events-none shadow-lg"
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