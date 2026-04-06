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
  const { user, token } = useAuth();
  const { pairs, loading } = usePrice();
  const router = useRouter();
  const [showAllOtherPairs, setShowAllOtherPairs] = useState(false);
  const [openOrder, setOpenOrder] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchOpenOrder();
  }, [user]);

  const fetchOpenOrder = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/open`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.order) {
        setOpenOrder(response.data.order);
      }
    } catch (error) {
      console.error('Error fetching open order:', error);
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

  // Check if target is reached for the active order
  const isTargetReached = (pair: any) => {
    if (!openOrder || pair.symbol !== openOrder.pairSymbol) return false;
    
    if (openOrder.type === 'buy') {
      return pair.currentValue <= openOrder.targetPrice;
    } else {
      return pair.currentValue >= openOrder.targetPrice;
    }
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
            {/* Recommended Pairs */}
            {recommendedPairs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-purple-400 text-sm font-semibold mb-3 px-2">⭐ TOP 5 RECOMMENDED</h3>
                {recommendedPairs.map((pair) => {
                  const { isPositive, percentageChange } = getPriceChange(pair);
                  const hasOpenOrder = openOrder?.pairSymbol === pair.symbol;
                  const targetReached = hasOpenOrder && isTargetReached(pair);
                  
                  // Determine glow color based on order type and target status
                  let glowColor = '';
                  if (hasOpenOrder) {
                    if (targetReached) {
                      glowColor = openOrder?.type === 'buy' ? 'green' : 'green';
                    } else {
                      glowColor = openOrder?.type === 'buy' ? 'yellow' : 'yellow';
                    }
                  }
                  
                  return (
                    <div
                      key={pair._id}
                      className={`relative rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                        hasOpenOrder ? 'bg-gray-800/70' : 'bg-gray-800/50 hover:bg-gray-700/70'
                      }`}
                      onClick={() => router.push(`/trade/${pair.symbol}`)}
                    >
                      {/* Glow Effects for Active Order Card */}
                      {hasOpenOrder && (
                        <>
                          {/* Outer glow */}
                          <div className={`absolute -inset-0.5 rounded-2xl blur-xl opacity-75 animate-pulse ${
                            targetReached 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          }`} />
                          {/* Inner glow */}
                          <div className={`absolute -inset-0.5 rounded-2xl blur-md opacity-50 ${
                            targetReached 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          }`} />
                          {/* Content background */}
                          <div className="relative bg-gray-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center">
                                  {pair.image ? (
                                    <Image src={pair.image} alt={pair.name} width={40} height={40} className="rounded-full" />
                                  ) : (
                                    <span className="text-2xl">{pair.symbol.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-white font-semibold text-base">{pair.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      openOrder?.type === 'buy' 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {openOrder?.type?.toUpperCase()} ACTIVE
                                    </span>
                                  </div>
                                  <p className="text-gray-400 text-sm">{pair.holdings || `${Math.floor(Math.random() * 100)} ${pair.symbol}`}</p>
                                  <p className="text-gray-500 text-xs mt-1">
                                    24h Range: ${pair.minValue.toLocaleString()} - ${pair.maxValue.toLocaleString()}
                                  </p>
                                  {targetReached && (
                                    <p className="text-green-400 text-xs mt-1 font-semibold animate-pulse">
                                      ✓ Target Reached! Order will close soon
                                    </p>
                                  )}
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
                                  Target: ${openOrder?.targetPrice?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Normal card without glow */}
                      {!hasOpenOrder && (
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
                      )}
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
                  const targetReached = hasOpenOrder && isTargetReached(pair);
                  
                  let glowColor = '';
                  if (hasOpenOrder) {
                    if (targetReached) {
                      glowColor = openOrder?.type === 'buy' ? 'green' : 'green';
                    } else {
                      glowColor = openOrder?.type === 'buy' ? 'yellow' : 'yellow';
                    }
                  }
                  
                  return (
                    <div
                      key={pair._id}
                      className={`relative rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                        hasOpenOrder ? 'bg-gray-800/70' : 'bg-gray-800/50 hover:bg-gray-700/70'
                      }`}
                      onClick={() => router.push(`/trade/${pair.symbol}`)}
                    >
                      {hasOpenOrder && (
                        <>
                          <div className={`absolute -inset-0.5 rounded-2xl blur-xl opacity-75 animate-pulse ${
                            targetReached 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          }`} />
                          <div className={`absolute -inset-0.5 rounded-2xl blur-md opacity-50 ${
                            targetReached 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          }`} />
                          <div className="relative bg-gray-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center">
                                  {pair.image ? (
                                    <Image src={pair.image} alt={pair.name} width={40} height={40} className="rounded-full" />
                                  ) : (
                                    <span className="text-2xl">{pair.symbol.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-white font-semibold text-base">{pair.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      openOrder?.type === 'buy' 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {openOrder?.type?.toUpperCase()} ACTIVE
                                    </span>
                                  </div>
                                  <p className="text-gray-400 text-sm">{pair.holdings || `${Math.floor(Math.random() * 100)} ${pair.symbol}`}</p>
                                  <p className="text-gray-500 text-xs mt-1">
                                    24h Range: ${pair.minValue.toLocaleString()} - ${pair.maxValue.toLocaleString()}
                                  </p>
                                  {targetReached && (
                                    <p className="text-green-400 text-xs mt-1 font-semibold animate-pulse">
                                      ✓ Target Reached! Order will close soon
                                    </p>
                                  )}
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
                                  Target: ${openOrder?.targetPrice?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {!hasOpenOrder && (
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
                      )}
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