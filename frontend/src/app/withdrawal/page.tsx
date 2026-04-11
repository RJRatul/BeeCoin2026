'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrivateLayout from '@/layouts/PrivateLayout';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FaDollarSign,
  FaExchangeAlt,
  FaInfoCircle,
  FaHistory,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaRedo,
  FaPaperPlane,
} from 'react-icons/fa';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function WithdrawalPage() {
  const { user, token, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pt-2">
            <h1 className="text-2xl font-bold text-white">Withdrawal Management</h1>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className="text-white font-bold text-lg">
                ${user?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === 'withdraw'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <FaMoneyBillWave className="mr-2" />
                Request Withdrawal
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === 'history'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <FaHistory className="mr-2" />
                Withdrawal History
              </button>
            </nav>
          </div>

          {/* Content */}
          {activeTab === 'withdraw' && (
            <WithdrawalForm token={token} balance={user?.balance ?? 0} onSuccess={refreshUser} />
          )}
          {activeTab === 'history' && <WithdrawalHistoryTab token={token} />}
        </div>
      </div>
    </PrivateLayout>
  );
}

function WithdrawalForm({ token, balance, onSuccess }: { token: string | null; balance: number; onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum < 10) {
      toast.error('Minimum withdrawal amount is $10');
      return;
    }
    if (amountNum > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!binanceId.trim()) {
      toast.error('Please enter your Binance ID');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${API_URL}/transactions/withdraw`,
        { amount: amountNum, binanceId: binanceId.trim(), remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Withdrawal request submitted! Amount deducted from your balance.');
      setAmount('');
      setBinanceId('');
      setRemarks('');
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.response?.data?.error || 'Withdrawal request failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/60 rounded-2xl shadow p-6 border border-gray-700/50">
      <h2 className="text-lg font-semibold text-white mb-6">Request Withdrawal</h2>

      {/* Balance info */}
      <div className="mb-6 p-4 bg-gray-900/60 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Available to withdraw</p>
          <p className="text-white font-bold text-xl">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-purple-400 text-3xl opacity-40">
          <FaMoneyBillWave />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaDollarSign className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="number"
              step="0.01"
              min="10"
              max={balance}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              placeholder="Enter amount (min $10)"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimum withdrawal: $10.00</p>
        </div>

        {/* Binance ID */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Binance ID</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaExchangeAlt className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              required
              value={binanceId}
              onChange={(e) => setBinanceId(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              placeholder="Your Binance account ID"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">We will send funds to this Binance account</p>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Remarks (Optional)</label>
          <div className="relative">
            <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
              <FaInfoCircle className="h-5 w-5 text-gray-500" />
            </div>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white resize-none"
              placeholder="Any additional information..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {isLoading ? (
            'Processing...'
          ) : (
            <>
              <FaPaperPlane className="w-4 h-4" />
              Submit Withdrawal Request
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Withdrawals will be processed after admin approval
      </p>
    </div>
  );
}

function WithdrawalHistoryTab({ token }: { token: string | null }) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/transactions/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = res.data.transactions || [];
      setWithdrawals(all.filter((t: any) => t.type === 'withdraw'));
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <FaCheckCircle className="text-green-500" />;
    if (status === 'rejected') return <FaTimesCircle className="text-red-500" />;
    return <FaClock className="text-yellow-500" />;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return <span className="text-green-400 capitalize">{status}</span>;
    if (status === 'rejected') return <span className="text-red-400 capitalize">{status}</span>;
    return <span className="text-yellow-400">Pending</span>;
  };

  // Parse binanceId from description field (format: "Binance: {id} | {remarks}")
  const parseBinanceId = (description: string) => {
    if (!description) return '-';
    const match = description.match(/^Binance:\s*([^|]+)/);
    return match ? match[1].trim() : description;
  };

  const parseRemarks = (description: string) => {
    if (!description) return '';
    const match = description.match(/\|\s*(.+)$/);
    return match ? match[1].trim() : '';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700/50 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-1/4 mb-6" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-700 rounded mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaHistory className="text-purple-400" /> Withdrawal History
        </h2>
        <button
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors"
        >
          <FaRedo className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {withdrawals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FaHistory className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No withdrawal history found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Binance ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w._id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(w.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    ${w.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs max-w-[120px] truncate">
                    {parseBinanceId(w.description)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(w.status)}
                      {getStatusLabel(w.status)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">
                    {parseRemarks(w.description) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
