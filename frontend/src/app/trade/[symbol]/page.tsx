"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { usePrice } from "@/contexts/PriceContext";
import Image from "next/image";
import toast from "react-hot-toast";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import PrivateLayout from "@/layouts/PrivateLayout";

interface Order {
  _id: string;
  userId: string;
  pairId: string;
  pairSymbol: string;
  pairName: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  targetPrice: number;
  status: "open" | "closed" | "cancelled";
  createdAt: string;
}

interface MarketDepth {
  price: number;
  amount: number;
  total: number;
}

export default function TradePairPage() {
  const { symbol } = useParams();
  const router = useRouter();
  const { user, token, refreshUser, loading: authLoading } = useAuth();
  const { pairs, loading: pairsLoading, getPairBySymbol } = usePrice();
  const [pair, setPair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [marketDepth, setMarketDepth] = useState<MarketDepth[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Track the symbol we last successfully loaded so we can reset on symbol change
  const loadedSymbolRef = useRef<string | null>(null);

  // Reset pair state when symbol changes so we show loading instead of stale data
  useEffect(() => {
    if (symbol && loadedSymbolRef.current !== symbol) {
      setPair(null);
      setLoading(true);
      setOpenOrder(null);
      setMarketDepth([]);
    }
  }, [symbol]);

  // Load pair data — only runs when auth and pairs are both ready
  useEffect(() => {
    // Wait for auth to finish initializing
    if (authLoading) return;
    // Wait for pairs to load
    if (pairsLoading || pairs.length === 0) return;
    // Need a symbol and a logged-in user
    if (!symbol || !user) return;
    // Don't reload if we already loaded this symbol
    if (loadedSymbolRef.current === symbol) return;

    const symbolStr = symbol as string;
    const foundPair = getPairBySymbol(symbolStr);

    if (foundPair) {
      if (!foundPair.isActive || (foundPair.minValue === 0 && foundPair.maxValue === 0)) {
        toast.error("This trading pair is no longer available");
        router.replace("/trade");
        return;
      }
      loadedSymbolRef.current = symbolStr;
      setPair(foundPair);
      generateMarketDepth(foundPair);
      setLoading(false);
      fetchOpenOrder();
    } else {
      loadPairDirectly(symbolStr);
    }
  }, [authLoading, pairsLoading, pairs, symbol, user]);

  const loadPairDirectly = async (symbolStr: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/pairs`
      );
      const directPair = response.data.pairs.find(
        (p: any) => p.symbol === symbolStr
      );

      if (
        directPair &&
        directPair.isActive &&
        !(directPair.minValue === 0 && directPair.maxValue === 0)
      ) {
        loadedSymbolRef.current = symbolStr;
        setPair(directPair);
        generateMarketDepth(directPair);
        setLoading(false);
        fetchOpenOrder();
      } else {
        toast.error("Trading pair not found");
        router.replace("/trade");
      }
    } catch (error) {
      console.error("Error loading pair:", error);
      toast.error("Failed to load trading pair");
      router.replace("/trade");
    }
  };

  const fetchOpenOrder = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/orders/open`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const order = response.data.order;
      if (order && order.pairSymbol === symbol) {
        setOpenOrder(order);
      } else {
        setOpenOrder(null);
      }
    } catch (error) {
      console.error("Error fetching open order:", error);
      setOpenOrder(null);
    }
  };

  // Auto-refresh order + balance every 3 seconds
  useEffect(() => {
    if (!pair || !user) return;
    const interval = setInterval(async () => {
      await fetchOpenOrder();
      await refreshUser();
    }, 3000);
    return () => clearInterval(interval);
  }, [pair, user]);

  const refreshUserBalance = async () => {
    try {
      await refreshUser();
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error refreshing balance:", error);
    }
  };

  const generateMarketDepth = (pair: any) => {
    const { currentValue, minValue, maxValue } = pair;
    const depth: MarketDepth[] = [];
    for (let i = -5; i <= 5; i++) {
      const price = currentValue + i * (currentValue * 0.001);
      if (price >= minValue && price <= maxValue) {
        depth.push({
          price,
          amount: Math.random() * 10,
          total: Math.random() * 10000,
        });
      }
    }
    setMarketDepth(depth.sort((a, b) => b.price - a.price));
  };

  const handleMarketChange = (newSymbol: string) => {
    setShowMarketDropdown(false);
    if (newSymbol && newSymbol !== symbol) {
      // Clear loaded ref so the new symbol triggers a fresh load
      loadedSymbolRef.current = null;
      router.replace(`/trade/${newSymbol.toUpperCase()}`);
    }
  };

  const handleSubmitOrder = async () => {
    if (!pair) return;
    if (openOrder) {
      toast.error("You already have an open order. Please wait for it to complete.");
      return;
    }

    const amountNum = parseFloat(amount);
    const targetPriceNum = parseFloat(targetPrice);

    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!targetPriceNum || targetPriceNum <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }
    if (targetPriceNum > pair.maxValue || targetPriceNum < pair.minValue) {
      toast.error(`Target price must be between ${pair.minValue} and ${pair.maxValue}`);
      return;
    }
    if (activeTab === "buy" && amountNum > (user?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/orders/create`,
        {
          pairId: pair._id,
          pairSymbol: pair.symbol,
          pairName: pair.name,
          type: activeTab,
          amount: amountNum,
          price: pair.currentValue,
          targetPrice: targetPriceNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`${activeTab === "buy" ? "Buy" : "Sell"} order placed successfully!`);
        setAmount("");
        setTargetPrice("");
        await fetchOpenOrder();
        await refreshUserBalance();
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriceChange = () => {
    if (!pair) return { isPositive: false, percentageChange: "0" };
    const avgValue = (pair.minValue + pair.maxValue) / 2;
    const percentageChange = ((pair.currentValue - avgValue) / avgValue) * 100;
    return {
      isPositive: pair.currentValue > avgValue,
      percentageChange: Math.abs(percentageChange).toFixed(2),
    };
  };

  if (loading || !pair) {
    return (
      <PrivateLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading trading pair...</div>
        </div>
      </PrivateLayout>
    );
  }

  const { isPositive, percentageChange } = getPriceChange();
  const availablePairs = pairs.filter(
    (p) => p.isActive && !(p.minValue === 0 && p.maxValue === 0)
  );

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.replace("/trade")}
              className="text-gray-400 hover:text-white transition p-2"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>

            {/* Market Dropdown */}
            <div className="relative flex-1 max-w-xs mx-4">
              <button
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="w-full flex items-center justify-between bg-gray-800/50 hover:bg-gray-700/70 rounded-xl px-4 py-2 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
                    {pair.image ? (
                      <Image src={pair.image} alt={pair.name} width={24} height={24} className="rounded-full" />
                    ) : (
                      <span className="text-sm font-bold">{pair.symbol.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">{pair.name}</div>
                    <div className="text-gray-400 text-xs">{pair.symbol}/USD</div>
                  </div>
                </div>
                <FaChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${showMarketDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showMarketDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-xl overflow-hidden z-20 shadow-xl border border-gray-700 max-h-96 overflow-y-auto">
                  {availablePairs.map((p: any) => (
                    <button
                      key={p._id}
                      onClick={() => handleMarketChange(p.symbol)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                        p.symbol === pair.symbol ? "bg-gray-700/50" : ""
                      }`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
                        {p.image ? (
                          <Image src={p.image} alt={p.name} width={28} height={28} className="rounded-full" />
                        ) : (
                          <span className="text-base font-bold">{p.symbol.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-gray-400 text-xs">{p.symbol}/USD</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-semibold">
                          ${p.currentValue.toLocaleString()}
                        </div>
                        <div className={`text-xs ${p.currentValue > (p.minValue + p.maxValue) / 2 ? "text-green-400" : "text-red-400"}`}>
                          {(((p.currentValue - (p.minValue + p.maxValue) / 2) / ((p.minValue + p.maxValue) / 2)) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-white font-bold text-lg">${pair.currentValue.toLocaleString()}</p>
              <p className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{percentageChange}%
              </p>
            </div>
          </div>

          {/* Balance Display */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Available Balance</span>
              <span className="text-white font-bold text-2xl">
                ${user?.balance?.toLocaleString() || "0.00"}
              </span>
            </div>
          </div>

          {/* Buy/Sell Tabs */}
          <div className="bg-gray-800/50 rounded-xl p-1 mb-6">
            <div className="flex">
              <button
                onClick={() => setActiveTab("buy")}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  activeTab === "buy" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setActiveTab("sell")}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  activeTab === "sell" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Market Depth and Order Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Market Depth Table */}
            <div className="bg-gray-800/50 rounded-xl overflow-hidden">
              <div className="p-3 bg-gray-700/50 border-b border-gray-600">
                <h3 className="text-white font-semibold">Market Depth</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-700/30 text-gray-400 text-xs font-semibold border-b border-gray-600">
                <div>Price (USDT)</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {marketDepth.map((depth, index) => {
                  const isRed = depth.price < pair.currentValue;
                  const isGreen = depth.price > pair.currentValue;
                  return (
                    <div
                      key={index}
                      className={`grid grid-cols-3 gap-2 p-3 text-sm border-b border-gray-700/50 ${
                        isRed ? "bg-red-500/5 hover:bg-red-500/10"
                          : isGreen ? "bg-green-500/5 hover:bg-green-500/10"
                          : "hover:bg-gray-700/30"
                      } transition-colors`}
                    >
                      <div className={isRed ? "text-red-400 font-medium" : isGreen ? "text-green-400 font-medium" : "text-white"}>
                        ${depth.price.toFixed(2)}
                      </div>
                      <div className="text-right text-gray-300">{depth.amount.toFixed(4)}</div>
                      <div className="text-right text-gray-300">${depth.total.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Form */}
            <div className="bg-gray-800/50 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Place Order</h3>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Target Price</label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={`Min: ${pair.minValue} | Max: ${pair.maxValue}`}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  step="0.01"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Range: ${pair.minValue.toLocaleString()} - ${pair.maxValue.toLocaleString()}
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-gray-400 text-sm mb-2">Amount (USDT)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                    step="0.01"
                  />
                  <button
                    onClick={() => setAmount((user?.balance || 0).toString())}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    Max
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Available: ${user?.balance?.toLocaleString() || "0"} USDT
                </p>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={submitting || !!openOrder}
                className={`w-full py-3 rounded-lg font-semibold text-base transition ${
                  activeTab === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting ? "Processing..." : openOrder ? "Open Order Exists" : `${activeTab === "buy" ? "Buy" : "Sell"} ${pair.symbol}`}
              </button>
            </div>
          </div>

          {/* Open Order Info */}
          {openOrder && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <h3 className="text-yellow-400 font-semibold mb-2">Open Order</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className={`font-semibold ${openOrder.type === "buy" ? "text-green-400" : "text-red-400"}`}>
                    {openOrder.type.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Amount Invested</p>
                  <p className="text-white font-semibold">${openOrder.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Entry Price</p>
                  <p className="text-white font-semibold">${openOrder.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Target Price</p>
                  <p className="text-white font-semibold">${openOrder.targetPrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress to Target</span>
                  <span className="text-white">
                    {Math.min(100, Math.max(0,
                      openOrder.type === "buy"
                        ? ((openOrder.targetPrice - pair.currentValue) / (openOrder.targetPrice - openOrder.price)) * 100
                        : ((pair.currentValue - openOrder.targetPrice) / (openOrder.price - openOrder.targetPrice)) * 100
                    )).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${openOrder.type === "buy" ? "bg-green-500" : "bg-red-500"} transition-all duration-300 rounded-full`}
                    style={{
                      width: `${Math.min(100, Math.max(0,
                        openOrder.type === "buy"
                          ? ((openOrder.targetPrice - pair.currentValue) / (openOrder.targetPrice - openOrder.price)) * 100
                          : ((pair.currentValue - openOrder.targetPrice) / (openOrder.price - openOrder.targetPrice)) * 100
                      ))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Market Info */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-3">Market Info</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500 text-xs">24h Low</p>
                <p className="text-red-400 font-semibold">${pair.minValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">24h High</p>
                <p className="text-green-400 font-semibold">${pair.maxValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Current Price</p>
                <p className="text-white font-semibold">${pair.currentValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}