'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrivateLayout from '@/layouts/PrivateLayout';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FaDollarSign,
  FaReceipt,
  FaPaperPlane,
  FaTimes,
  FaHistory,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function DepositPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pt-2">
            <h1 className="text-2xl font-bold text-white">Deposit Management</h1>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Balance</p>
              <p className="text-white font-bold text-lg">
                ${user?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === 'deposit'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <FaMoneyBillWave className="mr-2" />
                Request Deposit
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
                Deposit History
              </button>
            </nav>
          </div>

          {/* Content */}
          {activeTab === 'deposit' && <DepositForm token={token} />}
          {activeTab === 'history' && <DepositHistoryTab token={token} />}
        </div>
      </div>
    </PrivateLayout>
  );
}

function DepositForm({ token }: { token: string | null }) {
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!transactionId.trim()) {
      toast.error('Please enter your Binance transaction ID');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${API_URL}/transactions/deposit`,
        { amount: amountNum, transactionId: transactionId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Deposit request submitted! Awaiting admin approval.');
      setAmount('');
      setTransactionId('');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.response?.data?.error || 'Failed to submit deposit request'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gray-800/60 rounded-2xl shadow p-6 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-6">Request Deposit</h2>

        {/* QR Code */}
        <div
          className="cursor-pointer inline-block mb-4 rounded-xl overflow-hidden border border-gray-700 hover:opacity-80 transition-opacity"
          onClick={() => setShowImageModal(true)}
        >
          <Image
            src="/binanceQR.jpg"
            alt="Binance Pay QR Code"
            width={100}
            height={100}
            className="object-contain"
            priority
          />
        </div>
        <p className="text-sm text-gray-300 mb-1 font-medium">Tap the QR code to enlarge</p>
        <p className="text-gray-400 text-sm mb-6">
          Send your deposit to the above Binance Pay QR code. Then fill in the exact amount and
          the transaction ID you receive after the payment.
        </p>

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
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Binance Transaction ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaReceipt className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                placeholder="Enter transaction ID from Binance"
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
                Submit Deposit Request
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Deposits will be credited after admin approval
        </p>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-gray-800 rounded-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Binance Pay QR Code</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex justify-center">
              <Image
                src="/binanceQR.jpg"
                alt="Binance Pay QR Code"
                width={300}
                height={300}
                className="rounded-xl object-contain"
                priority
              />
            </div>
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => setShowImageModal(false)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DepositHistoryTab({ token }: { token: string | null }) {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/transactions/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const all = res.data.transactions || [];
        setDeposits(all.filter((t: any) => t.type === 'deposit'));
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <FaCheckCircle className="text-green-500" />;
    if (status === 'rejected') return <FaTimesCircle className="text-red-500" />;
    return <FaClock className="text-yellow-500" />;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return <span className="text-green-400">Approved</span>;
    if (status === 'rejected') return <span className="text-red-400">Rejected</span>;
    return <span className="text-yellow-400">Pending</span>;
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
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <FaHistory className="text-purple-400" /> Deposit History
      </h2>

      {deposits.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FaHistory className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No deposit history found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Transaction ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit._id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3 text-white font-semibold">
                    ${deposit.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs max-w-[140px] truncate">
                    {deposit.transactionId}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deposit.status)}
                      {getStatusLabel(deposit.status)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(deposit.createdAt).toLocaleDateString()}
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
