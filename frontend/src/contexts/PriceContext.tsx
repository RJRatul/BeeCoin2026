'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

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
  isActive: boolean;
  holdings?: string;
  holdingsValue?: number;
}

interface PriceContextType {
  pairs: Pair[];
  loading: boolean;
  updatePairPrice: (pairId: string, newValue: number) => void;
  refreshPairs: () => Promise<void>;
  getPairBySymbol: (symbol: string) => Pair | undefined;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export const usePrice = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
};

interface PriceProviderProps {
  children: ReactNode;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ children }) => {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPairs = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/pairs`);
      const pairsWithHoldings = response.data.pairs.map((pair: Pair) => ({
        ...pair,
        holdings: getRandomHoldings(pair.symbol),
        holdingsValue: calculateHoldingsValue(pair),
        currentValue: generateRealisticPrice(pair)
      }));
      setPairs(pairsWithHoldings);
    } catch (error) {
      console.error('Error fetching pairs:', error);
    } finally {
      setLoading(false);
    }
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

  const calculateHoldingsValue = (pair: Pair): number => {
    const holdingsAmount = parseFloat(getRandomHoldings(pair.symbol).split(' ')[0].replace(/,/g, ''));
    return holdingsAmount * pair.currentValue;
  };

  const generateRealisticPrice = (pair: Pair): number => {
    const { minValue, maxValue, minPercentage, maxPercentage } = pair;
    const range = maxValue - minValue;
    const randomPercent = Math.random();
    let price = minValue + (range * randomPercent);
    
    const percentVariation = minPercentage + (Math.random() * (maxPercentage - minPercentage));
    const variation = price * (percentVariation / 100);
    
    if (Math.random() > 0.5) {
      price += variation;
    } else {
      price -= variation;
    }
    
    return Math.max(minValue, Math.min(maxValue, price));
  };

  const updatePairPrice = (pairId: string, newValue: number) => {
    setPairs(prevPairs => 
      prevPairs.map(pair => 
        pair._id === pairId 
          ? { 
              ...pair, 
              currentValue: newValue,
              holdingsValue: calculateHoldingsValue({ ...pair, currentValue: newValue })
            }
          : pair
      )
    );
  };

  const refreshPairs = async () => {
    setLoading(true);
    await fetchPairs();
  };

  const getPairBySymbol = (symbol: string) => {
    return pairs.find(p => p.symbol === symbol);
  };

  // Start price updates
  useEffect(() => {
    fetchPairs();
    
    const updatePrices = () => {
      setPairs(prevPairs => 
        prevPairs.map(pair => {
          const { minValue, maxValue, minPercentage, maxPercentage, currentValue } = pair;
          
          const percentChange = minPercentage + (Math.random() * (maxPercentage - minPercentage));
          let newValue = currentValue * (1 + (percentChange / 100));
          
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
        })
      );
    };

    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PriceContext.Provider value={{ pairs, loading, updatePairPrice, refreshPairs, getPairBySymbol }}>
      {children}
    </PriceContext.Provider>
  );
};