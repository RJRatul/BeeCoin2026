"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import PrivateLayout from "@/layouts/PrivateLayout";
import {
  FaUser, FaEnvelope, FaWallet, FaShieldAlt,
  FaCheckCircle, FaTimesCircle, FaHistory,
  FaTrophy, FaArrowUp, FaArrowDown, FaSignOutAlt,
} from "react-icons/fa";

interface Stats {
  totalTrades: number;
  wins: number;
  losses: number;
  totalProfit: number;
  totalInvested: number;
}

export default function AccountPage() {
  const { user, token, logout, refreshUser } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalTrades: 0, wins: 0, losses: 0, totalProfit: 0, totalInvested: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
    refreshUser();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/orders/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const orders = res.data.orders || [];
      const wins = orders.filter((o: any) => o.won).length;
      const losses = orders.filter((o: any) => !o.won && o.status === "closed").length;
      const totalProfit = orders.reduce((sum: number, o: any) => sum + (o.profit || 0), 0);
      const totalInvested = orders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
      setStats({ totalTrades: orders.length, wins, losses, totalProfit, totalInvested });
    } catch {/* silent */} finally {
      setLoadingStats(false);
    }
  };

  const winRate = stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : "0.0";

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.name) return user.name.slice(0, 2).toUpperCase();
    return "U";
  };

  const getFullName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return user?.name || "User";
  };

  return (
    <PrivateLayout>
      <div className="p-3 pb-8 max-w-xl mx-auto space-y-3">

        {/* Profile card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-gray-800/60 rounded-2xl p-4 border border-purple-700/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-yellow-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {getInitials()}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-lg leading-tight truncate">{getFullName()}</div>
              <div className="text-gray-400 text-xs truncate">{user?.email}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  user?.status === "inactive"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-green-500/20 text-green-400"
                }`}>
                  {user?.status === "inactive"
                    ? <><FaTimesCircle className="w-2.5 h-2.5" /> Suspended</>
                    : <><FaCheckCircle className="w-2.5 h-2.5" /> Active</>}
                </span>
                <span className="text-[10px] text-gray-500 capitalize px-2 py-0.5 bg-gray-700/50 rounded-full">
                  {user?.role || "user"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
              <FaWallet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 leading-tight">Available Balance</div>
              <div className="text-white font-bold text-xl leading-tight">
                ${user?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500">Total Profit</div>
            <div className={`font-bold text-sm ${stats.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {stats.totalProfit >= 0 ? "+" : ""}${stats.totalProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Trade stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Trades", value: stats.totalTrades, icon: <FaHistory className="w-3.5 h-3.5" />, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Wins", value: stats.wins, icon: <FaTrophy className="w-3.5 h-3.5" />, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Losses", value: stats.losses, icon: <FaTimesCircle className="w-3.5 h-3.5" />, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Win Rate", value: `${winRate}%`, icon: <FaShieldAlt className="w-3.5 h-3.5" />, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center border border-gray-700/30`}>
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <div className={`font-bold text-sm ${s.color}`}>{loadingStats ? "—" : s.value}</div>
              <div className="text-[9px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700/40">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Account Details</span>
          </div>

          {[
            {
              icon: <FaUser className="w-3.5 h-3.5 text-purple-400" />,
              label: "Full Name",
              value: getFullName(),
            },
            {
              icon: <FaEnvelope className="w-3.5 h-3.5 text-blue-400" />,
              label: "Email Address",
              value: user?.email || "—",
            },
            {
              icon: <FaShieldAlt className="w-3.5 h-3.5 text-yellow-400" />,
              label: "Account Role",
              value: (user?.role || "user").charAt(0).toUpperCase() + (user?.role || "user").slice(1),
            },
            {
              icon: <FaCheckCircle className="w-3.5 h-3.5 text-green-400" />,
              label: "Account Status",
              value: user?.status === "inactive" ? "Suspended" : "Active",
              valueClass: user?.status === "inactive" ? "text-red-400" : "text-green-400",
            },
            {
              icon: <FaArrowUp className="w-3.5 h-3.5 text-green-400" />,
              label: "Total Invested",
              value: `$${stats.totalInvested.toFixed(2)}`,
            },
            {
              icon: <FaArrowDown className="w-3.5 h-3.5 text-yellow-400" />,
              label: "Total Profit Earned",
              value: `$${stats.totalProfit.toFixed(2)}`,
              valueClass: stats.totalProfit >= 0 ? "text-green-400" : "text-red-400",
            },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/20 last:border-0">
              <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                {row.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 leading-tight">{row.label}</div>
                <div className={`text-xs font-semibold truncate ${row.valueClass || "text-white"}`}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition text-sm font-semibold"
        >
          <FaSignOutAlt className="w-4 h-4" />
          Sign Out
        </button>

      </div>
    </PrivateLayout>
  );
}
