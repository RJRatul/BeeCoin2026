'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

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
}

export default function TradePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [algoTradeActive, setAlgoTradeActive] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPairs();
    startPriceUpdates();
  }, [user]);

  const fetchPairs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/pairs');
      setPairs(response.data.pairs);
    } catch (error) {
      console.error('Error fetching pairs:', error);
      toast.error('Failed to fetch trading pairs');
    } finally {
      setLoading(false);
    }
  };

  const startPriceUpdates = () => {
    setInterval(async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/pairs');
        setPairs(response.data.pairs);
      } catch (error) {
        console.error('Error updating prices:', error);
      }
    }, 5000);
  };

  const getPriceChange = (pair: Pair) => {
    const change = ((pair.currentValue - pair.minValue) / (pair.maxValue - pair.minValue)) * 100;
    const isPositive = pair.currentValue > (pair.minValue + pair.maxValue) / 2;
    return { change, isPositive };
  };

  const recommendedPairs = pairs.filter(p => p.isRecommended).slice(0, 5);
  const otherPairs = pairs.filter(p => !p.isRecommended);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Balance */}
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-gray-400 text-sm">Total Balance</p>
              <h2 className="text-3xl font-bold">${user?.balance?.toLocaleString() || '0.00'}</h2>
              <p className="text-success text-sm">+5.01%</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/deposit')}
                className="bg-success text-white px-6 py-2 rounded-lg hover:bg-success/90 transition"
              >
                Deposit
              </button>
              <button
                onClick={() => router.push('/withdraw')}
                className="bg-danger text-white px-6 py-2 rounded-lg hover:bg-danger/90 transition"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* ALGO Trade Section */}
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">ALGO Trade</h3>
              <p className="text-gray-400 text-sm">Automated trading bot</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={algoTradeActive}
                onChange={() => setAlgoTradeActive(!algoTradeActive)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
          {algoTradeActive && (
            <p className="text-sm text-gray-400 mt-2">Algo Trade automatically deactivates after profit calculation</p>
          )}
        </div>

        {/* Trading Pairs */}
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-xl font-semibold">Trading Pairs</h3>
          </div>
          
          {/* Recommended Pairs */}
          {recommendedPairs.length > 0 && (
            <div className="border-b border-gray-700">
              <div className="p-4 bg-secondary/30">
                <h4 className="text-lg font-semibold text-accent">Top 5 Recommended</h4>
              </div>
              {recommendedPairs.map((pair) => {
                const { change, isPositive } = getPriceChange(pair);
                return (
                  <div key={pair._id} className="flex items-center justify-between p-4 border-b border-gray-700 hover:bg-secondary/40 transition cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-2xl">{pair.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{pair.name}</h4>
                        <p className="text-sm text-gray-400">{pair.symbol}/USD</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${pair.currentValue.toLocaleString()}</p>
                      <p className={`text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {isPositive ? '+' : '-'}{change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Other Pairs */}
          {otherPairs.length > 0 && (showAll || otherPairs.length <= 5) && (
            <div>
              <div className="p-4 bg-secondary/30">
                <h4 className="text-lg font-semibold">Other Pairs</h4>
              </div>
              {(showAll ? otherPairs : otherPairs.slice(0, 5)).map((pair) => {
                const { change, isPositive } = getPriceChange(pair);
                return (
                  <div key={pair._id} className="flex items-center justify-between p-4 border-b border-gray-700 hover:bg-secondary/40 transition cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-2xl">{pair.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{pair.name}</h4>
                        <p className="text-sm text-gray-400">{pair.symbol}/USD</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${pair.currentValue.toLocaleString()}</p>
                      <p className={`text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {isPositive ? '+' : '-'}{change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {otherPairs.length > 5 && !showAll && (
                <div className="p-4 text-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-accent hover:text-accent/80 transition"
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
  );
}