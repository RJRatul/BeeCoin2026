"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { io as socketIO, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrice } from "@/contexts/PriceContext";
import Image from "next/image";
import toast from "react-hot-toast";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { playWinSound, playLossSound } from "@/lib/sounds";
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
  type: "green" | "gray" | "red";
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
  const [targetPriceError, setTargetPriceError] = useState("");
  const [livePrice, setLivePrice] = useState<number>(0);

  // Track the symbol we last successfully loaded so we can reset on symbol change
  const loadedSymbolRef = useRef<string | null>(null);
  const simulatedPriceRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevOpenOrderRef = useRef<Order | null>(null);
  const notifiedOrderIds = useRef<Set<string>>(new Set());

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
      setLivePrice(foundPair.currentValue);
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
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/pairs`
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
        setLivePrice(directPair.currentValue);
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
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/orders/open`,
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

  // Socket.io — connect when pair and user are ready
  useEffect(() => {
    if (!pair || !user) return;

    // Resolve socket host — NEXT_PUBLIC_API_URL may be a relative path ("/api") in production
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const socketHost = apiUrl.startsWith("http")
      ? apiUrl.replace("/api", "")
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5000";

    const socket = socketIO(socketHost, {
      transports: ["polling", "websocket"], // polling first for proxy compatibility
      path: "/socket.io",
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_pair", pair.symbol);
      socket.emit("join_user", user.id);
    });

    // Live price tick from the server
    socket.on("price_update", ({ price }: { symbol: string; price: number }) => {
      setLivePrice(price);
      generateMarketDepth(pair, price);
    });

    // Order settled — server tells us win or loss
    socket.on(
      "order_closed",
      ({ orderId, won, profit }: { orderId: string; won: boolean; profit: number; newBalance: number }) => {
        if (notifiedOrderIds.current.has(orderId)) return; // prevent duplicate toasts
        notifiedOrderIds.current.add(orderId);
        if (won) {
          playWinSound();
          toast.success(`Trade won! +$${profit.toFixed(2)} profit added to balance.`, { duration: 7000 });
        } else {
          playLossSound();
          toast.error("Trade closed — price hit the limit. Investment lost.", { duration: 7000 });
        }
        fetchOpenOrder();
        refreshUser();
      }
    );

    return () => {
      socket.emit("leave_pair", pair.symbol);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [pair, user]);

  // Polling fallback — detect win/loss when socket event is missed
  useEffect(() => {
    const prev = prevOpenOrderRef.current;
    prevOpenOrderRef.current = openOrder;

    if (prev && !openOrder) {
      // Order just disappeared — check history for result
      (async () => {
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL || "/api"}/orders/history`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const closed = res.data.orders?.find((o: any) => o._id === prev._id);
          if (closed && !notifiedOrderIds.current.has(closed._id)) {
            notifiedOrderIds.current.add(closed._id);
            if (closed.won) {
              playWinSound();
              toast.success(`Trade won! +$${(closed.profit ?? 0).toFixed(2)} profit added to balance.`, { duration: 7000 });
            } else {
              playLossSound();
              toast.error("Trade closed — price hit the limit. Investment lost.", { duration: 7000 });
            }
            refreshUser();
          }
        } catch {/* silent */}
      })();
    }
  }, [openOrder]);

  const refreshUserBalance = async () => {
    try {
      await refreshUser();
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error refreshing balance:", error);
    }
  };

  const generateMarketDepth = (p: any, simPrice?: number) => {
    const { minValue, minPercentage, maxPercentage } = p;
    const current = simPrice ?? p.currentValue;
    simulatedPriceRef.current = current;
    const depth: MarketDepth[] = [];

    // Step size based on percentage range — no upper cap
    const avgPct = ((minPercentage + maxPercentage) / 2) / 100;
    const aboveStep = current * avgPct;

    // 5 green rows — capped at maxValue to stay realistic
    for (let i = 1; i <= 5; i++) {
      const price = parseFloat(Math.min(p.maxValue, current + i * aboveStep).toFixed(6));
      const amount = parseFloat((Math.random() * 9.9 + 0.1).toFixed(4));
      depth.push({ price, amount, total: parseFloat((price * amount).toFixed(4)), type: "green" });
    }

    // 1 gray row — exactly at simulated current (always the middle row)
    const grayAmount = parseFloat((Math.random() * 9.9 + 0.1).toFixed(4));
    depth.push({
      price: parseFloat(current.toFixed(6)),
      amount: grayAmount,
      total: parseFloat((current * grayAmount).toFixed(4)),
      type: "gray",
    });

    // 5 red rows — go down to minValue floor
    const belowStep = (current - minValue) / 5;
    for (let i = 1; i <= 5; i++) {
      const price = parseFloat(Math.max(minValue, current - i * belowStep).toFixed(6));
      const amount = parseFloat((Math.random() * 9.9 + 0.1).toFixed(4));
      depth.push({ price, amount, total: parseFloat((price * amount).toFixed(4)), type: "red" });
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
    if (activeTab === "buy" && targetPriceNum <= livePrice) {
      toast.error(`Buy target must be above current price ($${livePrice.toLocaleString()})`);
      return;
    }
    if (activeTab === "sell" && targetPriceNum >= livePrice) {
      toast.error(`Sell target must be below current price ($${livePrice.toLocaleString()})`);
      return;
    }
    if (targetPriceNum < pair.minValue) {
      toast.error(`Target price cannot be below minimum ($${pair.minValue.toLocaleString()})`);
      return;
    }
    if (amountNum > (user?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/orders/create`,
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
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (typeof error.response?.data === "string" ? error.response.data : null) ||
        "Failed to create order";
      toast.error(msg);
      if (error.response?.status === 400) {
        await fetchOpenOrder();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getPriceChange = () => {
    if (!pair) return { isPositive: false, percentageChange: "0" };
    const avgValue = (pair.minValue + pair.maxValue) / 2;
    const percentageChange = ((livePrice - avgValue) / avgValue) * 100;
    return {
      isPositive: livePrice > avgValue,
      percentageChange: Math.abs(percentageChange).toFixed(2),
    };
  };

  if (loading || !pair) {
    return (
      <PrivateLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-white text-sm">Loading...</div>
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
      <div className="bg-gradient-to-br from-gray-900 to-black p-2.5 pb-6 space-y-2 max-w-2xl mx-auto">

        {/* ── Row 1: Back · Pair Dropdown · Price ───────────────────── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.replace("/trade")}
            className="p-1.5 text-gray-400 hover:text-white transition flex-shrink-0"
          >
            <FaArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Pair dropdown */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowMarketDropdown(!showMarketDropdown)}
              className="w-full flex items-center justify-between bg-gray-800/70 hover:bg-gray-700/70 rounded-xl px-2.5 py-1.5 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  {pair.image
                    ? <Image src={pair.image} alt={pair.name} width={18} height={18} className="rounded-full" />
                    : <span className="text-[10px] font-bold">{pair.symbol.charAt(0)}</span>}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-white font-semibold text-xs leading-tight truncate">{pair.name}</div>
                  <div className="text-gray-400 text-[10px] leading-tight">{pair.symbol}/USD</div>
                </div>
              </div>
              <FaChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 ml-1 transition-transform ${showMarketDropdown ? "rotate-180" : ""}`} />
            </button>

            {showMarketDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-xl z-30 shadow-2xl border border-gray-700 max-h-60 overflow-y-auto">
                {availablePairs.map((p: any) => (
                  <button
                    key={p._id}
                    onClick={() => handleMarketChange(p.symbol)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-700 transition-colors ${p.symbol === pair.symbol ? "bg-gray-700/50" : ""}`}
                  >
                    <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      {p.image
                        ? <Image src={p.image} alt={p.name} width={20} height={20} className="rounded-full" />
                        : <span className="text-[10px] font-bold">{p.symbol.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white text-xs font-medium truncate">{p.name}</div>
                      <div className="text-gray-400 text-[10px]">{p.symbol}/USD</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white text-xs font-semibold">${p.currentValue.toLocaleString()}</div>
                      <div className={`text-[10px] ${p.currentValue > (p.minValue + p.maxValue) / 2 ? "text-green-400" : "text-red-400"}`}>
                        {(((p.currentValue - (p.minValue + p.maxValue) / 2) / ((p.minValue + p.maxValue) / 2)) * 100).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live price */}
          <div className="text-right flex-shrink-0">
            <div className="text-white font-bold text-sm leading-tight">${livePrice.toLocaleString()}</div>
            <div className={`text-[10px] font-medium leading-tight ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{percentageChange}%
            </div>
          </div>
        </div>

        {/* ── Row 2: Balance + market stats ─────────────────────────── */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-700 ${
          openOrder && livePrice > openOrder.price ? "trade-card-profit"
          : openOrder && livePrice <= openOrder.price ? "trade-card-loss"
          : "bg-gray-800/50"
        }`}>
          <div>
            <div className="text-[10px] text-gray-400 leading-tight">Available Balance</div>
            <div className="text-white font-bold text-lg leading-tight">${user?.balance?.toLocaleString() || "0.00"}</div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-[9px] text-gray-500">24h Low</div>
              <div className="text-xs text-red-400 font-semibold">${pair.minValue.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Current</div>
              <div className="text-xs text-white font-semibold">${livePrice.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">24h High</div>
              <div className="text-xs text-green-400 font-semibold">${pair.maxValue.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Buy/Sell tabs ───────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-800/50 rounded-xl p-0.5">
          <button
            onClick={() => { setActiveTab("buy"); setTargetPrice(""); setTargetPriceError(""); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "buy" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Buy
          </button>
          <button
            onClick={() => { setActiveTab("sell"); setTargetPrice(""); setTargetPriceError(""); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "sell" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Sell
          </button>
        </div>

        {/* ── Row 4: Market Depth + Order Form ──────────────────────── */}
        <div className="flex gap-2">

          {/* Market Depth */}
          <div className="w-[44%] bg-gray-800/50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 gap-1 px-2 py-1.5 bg-gray-700/40 border-b border-gray-600/40">
              <span className="text-[9px] text-gray-400 font-semibold">Price</span>
              <span className="text-[9px] text-gray-400 font-semibold text-right">Amt</span>
              <span className="text-[9px] text-gray-400 font-semibold text-right">Total</span>
            </div>
            <div className="overflow-hidden" style={{ maxHeight: "204px" }}>
              {marketDepth.map((depth, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-3 gap-1 px-2 py-[4px] border-b border-gray-700/20 ${
                    depth.type === "gray" ? "bg-gray-600/30"
                    : depth.type === "green" ? "bg-green-500/5"
                    : "bg-red-500/5"
                  }`}
                >
                  <span className={`text-[10px] font-medium truncate ${
                    depth.type === "gray" ? "text-gray-100 font-bold"
                    : depth.type === "green" ? "text-green-400"
                    : "text-red-400"
                  }`}>
                    ${depth.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-300 text-right truncate">{depth.amount.toFixed(2)}</span>
                  <span className="text-[10px] text-gray-400 text-right truncate">${depth.total.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Form */}
          <div className="flex-1 bg-gray-800/50 rounded-xl p-3 flex flex-col gap-2.5">

            {/* Target Price */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-400 font-medium">Target Price</label>
                <span className="text-[9px] text-gray-500">
                  {activeTab === "buy" ? `> $${livePrice.toLocaleString()}` : `< $${livePrice.toLocaleString()}`}
                </span>
              </div>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => { setTargetPrice(e.target.value); setTargetPriceError(""); }}
                onBlur={(e) => {
                  const val = e.target.value;
                  const num = parseFloat(val);
                  if (!val || isNaN(num)) { setTargetPriceError(""); return; }
                  if (activeTab === "buy" && num <= livePrice)
                    setTargetPriceError(`Must be above $${livePrice.toLocaleString()}`);
                  else if (activeTab === "sell" && num >= livePrice)
                    setTargetPriceError(`Must be below $${livePrice.toLocaleString()}`);
                  else if (num < pair.minValue)
                    setTargetPriceError(`Min $${pair.minValue.toLocaleString()}`);
                  else setTargetPriceError("");
                }}
                placeholder={activeTab === "buy" ? "Above current price" : "Below current price"}
                className={`w-full px-2.5 py-1.5 bg-gray-700 border rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 ${targetPriceError ? "border-red-500" : "border-gray-600"}`}
                step="0.01"
              />
              {targetPriceError
                ? <p className="text-red-400 text-[10px] mt-0.5 leading-tight">{targetPriceError}</p>
                : <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                    {activeTab === "buy" ? "Win when price rises to target" : "Win when price drops to target"}
                  </p>
              }
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-400 font-medium">Amount (USDT)</label>
                <span className="text-[9px] text-gray-500">${user?.balance?.toLocaleString() || "0"}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 pr-9"
                  step="0.01"
                />
                <button
                  onClick={() => setAmount((user?.balance || 0).toString())}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-purple-600 text-white text-[9px] rounded font-semibold hover:bg-purple-700 transition"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitOrder}
              disabled={
                submitting || !!openOrder || !amount ||
                parseFloat(amount) <= 0 || parseFloat(amount) > (user?.balance || 0) ||
                !targetPrice || parseFloat(targetPrice) <= 0 || !!targetPriceError ||
                (activeTab === "buy" && parseFloat(targetPrice) <= livePrice) ||
                (activeTab === "sell" && parseFloat(targetPrice) >= livePrice) ||
                parseFloat(targetPrice) < pair.minValue
              }
              className={`w-full py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              } text-white disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {submitting ? "Processing…" : openOrder ? "Order Active" : `${activeTab === "buy" ? "Buy" : "Sell"} ${pair.symbol}`}
            </button>
          </div>
        </div>

        {/* ── Row 5: Open Order strip (only when active) ────────────── */}
        {openOrder && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                openOrder.type === "buy" ? "bg-green-600/30 text-green-400" : "bg-red-600/30 text-red-400"
              }`}>
                {openOrder.type.toUpperCase()}
              </span>
              <div className="flex flex-1 justify-around">
                <div className="text-center">
                  <div className="text-[9px] text-gray-500 leading-tight">Invested</div>
                  <div className="text-xs text-white font-semibold leading-tight">${openOrder.amount.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-500 leading-tight">Entry</div>
                  <div className="text-xs text-white font-semibold leading-tight">${openOrder.price.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-500 leading-tight">Target</div>
                  <div className="text-xs text-yellow-400 font-semibold leading-tight">${openOrder.targetPrice.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-500 leading-tight">Now</div>
                  <div className={`text-xs font-semibold leading-tight ${
                    openOrder.type === "buy"
                      ? livePrice >= openOrder.targetPrice ? "text-green-400"
                        : livePrice > openOrder.price ? "text-green-300" : "text-red-400"
                      : livePrice <= openOrder.targetPrice ? "text-green-400"
                        : livePrice < openOrder.price ? "text-green-300" : "text-red-400"
                  }`}>${livePrice.toLocaleString()}</div>
                </div>
              </div>
            </div>
            {/* Progress bar toward target */}
            <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${openOrder.type === "buy" ? "bg-green-500" : "bg-red-500"}`}
                style={{
                  width: `${Math.min(100, Math.max(0,
                    openOrder.type === "buy"
                      ? ((livePrice - openOrder.price) / (openOrder.targetPrice - openOrder.price)) * 100
                      : ((openOrder.price - livePrice) / (openOrder.price - openOrder.targetPrice)) * 100
                  ))}%`
                }}
              />
            </div>
          </div>
        )}

      </div>
    </PrivateLayout>
  );
}