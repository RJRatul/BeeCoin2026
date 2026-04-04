'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FaArrowDown, FaQrcode, FaRobot, FaInfoCircle } from 'react-icons/fa';
import PrivateLayout from '@/layouts/PrivateLayout';

interface Pair {
  _id: string;
  name: string;
  symbol: string;
  image: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  minPercentage: number;
  maxPercentage: number;
  isRecommended: boolean;
  holdings?: string;
  holdingsValue?: number;
}

export default function TradePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [marketOffDays, setMarketOffDays] = useState<string[]>([]);
  const [isLoadingMarketDays, setIsLoadingMarketDays] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPairs();
    fetchMarketOffDays();
    startPriceUpdates();
  }, [user]);

  const fetchPairs = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/pairs`);
      // Add holdings data to pairs
      const pairsWithHoldings = response.data.pairs.map((pair: Pair) => ({
        ...pair,
        holdings: getRandomHoldings(pair.symbol),
        holdingsValue: getRandomHoldingsValue(pair.currentValue)
      }));
      setPairs(pairsWithHoldings);
    } catch (error) {
      console.error('Error fetching pairs:', error);
      toast.error('Failed to fetch trading pairs');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketOffDays = async () => {
    try {
      setIsLoadingMarketDays(true);
      // Mock market off days - in production, fetch from API
      setMarketOffDays(['Sunday', 'Saturday']);
    } catch (error) {
      console.error('Failed to fetch market off days:', error);
    } finally {
      setIsLoadingMarketDays(false);
    }
  };

  const startPriceUpdates = () => {
    setInterval(async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/pairs`);
        const updatedPairs = response.data.pairs.map((pair: Pair) => ({
          ...pair,
          holdingsValue: getRandomHoldingsValue(pair.currentValue)
        }));
        setPairs(updatedPairs);
      } catch (error) {
        console.error('Error updating prices:', error);
      }
    }, 5000);
  };

  const getRandomHoldings = (symbol: string) => {
    const holdings: { [key: string]: string } = {
      'BTC': '0.094 BTC',
      'ETH': '1.83 ETH',
      'MATIC': '674.42 MATIC',
      'SOL': '84.36 SOL',
      'TRUMP': '245.67 TRUMP',
      'TON': '156.89 TON',
      'DOT': '89.45 DOT',
      'BNB': '12.45 BNB',
      'ADA': '1250.50 ADA',
      'XRP': '845.67 XRP',
      'DOGE': '2567.89 DOGE',
      'PEPE': '4,567,890 PEPE',
      'LINK': '45.67 LINK',
      'LTC': '23.45 LTC'
    };
    return holdings[symbol] || `${Math.floor(Math.random() * 1000)} ${symbol}`;
  };

  const getRandomHoldingsValue = (currentValue: number) => {
    const randomAmount = Math.random() * 10000;
    return randomAmount;
  };

  const getPriceChange = (pair: Pair) => {
    const change = ((pair.currentValue - pair.minValue) / (pair.maxValue - pair.minValue)) * 100;
    const isPositive = pair.currentValue > (pair.minValue + pair.maxValue) / 2;
    const absoluteChange = pair.currentValue - (pair.minValue + pair.maxValue) / 2;
    return { change, isPositive, absoluteChange };
  };

  const isTodayMarketOff = () => {
    if (marketOffDays.length === 0) return false;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return marketOffDays.includes(today);
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.lastName) return user.lastName;
    return "User";
  };

  const recommendedPairs = pairs.filter(p => p.isRecommended).slice(0, 5);
  const otherPairs = pairs.filter(p => !p.isRecommended);

  const actionButtons = [
    {
      label: "Withdrawal",
      icon: <FaArrowDown className="w-5 h-5" />,
      onClick: () => router.push("/withdrawal"),
    },
    {
      label: "Deposit",
      icon: <FaQrcode className="w-5 h-5" />,
      onClick: () => router.push("/deposit"),
    },
  ];

  if (loading) {
    return (
      <PrivateLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <div className="text-white">Loading...</div>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-md mx-auto">
          {/* Account Header */}
          <div className="mb-6">
            <div className="text-center mb-8">
              <h1 className="text-white text-2xl font-bold mb-2">
                {getUserName()}
              </h1>
              <div className="text-white text-4xl font-bold mb-2">
                ${user?.balance?.toLocaleString() || '0.00'}
              </div>
              <div className="text-green-400 text-lg font-semibold">
                +5.01%
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-4 mb-8">
              {actionButtons.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-3 flex-1"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg border border-gray-700 transition-all duration-200 hover:bg-gray-700 hover:scale-105">
                    <div className="text-gray-300">{action.icon}</div>
                  </div>
                  <span className="text-white text-sm font-medium text-center">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>

            {/* ALGO Section with Market Off Days */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-2xl p-4 border border-purple-700/30 mb-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center">
                    <FaRobot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">ALGO Trade</span>
                    <div className="text-purple-300 text-xs">
                      Automated trading bot
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Off Days Info */}
              {marketOffDays.length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-700/30">
                  <div className="flex items-start gap-2">
                    <div className="text-xs text-yellow-300">
                      <div className="font-medium mb-1">
                        {isTodayMarketOff() ? (
                          <span className="text-yellow-400">⚠️ Today is market closed</span>
                        ) : (
                          <span className="text-purple-300">📈 Market is open today</span>
                        )}
                      </div>
                      {isTodayMarketOff() && (
                        <div className="text-yellow-200/70 text-[10px] mt-1">
                          No Algo trading profits will be added today
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoadingMarketDays && (
                <div className="mt-3 pt-3 border-t border-purple-700/30">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
                    <div className="text-xs text-yellow-300">
                      Loading market schedule...
                    </div>
                  </div>
                </div>
              )}

              {/* Info Tooltip */}
              <div className="mt-2 flex items-center gap-1 text-purple-300/70 text-[10px]">
                <FaInfoCircle className="w-2.5 h-2.5" />
                <span>Algo Trade automatically deactivates after profit calculation</span>
              </div>
            </div>
          </div>

          {/* Trading Pairs Section */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {/* Recommended Pairs */}
            {recommendedPairs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-purple-400 text-sm font-semibold mb-3 px-2">⭐ TOP 5 RECOMMENDED</h3>
                {recommendedPairs.map((pair) => {
                  const { change, isPositive, absoluteChange } = getPriceChange(pair);
                  return (
                    <div
                      key={pair._id}
                      className="bg-gray-800/50 rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:bg-gray-700/70"
                      onClick={() => router.push(`/trade/${pair.symbol}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center">
                            {pair.image ? (
                              <Image src={pair.image} alt={pair.name} width={40} height={40} className="rounded-full" />
                            ) : (
                              <span className="text-2xl">{pair.symbol.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-base">{pair.name}</h3>
                            <p className="text-gray-400 text-sm">{pair.holdings || `${Math.floor(Math.random() * 100)} ${pair.symbol}`}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-base">
                            ${(pair.holdingsValue || pair.currentValue * (Math.random() * 10)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{absoluteChange.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other Pairs */}
            {otherPairs.length > 0 && (showAll || otherPairs.length <= 5) && (
              <div>
                <h3 className="text-gray-400 text-sm font-semibold mb-3 px-2">📊 ALL PAIRS</h3>
                {(showAll ? otherPairs : otherPairs.slice(0, 5)).map((pair) => {
                  const { change, isPositive, absoluteChange } = getPriceChange(pair);
                  return (
                    <div
                      key={pair._id}
                      className="bg-gray-800/50 rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:bg-gray-700/70"
                      onClick={() => router.push(`/trade/${pair.symbol}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center">
                            {pair.image ? (
                              <Image src={pair.image} alt={pair.name} width={40} height={40} className="rounded-full" />
                            ) : (
                              <span className="text-2xl">{pair.symbol.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-base">{pair.name}</h3>
                            <p className="text-gray-400 text-sm">{pair.holdings || `${Math.floor(Math.random() * 100)} ${pair.symbol}`}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-base">
                            ${(pair.holdingsValue || pair.currentValue * (Math.random() * 10)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{absoluteChange.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {otherPairs.length > 5 && !showAll && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => setShowAll(true)}
                      className="text-purple-400 hover:text-purple-300 transition text-sm font-medium"
                    >
                      View More ({otherPairs.length - 5} more)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}