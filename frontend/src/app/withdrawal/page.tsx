'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function WithdrawPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    
    if (!amount || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        'http://localhost:5000/api/transactions/withdraw',
        {
          amount: withdrawAmount,
          description
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Withdrawal request submitted! Awaiting admin approval.');
      router.push('/history');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary pt-20 px-4 pb-8">
      <div className="max-w-md mx-auto">
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-6">Withdraw Funds</h1>
          
          <div className="mb-6 p-4 bg-primary/50 rounded-lg">
            <p className="text-gray-400 text-sm">Available Balance</p>
            <p className="text-2xl font-bold">${user?.balance?.toLocaleString() || '0.00'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter amount"
                min="10"
                max={user?.balance}
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Add a note"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-danger text-white py-3 rounded-lg font-semibold hover:bg-danger/90 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Withdrawals will be processed after admin approval</p>
            <p className="mt-2">Minimum withdrawal: $10.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}