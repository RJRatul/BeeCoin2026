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
  expiresAt: string;
}

// Fixed trade duration — must match backend TRADE_DURATION_MS (default 1 min)
const TRADE_DURATION_MS = 60000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MarketDepth {
  price: number;
  amount: number;
  total: number;
  type: "green" | "gray" | "red";
}

function PairRow({ p, current, onClick }: { p: any; current: string; onClick: (s: string) => void }) {
  const pct = (((p.currentValue - (p.minValue + p.maxValue) / 2) / ((p.minValue + p.maxValue) / 2)) * 100).toFixed(2);
  const up = p.currentValue > (p.minValue + p.maxValue) / 2;
  return (
    <button
      onClick={() => onClick(p.symbol)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-700 transition-colors ${p.symbol === current ? "bg-gray-700/50" : ""}`}
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
        <div className={`text-[10px] ${up ? "text-green-400" : "text-red-400"}`}>{up ? "+" : ""}{pct}%</div>
      </div>
    </button>
  );
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
  const [now, setNow] = useState<number>(Date.now());

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
    // Depend on stable primitives, not the full pair/user objects — refreshUser()
    // replaces the user object every 3s, which would otherwise tear down and
    // restart this interval (and the socket below) on every single tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.symbol, user?.id]);

  // Live countdown tick for the active order's remaining trade time
  useEffect(() => {
    if (!openOrder) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [openOrder]);

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
    // Same reasoning as the polling effect above — keep this connection stable
    // across refreshUser()'s periodic user-object replacement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.symbol, user?.id]);

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
  const recommendedPairs = availablePairs.filter((p) => p.isRecommended).slice(0, 5);
  const otherPairs = availablePairs.filter((p) => !p.isRecommended);

  const orderBookBuys  = marketDepth.filter(d => d.type === "green");
  const orderBookSells = marketDepth.filter(d => d.type === "red");

  // Win/loss is decided by target price vs Low/High, not by what the live
  // price does — so we can show the true outcome for the countdown itself.
  const willWin = openOrder
    ? (openOrder.type === "sell" ? openOrder.targetPrice >= pair.minValue : openOrder.targetPrice <= pair.maxValue)
    : false;

  return (
    <PrivateLayout>
      {/* Uses dynamic viewport height minus the 64px header */}
      <div
        className="flex flex-col bg-gray-900 overflow-hidden w-full"
        style={{ height: "calc(100dvh - 64px)" }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
          <button onClick={() => router.replace("/trade")} className="text-gray-400 hover:text-white flex-shrink-0">
            <FaArrowLeft className="w-4 h-4" />
          </button>

          {/* Pair selector */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowMarketDropdown(!showMarketDropdown)}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                {pair.image
                  ? <Image src={pair.image} alt={pair.name} width={22} height={22} className="rounded-full" />
                  : <span className="text-[10px] font-bold text-white">{pair.symbol.charAt(0)}</span>}
              </div>
              <div className="text-left min-w-0">
                <div className="text-white font-bold text-sm leading-tight">{pair.symbol}<span className="text-gray-500 font-normal">/USDT</span></div>
              </div>
              <FaChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${showMarketDropdown ? "rotate-180" : ""}`} />
            </button>

            {showMarketDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-xl z-50 shadow-2xl border border-gray-700 max-h-64 overflow-y-auto">
                {recommendedPairs.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 border-b border-gray-700/50">
                      <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider">⭐ Recommended</span>
                    </div>
                    {recommendedPairs.map((p: any) => <PairRow key={p._id} p={p} current={pair.symbol} onClick={handleMarketChange} />)}
                    {otherPairs.length > 0 && (
                      <div className="px-3 py-1.5 border-y border-gray-700/50">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">All Markets</span>
                      </div>
                    )}
                  </>
                )}
                {otherPairs.map((p: any) => <PairRow key={p._id} p={p} current={pair.symbol} onClick={handleMarketChange} />)}
              </div>
            )}
          </div>

          {/* Live price + change */}
          <div className="text-right flex-shrink-0">
            <div className={`font-bold text-base leading-tight ${isPositive ? "text-green-400" : "text-red-400"}`}>
              ${livePrice.toLocaleString()}
            </div>
            <div className={`text-[10px] leading-tight ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "▲" : "▼"} {percentageChange}%
            </div>
          </div>
        </div>

        {/* ── Stats bar ───────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-800 transition-all duration-700 ${
          openOrder ? (willWin ? "trade-card-profit" : "trade-card-loss") : "bg-gray-850"
        }`}>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Balance</div>
            <div className="text-white font-bold text-sm">${(user?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Low</div>
              <div className="text-xs text-red-400 font-semibold">${pair.minValue.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Current</div>
              <div className="text-xs text-white font-semibold">${livePrice.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">High</div>
              <div className="text-xs text-green-400 font-semibold">${pair.maxValue.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* ── Buy / Sell toggle ────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex mx-3 mt-2 gap-1 bg-gray-800 rounded-xl p-0.5">
          <button
            onClick={() => { setActiveTab("buy"); setTargetPrice(""); setTargetPriceError(""); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "buy" ? "bg-green-500 text-white shadow" : "text-gray-400"}`}
          >Buy</button>
          <button
            onClick={() => { setActiveTab("sell"); setTargetPrice(""); setTargetPriceError(""); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "sell" ? "bg-red-500 text-white shadow" : "text-gray-400"}`}
          >Sell</button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">

          {/* Order form */}
          <div className="bg-gray-800 rounded-2xl p-3 space-y-2.5">
            {/* Target Price */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">Target Price</span>
                <span className="text-[10px] text-gray-600">
                  {activeTab === "buy" ? `> $${livePrice.toLocaleString()}` : `< $${livePrice.toLocaleString()}`}
                </span>
              </div>
              <input
                type="number" value={targetPrice}
                onChange={(e) => { setTargetPrice(e.target.value); setTargetPriceError(""); }}
                onBlur={(e) => {
                  const num = parseFloat(e.target.value);
                  if (!e.target.value || isNaN(num)) { setTargetPriceError(""); return; }
                  if (activeTab === "buy" && num <= livePrice) setTargetPriceError(`Must be above $${livePrice}`);
                  else if (activeTab === "sell" && num >= livePrice) setTargetPriceError(`Must be below $${livePrice}`);
                  else setTargetPriceError("");
                }}
                placeholder={activeTab === "buy" ? "Enter price above current" : "Enter price below current"}
                className={`w-full px-3 py-2.5 bg-gray-700/80 border rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${targetPriceError ? "border-red-500" : "border-gray-600/50"}`}
                step="0.0001"
              />
              {(() => {
                const num = parseFloat(targetPrice);
                const hasNum = !!targetPrice && !isNaN(num);
                const withinRange = activeTab === "sell" ? num >= pair.minValue : num <= pair.maxValue;
                if (targetPriceError) {
                  return <p className="text-[10px] mt-1 text-red-400">{targetPriceError}</p>;
                }
                if (hasNum) {
                  // return (
                  //   <p className={`text-[10px] mt-1 ${withinRange ? "text-green-400" : "text-red-400"}`}>
                  //     {withinRange
                  //       ? `Within ${activeTab === "sell" ? "Low" : "High"} limit — will WIN after 1 min`
                  //       : `${activeTab === "sell" ? "Below Low" : "Above High"} ($${activeTab === "sell" ? pair.minValue.toLocaleString() : pair.maxValue.toLocaleString()}) — will LOSE after 1 min`}
                  //   </p>
                  // );
                }
                // return (
                //   <p className="text-[10px] mt-1 text-gray-600">
                //     {activeTab === "sell"
                //       ? `Win if target stays above Low ($${pair.minValue.toLocaleString()})`
                //       : `Win if target stays below High ($${pair.maxValue.toLocaleString()})`}
                //   </p>
                // );
              })()}
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">Amount (USDT)</span>
                <span className="text-[10px] text-gray-600">Bal: ${(user?.balance ?? 0).toLocaleString()}</span>
              </div>
              <div className="relative">
                <input
                  type="number" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 pr-14"
                  step="0.01"
                />
                <button onClick={() => setAmount((user?.balance || 0).toString())}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-purple-600 text-white text-[10px] rounded-lg font-bold">
                  MAX
                </button>
              </div>
            </div>

            {/* Quick % */}
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 25, 50, 100].map(pct => (
                <button key={pct}
                  onClick={() => setAmount(parseFloat(((user?.balance || 0) * pct / 100).toFixed(2)).toString())}
                  className="py-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-600 text-gray-400 hover:text-white text-[10px] font-semibold transition border border-gray-700/50">
                  {pct}%
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitOrder}
              disabled={
                submitting || !!openOrder || !amount || parseFloat(amount) <= 0 ||
                parseFloat(amount) > (user?.balance || 0) || !targetPrice ||
                parseFloat(targetPrice) <= 0 || !!targetPriceError ||
                (activeTab === "buy" && parseFloat(targetPrice) <= livePrice) ||
                (activeTab === "sell" && parseFloat(targetPrice) >= livePrice)
              }
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "buy" ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"
              } text-white disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {submitting ? "Processing…" : openOrder ? "⏳ Order Active" : `${activeTab === "buy" ? "Buy" : "Sell"} ${pair.symbol}`}
            </button>
          </div>

          {/* Active order strip */}
          {openOrder && (
            <div className={`rounded-2xl px-3 py-2.5 border ${
              openOrder.type === "buy" ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  openOrder.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>{openOrder.type.toUpperCase()}</span>
                <span className="text-[10px] text-gray-500">Active Order</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: "Invested", value: `$${openOrder.amount}`, cls: "text-white" },
                  { label: "Entry", value: `$${openOrder.price}`, cls: "text-white" },
                  { label: "Target", value: `$${openOrder.targetPrice}`, cls: "text-gray-400" },
                  { label: "Now", value: `$${livePrice}`, cls: "text-white" },
                  { label: "Time Left", value: formatCountdown(new Date(openOrder.expiresAt).getTime() - now), cls: "text-yellow-400" },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <div className="text-[9px] text-gray-600">{item.label}</div>
                    <div className={`text-[10px] font-bold ${item.cls}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              {/* <div className={`mt-2 text-[10px] text-center font-medium ${willWin ? "text-green-400" : "text-red-400"}`}>
                {willWin
                  ? `✅ Within ${openOrder.type === "sell" ? "Low" : "High"} limit — will win`
                  : `⚠️ ${openOrder.type === "sell" ? "Below Low" : "Above High"} limit — will lose`}
              </div> */}
              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${willWin ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, Math.max(0,
                    ((now - new Date(openOrder.createdAt).getTime()) / TRADE_DURATION_MS) * 100
                  ))}%` }}
                />
              </div>
            </div>
          )}

          {/* Order Book */}
          <div className="bg-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order Book</span>
              <span className="text-xs text-white font-bold">${livePrice.toLocaleString()}</span>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-4 px-3 py-1.5 bg-gray-700/30 border-b border-gray-700/30">
              <span className="text-[9px] text-green-400 font-semibold col-span-1">Buy Price</span>
              <span className="text-[9px] text-gray-500 text-right">Amt</span>
              <span className="text-[9px] text-red-400 font-semibold text-right">Sell Price</span>
              <span className="text-[9px] text-gray-500 text-right">Amt</span>
            </div>
            {/* Rows */}
            {Array.from({ length: Math.max(orderBookBuys.length, orderBookSells.length) }).map((_, i) => {
              const buy  = orderBookBuys[i];
              const sell = orderBookSells[i];
              return (
                <div key={i} className="grid grid-cols-4 px-3 py-[5px] border-b border-gray-700/20 last:border-0">
                  <span className="text-[10px] text-green-400 font-medium">{buy ? `$${buy.price.toFixed(4)}` : ""}</span>
                  <span className="text-[10px] text-gray-500 text-right">{buy ? buy.amount.toFixed(2) : ""}</span>
                  <span className="text-[10px] text-red-400 font-medium text-right">{sell ? `$${sell.price.toFixed(4)}` : ""}</span>
                  <span className="text-[10px] text-gray-500 text-right">{sell ? sell.amount.toFixed(2) : ""}</span>
                </div>
              );
            })}
          </div>

        </div>{/* end scrollable body */}
      </div>
    </PrivateLayout>
  );
}