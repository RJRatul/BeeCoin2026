'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrice } from '@/contexts/PriceContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaArrowDown, FaQrcode, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import PrivateLayout from '@/layouts/PrivateLayout';
import axios from 'axios';

export default function TradePage() {
  const { user, token, refreshUser } = useAuth();
  const { pairs, loading } = usePrice();
  const router = useRouter();
  const [showAllOtherPairs, setShowAllOtherPairs] = useState(false);
  const [openOrder, setOpenOrder] = useState<any>(null);

  useEffect(() => {
  if (!user) return; // don't run until user is ready
  fetchOpenOrder();
  const interval = setInterval(() => {
    fetchOpenOrder();
    refreshUser();
  }, 3000);
  return () => clearInterval(interval);
}, [user]);

  const fetchOpenOrder = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/orders/open`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.order) {
        setOpenOrder(response.data.order);
      } else {
        setOpenOrder(null);
      }
    } catch (error) {
      console.error('Error fetching open order:', error);
      setOpenOrder(null);
    }
  };

  const getPriceChange = (pair: any) => {
    const { minValue, maxValue, currentValue } = pair;
    const isPositive = currentValue > (minValue + maxValue) / 2;
    const avgValue = (minValue + maxValue) / 2;
    const percentageChange = ((currentValue - avgValue) / avgValue) * 100;
    
    return { 
      isPositive, 
      percentageChange: Math.abs(percentageChange).toFixed(2)
    };
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
            {(() => {
              const activePair = openOrder ? pairs.find((p: any) => p.symbol === openOrder.pairSymbol) : null;
              const isProfit = activePair && activePair.currentValue > openOrder?.price;
              const isLoss = activePair && activePair.currentValue <= openOrder?.price;
              return (
                <div
                  className={`text-center mb-8 rounded-2xl py-7 px-4 transition-all duration-700 ${
                    isProfit ? 'trade-card-profit' : isLoss ? 'trade-card-loss' : ''
                  }`}
                >
                  <h1 className="text-white text-2xl font-bold mb-2">{getUserName()}</h1>
                  <div className="text-white text-4xl font-bold mb-2">
                    ${user?.balance?.toLocaleString() || '0.00'}
                  </div>
                  <div className="text-green-400 text-lg font-semibold">+5.01%</div>
                </div>
              );
            })()}

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
            {/* Recommended Pairs */}
            {recommendedPairs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-purple-400 text-sm font-semibold mb-3 px-2">⭐ TOP 5 RECOMMENDED</h3>
                {recommendedPairs.map((pair) => {
                  const { isPositive, percentageChange } = getPriceChange(pair);
                  const hasOpenOrder = openOrder?.pairSymbol === pair.symbol;
                  
                  return (
                    <div
                      key={pair._id}
                      className={`rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                        hasOpenOrder 
                          ? 'bg-yellow-500/20 border-2 border-yellow-500' 
                          : 'bg-gray-800/50 hover:bg-gray-700/70'
                      }`}
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
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold text-base">{pair.name}</h3>
                              {hasOpenOrder && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                  ACTIVE ORDER
                                </span>
                              )}
                            </div>
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

            {/* Show More Button */}
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

            {/* Other Pairs */}
            {showAllOtherPairs && otherPairs.length > 0 && (
              <div className="space-y-3">
                {otherPairs.map((pair) => {
                  const { isPositive, percentageChange } = getPriceChange(pair);
                  const hasOpenOrder = openOrder?.pairSymbol === pair.symbol;
                  
                  return (
                    <div
                      key={pair._id}
                      className={`rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                        hasOpenOrder 
                          ? 'bg-yellow-500/20 border-2 border-yellow-500' 
                          : 'bg-gray-800/50 hover:bg-gray-700/70'
                      }`}
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
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold text-base">{pair.name}</h3>
                              {hasOpenOrder && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                  ACTIVE ORDER
                                </span>
                              )}
                            </div>
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