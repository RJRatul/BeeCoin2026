'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    activePairs: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/pairs');
      setStats({
        totalUsers: 1250,
        totalVolume: 2450000,
        activePairs: response.data.pairs?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary">
      {/* Navigation */}
      <nav className="bg-secondary/50 backdrop-blur-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-accent">Beecoin</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link href="/trade" className="text-white hover:text-accent transition">
                    Trade
                  </Link>
                  <Link href="/deposit" className="text-white hover:text-accent transition">
                    Deposit
                  </Link>
                  <Link href="/withdraw" className="text-white hover:text-accent transition">
                    Withdraw
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      window.location.href = '/';
                    }}
                    className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-white hover:text-accent transition">
                    Login
                  </Link>
                  <Link href="/register" className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Trade Cryptocurrency
            <span className="text-accent"> Securely</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the future of digital asset trading with Beecoin. Fast, secure, and reliable cryptocurrency exchange.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href={user ? "/trade" : "/register"}
              className="bg-accent text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-accent/90 transition"
            >
              Start Trading
            </Link>
            <Link
              href="/trade"
              className="border-2 border-accent text-accent px-8 py-3 rounded-lg text-lg font-semibold hover:bg-accent/10 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 text-center">
            <h3 className="text-4xl font-bold text-accent mb-2">{stats.totalUsers}+</h3>
            <p className="text-gray-300">Active Traders</p>
          </div>
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 text-center">
            <h3 className="text-4xl font-bold text-accent mb-2">${stats.totalVolume.toLocaleString()}+</h3>
            <p className="text-gray-300">Trading Volume</p>
          </div>
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 text-center">
            <h3 className="text-4xl font-bold text-accent mb-2">{stats.activePairs}+</h3>
            <p className="text-gray-300">Trading Pairs</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Beecoin?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-secondary/30 rounded-xl p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure Trading</h3>
            <p className="text-gray-300">Advanced security measures to protect your assets and data.</p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Fast Transactions</h3>
            <p className="text-gray-300">Lightning-fast deposits and withdrawals with minimal fees.</p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-6">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Advanced Tools</h3>
            <p className="text-gray-300">Professional trading tools and real-time market data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}