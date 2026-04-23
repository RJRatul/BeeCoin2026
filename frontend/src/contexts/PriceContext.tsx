'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { io as socketIO, Socket } from 'socket.io-client';

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
  if (!context) throw new Error('usePrice must be used within a PriceProvider');
  return context;
};

interface PriceProviderProps {
  children: ReactNode;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ children }) => {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const joinedSymbolsRef = useRef<Set<string>>(new Set());

  const getRandomHoldings = (symbol: string) => {
    const holdings: { [key: string]: string } = {
      'BTC': '0.094 BTC', 'ETH': '1.83 ETH', 'MATIC': '674.42 MATIC',
      'SOL': '84.36 SOL', 'TRUMP': '245.67 TRUMP', 'TON': '156.89 TON',
      'DOT': '89.45 DOT', 'BNB': '12.45 BNB', 'ADA': '1250.50 ADA',
      'XRP': '845.67 XRP', 'DOGE': '2567.89 DOGE', 'PEPE': '4567890 PEPE',
      'LINK': '45.67 LINK', 'LTC': '23.45 LTC',
    };
    return holdings[symbol] || `${Math.floor(Math.random() * 1000)} ${symbol}`;
  };

  const calculateHoldingsValue = (pair: Pair): number => {
    const amount = parseFloat(getRandomHoldings(pair.symbol).split(' ')[0].replace(/,/g, ''));
    return amount * pair.currentValue;
  };

  // Resolve relative /uploads/ image paths to full backend URL
  const resolveImage = (image: string): string => {
    if (!image || image.startsWith('http')) return image;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const base = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : '';
    return `${base}${image}`;
  };

  const fetchPairs = async (): Promise<Pair[]> => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/pairs`);
      const loaded: Pair[] = response.data.pairs.map((pair: Pair) => ({
        ...pair,
        image: resolveImage(pair.image),
        holdings: getRandomHoldings(pair.symbol),
        holdingsValue: calculateHoldingsValue(pair),
      }));
      setPairs(loaded);
      return loaded;
    } catch (error) {
      console.error('Error fetching pairs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updatePairPrice = (pairId: string, newValue: number) => {
    setPairs(prev =>
      prev.map(pair =>
        pair._id === pairId
          ? { ...pair, currentValue: newValue, holdingsValue: calculateHoldingsValue({ ...pair, currentValue: newValue }) }
          : pair
      )
    );
  };

  const refreshPairs = async () => {
    setLoading(true);
    await fetchPairs();
  };

  const getPairBySymbol = (symbol: string) => pairs.find(p => p.symbol === symbol);

  useEffect(() => {
    fetchPairs().then((loadedPairs) => {
      if (loadedPairs.length === 0) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const socketHost = apiUrl.startsWith('http')
        ? apiUrl.replace('/api', '')
        : typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:5000';

      const socket = socketIO(socketHost, {
        transports: ['polling', 'websocket'],
        path: '/socket.io',
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        // Subscribe to live price updates for all active pairs
        loadedPairs.forEach((pair: Pair) => {
          if (pair.isActive) {
            socket.emit('join_pair', pair.symbol);
            joinedSymbolsRef.current.add(pair.symbol);
          }
        });
      });

      // Update pair price in state when backend emits a new tick (every 1 minute)
      socket.on('price_update', ({ symbol, price }: { symbol: string; price: number }) => {
        setPairs(prev =>
          prev.map(p =>
            p.symbol === symbol
              ? { ...p, currentValue: price, holdingsValue: calculateHoldingsValue({ ...p, currentValue: price }) }
              : p
          )
        );
      });
    });

    return () => {
      if (socketRef.current) {
        joinedSymbolsRef.current.forEach(sym => socketRef.current?.emit('leave_pair', sym));
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <PriceContext.Provider value={{ pairs, loading, updatePairPrice, refreshPairs, getPairBySymbol }}>
      {children}
    </PriceContext.Provider>
  );
};
