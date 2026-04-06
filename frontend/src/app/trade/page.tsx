'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FaArrowDown, FaQrcode, FaRobot, FaInfoCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
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
  const [showAllOtherPairs, setShowAllOtherPairs] = useState(false);
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
      // Add holdings data to pairs and generate realistic current values
      const pairsWithHoldings = response.data.pairs.map((pair: Pair) => ({
        ...pair,
        holdings: getRandomHoldings(pair.symbol),
        holdingsValue: calculateHoldingsValue(pair),
        currentValue: generateRealisticPrice(pair)
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

  // Generate realistic price based on min/max values
  const generateRealisticPrice = (pair: Pair): number => {
    const { minValue, maxValue, minPercentage, maxPercentage } = pair;
    const range = maxValue - minValue;
    const randomPercent = Math.random();
    let price = minValue + (range * randomPercent);
    
    // Apply percentage variation
    const percentVariation = minPercentage + (Math.random() * (maxPercentage - minPercentage));
    const variation = price * (percentVariation / 100);
    
    if (Math.random() > 0.5) {
      price += variation;
    } else {
      price -= variation;
    }
    
    return Math.max(minValue, Math.min(maxValue, price));
  };

  // Calculate holdings value based on current price
  const calculateHoldingsValue = (pair: Pair): number => {
    const holdingsAmount = parseFloat(getRandomHoldings(pair.symbol).split(' ')[0].replace(/,/g, ''));
    return holdingsAmount * pair.currentValue;
  };

  // Update single pair price with realistic movement
  const updatePairPrice = (pair: Pair): Pair => {
    const { minValue, maxValue, minPercentage, maxPercentage, currentValue } = pair;
    
    // Calculate price change based on percentage range
    const percentChange = minPercentage + (Math.random() * (maxPercentage - minPercentage));
    let newValue = currentValue * (1 + (percentChange / 100));
    
    // Ensure price stays within min/max bounds
    if (newValue > maxValue) {
      newValue = maxValue - (Math.random() * (maxValue - minValue) * 0.1);
    } else if (newValue < minValue) {
      newValue = minValue + (Math.random() * (maxValue - minValue) * 0.1);
    }
    
    return {
      ...pair,
      currentValue: newValue,
      holdingsValue: calculateHoldingsValue({ ...pair, currentValue: newValue })
    };
  };

  const startPriceUpdates = () => {
    setInterval(() => {
      setPairs(prevPairs => 
        prevPairs.map(pair => updatePairPrice(pair))
      );
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
      'PEPE': '4567890 PEPE',
      'LINK': '45.67 LINK',
      'LTC': '23.45 LTC'
    };
    return holdings[symbol] || `${Math.floor(Math.random() * 1000)} ${symbol}`;
  };

  const getPriceChange = (pair: Pair) => {
    const { minValue, maxValue, currentValue } = pair;
    
    // Determine if price is going up or down based on recent movement
    const isPositive = currentValue > (minValue + maxValue) / 2;
    
    // Calculate actual percentage change
    const avgValue = (minValue + maxValue) / 2;
    const percentageChange = ((currentValue - avgValue) / avgValue) * 100;
    
    return { 
      isPositive, 
      percentageChange: Math.abs(percentageChange).toFixed(2)
    };
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
          </div>

          {/* Trading Pairs Section */}
          <div className="space-y-3">
            {/* Recommended Pairs - Always visible */}
            {recommendedPairs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-purple-400 text-sm font-semibold mb-3 px-2">⭐ TOP 5 RECOMMENDED</h3>
                {recommendedPairs.map((pair) => {
                  const { isPositive, percentageChange } = getPriceChange(pair);
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
                            <p className="text-gray-500 text-xs mt-1">
                              24h Range: ${pair.minValue.toLocaleString()} - ${pair.maxValue.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-base">
                            ${pair.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{percentageChange}%
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            ${(pair.holdingsValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show More Button for Other Pairs */}
            {otherPairs.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAllOtherPairs(!showAllOtherPairs)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-xl hover:bg-gray-700/50 transition-all duration-200"
                >
                  <span className="text-gray-300 font-medium">
                    📊 Other Pairs ({otherPairs.length})
                  </span>
                  <div className="flex items-center text-purple-400">
                    <span className="text-sm mr-2">
                      {showAllOtherPairs ? 'Show Less' : 'Show More'}
                    </span>
                    {showAllOtherPairs ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                  </div>
                </button>
              </div>
            )}

            {/* Other Pairs - Conditionally visible */}
            {showAllOtherPairs && otherPairs.length > 0 && (
              <div className="space-y-3">
                {otherPairs.map((pair) => {
                  const { isPositive, percentageChange } = getPriceChange(pair);
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
                            <p className="text-gray-500 text-xs mt-1">
                              24h Range: ${pair.minValue.toLocaleString()} - ${pair.maxValue.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-base">
                            ${pair.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{percentageChange}%
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            ${(pair.holdingsValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}