"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import PrivateLayout from "@/layouts/PrivateLayout";
import { FaArrowUp, FaArrowDown, FaTrophy, FaTimesCircle } from "react-icons/fa";

interface HistoryOrder {
  _id: string;
  pairSymbol: string;
  pairName: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  targetPrice: number;
  status: "closed" | "cancelled";
  closedAt: string;
  createdAt: string;
  profit?: number;
}

export default function TradeHistoryPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || "/api"}/orders/history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error("Failed to fetch trade history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const totalProfit = orders.reduce((sum, o) => sum + (o.profit && o.profit > 0 ? o.profit : 0), 0);
  const totalLoss = orders.reduce((sum, o) => sum + ((!o.profit || o.profit <= 0) && o.status === "closed" ? o.amount : 0), 0);
  const wins = orders.filter(o => o.profit && o.profit > 0).length;
  const losses = orders.filter(o => (!o.profit || o.profit <= 0) && o.status === "closed").length;

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-white text-2xl font-bold mb-6">Trade History</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <FaTrophy className="text-green-400 w-4 h-4" />
                <span className="text-gray-400 text-sm">Total Profit</span>
              </div>
              <p className="text-green-400 font-bold text-xl">${totalProfit.toFixed(2)}</p>
              <p className="text-gray-500 text-xs mt-1">{wins} winning trades</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <FaTimesCircle className="text-red-400 w-4 h-4" />
                <span className="text-gray-400 text-sm">Total Lost</span>
              </div>
              <p className="text-red-400 font-bold text-xl">${totalLoss.toFixed(2)}</p>
              <p className="text-gray-500 text-xs mt-1">{losses} losing trades</p>
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center text-gray-400 py-16">Loading history...</div>
          ) : orders.length === 0 ? (
            <div className="text-center text-gray-500 py-16">No trade history yet.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const won = order.profit && order.profit > 0;
                const duration = order.closedAt && order.createdAt
                  ? Math.round((new Date(order.closedAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60))
                  : null;

                return (
                  <div
                    key={order._id}
                    className={`rounded-xl p-4 border ${
                      won
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          won ? "bg-green-500/20" : "bg-red-500/20"
                        }`}>
                          {won
                            ? <FaArrowUp className="text-green-400 w-4 h-4" />
                            : <FaArrowDown className="text-red-400 w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{order.pairName}</p>
                          <p className="text-gray-400 text-xs">{order.pairSymbol}/USD · {order.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-base ${won ? "text-green-400" : "text-red-400"}`}>
                          {won ? `+$${order.profit!.toFixed(2)}` : `-$${order.amount.toFixed(2)}`}
                        </p>
                        <p className="text-gray-500 text-xs">{won ? "Profit" : "Loss"}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Invested</p>
                        <p className="text-white font-medium">${order.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entry Price</p>
                        <p className="text-white font-medium">${order.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Target Price</p>
                        <p className="text-white font-medium">${order.targetPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(order.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      {duration !== null && <span>Duration: ~{duration}h</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
}
