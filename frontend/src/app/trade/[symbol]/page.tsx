'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { usePrice } from '@/contexts/PriceContext';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaChevronDown } from 'react-icons/fa';
import PrivateLayout from '@/layouts/PrivateLayout';

interface Order {
  _id: string;
  userId: string;
  pairId: string;
  pairSymbol: string;
  pairName: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  targetPrice: number;
  status: 'open' | 'closed' | 'cancelled';
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
  const { user, token, refreshUser } = useAuth();
  const { getPairBySymbol } = usePrice();
  const [pair, setPair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('USDT');
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [marketDepth, setMarketDepth] = useState<MarketDepth[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const markets = ['USDT', 'BTC', 'ETH', 'BNB'];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    const foundPair = getPairBySymbol(symbol as string);
    if (foundPair) {
      if (!foundPair.isActive || (foundPair.minValue === 0 && foundPair.maxValue === 0)) {
        toast.error('This trading pair is no longer available');
        router.push('/trade');
        return;
      }
      setPair(foundPair);
      generateMarketDepth(foundPair);
    } else {
      toast.error('Pair not found');
      router.push('/trade');
    }
    setLoading(false);
    
    fetchOpenOrder();
  }, [symbol, getPairBySymbol]);

  const fetchOpenOrder = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/open`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const order = response.data.order;
      if (order && order.pairSymbol === symbol) {
        setOpenOrder(order);
      }
    } catch (error) {
      console.error('Error fetching open order:', error);
    }
  };

  const refreshUserBalance = async () => {
    try {
      await refreshUser();
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  const generateMarketDepth = (pair: any) => {
    const { currentValue, minValue, maxValue } = pair;
    const depth: MarketDepth[] = [];
    
    for (let i = -5; i <= 5; i++) {
      const price = currentValue + (i * (currentValue * 0.001));
      if (price >= minValue && price <= maxValue) {
        depth.push({
          price,
          amount: Math.random() * 10,
          total: Math.random() * 10000
        });
      }
    }
    setMarketDepth(depth.sort((a, b) => b.price - a.price));
  };

  const handleSubmitOrder = async () => {
    if (!pair) return;
    if (openOrder) {
      toast.error('You already have an open order. Please wait for it to complete.');
      return;
    }

    const amountNum = parseFloat(amount);
    const targetPriceNum = parseFloat(targetPrice);

    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!targetPriceNum || targetPriceNum <= 0) {
      toast.error('Please enter a valid target price');
      return;
    }

    if (targetPriceNum > pair.maxValue || targetPriceNum < pair.minValue) {
      toast.error(`Target price must be between ${pair.minValue} and ${pair.maxValue}`);
      return;
    }

    if (activeTab === 'buy' && amountNum > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/create`,
        {
          pairId: pair._id,
          pairSymbol: pair.symbol,
          pairName: pair.name,
          type: activeTab,
          amount: amountNum,
          price: pair.currentValue,
          targetPrice: targetPriceNum
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`);
        setAmount('');
        setTargetPrice('');
        await fetchOpenOrder();
        await refreshUserBalance();
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriceChange = () => {
    if (!pair) return { isPositive: false, percentageChange: '0' };
    const avgValue = (pair.minValue + pair.maxValue) / 2;
    const percentageChange = ((pair.currentValue - avgValue) / avgValue) * 100;
    return {
      isPositive: pair.currentValue > avgValue,
      percentageChange: Math.abs(percentageChange).toFixed(2)
    };
  };

  if (loading || !pair) {
    return (
      <PrivateLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </PrivateLayout>
    );
  }

  const { isPositive, percentageChange } = getPriceChange();

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-md mx-auto">
          {/* Header - Same as before */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center">
                {pair.image ? (
                  <Image src={pair.image} alt={pair.name} width={32} height={32} className="rounded-full" />
                ) : (
                  <span className="text-xl">{pair.symbol.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">{pair.name}</h1>
                <p className="text-gray-400 text-xs">{pair.symbol}/USD</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">${pair.currentValue.toLocaleString()}</p>
              <p className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{percentageChange}%
              </p>
            </div>
          </div>

          {/* Rest of the component remains the same */}
          {/* Balance Display */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Available Balance</span>
              <span className="text-white font-bold text-lg">${user?.balance?.toLocaleString() || '0.00'}</span>
            </div>
          </div>

          {/* Buy/Sell Tabs */}
          <div className="bg-gray-800/50 rounded-xl p-1 mb-4">
            <div className="flex">
              <button
                onClick={() => setActiveTab('buy')}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  activeTab === 'buy'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  activeTab === 'sell'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Market Dropdown */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
            <div className="relative">
              <button
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="w-full flex items-center justify-between text-white"
              >
                <span>Market: {selectedMarket}</span>
                <FaChevronDown className={`transition-transform ${showMarketDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showMarketDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-700 rounded-lg overflow-hidden z-10">
                  {markets.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedMarket(m);
                        setShowMarketDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-gray-600 transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Market Depth Table */}
          <div className="bg-gray-800/50 rounded-xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-700/50 text-gray-400 text-xs font-semibold">
              <div>Price ({selectedMarket})</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {marketDepth.map((depth, index) => {
                const isRed = depth.price < (pair.currentValue);
                const isGreen = depth.price > (pair.currentValue);
                return (
                  <div
                    key={index}
                    className={`grid grid-cols-3 gap-2 p-2 text-sm border-b border-gray-700/50 ${
                      isRed ? 'bg-red-500/5' : isGreen ? 'bg-green-500/5' : ''
                    }`}
                  >
                    <div className={isRed ? 'text-red-400' : isGreen ? 'text-green-400' : 'text-white'}>
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
          <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Target Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={`Min: ${pair.minValue} | Max: ${pair.maxValue}`}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  step="0.01"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Range: ${pair.minValue.toLocaleString()} - ${pair.maxValue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Amount ({selectedMarket})</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  step="0.01"
                />
                <button
                  onClick={() => setAmount((user?.balance || 0).toString())}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition"
                >
                  Max
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Available: ${user?.balance?.toLocaleString() || '0'} {selectedMarket}
              </p>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting || !!openOrder}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                activeTab === 'buy'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? 'Processing...' : openOrder ? 'Open Order Exists' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${pair.symbol}`}
            </button>
          </div>

          {/* Open Order Info */}
          {openOrder && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <h3 className="text-yellow-400 font-semibold mb-2">Open Order</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">Type: <span className={openOrder.type === 'buy' ? 'text-green-400' : 'text-red-400'}>{openOrder.type.toUpperCase()}</span></p>
                <p className="text-gray-300">Amount Invested: ${openOrder.amount.toLocaleString()}</p>
                <p className="text-gray-300">Entry Price: ${openOrder.price.toLocaleString()}</p>
                <p className="text-gray-300">Target Price: ${openOrder.targetPrice.toLocaleString()}</p>
                <p className="text-gray-300">Current Price: ${pair.currentValue.toLocaleString()}</p>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${openOrder.type === 'buy' ? 'bg-green-500' : 'bg-red-500'} transition-all duration-300`}
                    style={{ 
                      width: `${Math.min(100, Math.max(0, 
                        openOrder.type === 'buy' 
                          ? ((openOrder.targetPrice - pair.currentValue) / (openOrder.targetPrice - openOrder.price)) * 100
                          : ((pair.currentValue - openOrder.targetPrice) / (openOrder.price - openOrder.targetPrice)) * 100
                      ))}%` 
                    }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  {openOrder.type === 'buy' 
                    ? `Profit when price drops to $${openOrder.targetPrice.toLocaleString()}`
                    : `Profit when price rises to $${openOrder.targetPrice.toLocaleString()}`}
                </p>
              </div>
            </div>
          )}

          {/* Market Info */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Market Info</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">24h Low:</span>
              <span className="text-red-400">${pair.minValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">24h High:</span>
              <span className="text-green-400">${pair.maxValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Current Price:</span>
              <span className="text-white">${pair.currentValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}