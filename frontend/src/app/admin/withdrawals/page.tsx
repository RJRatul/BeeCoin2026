'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../layout';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface Transaction {
  type: string;
  _id: string;
  userId: { name: string; email: string };
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  transactionId: string;
  description: string;
  createdAt: string;
}

export default function WithdrawalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/transactions/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const withdrawals = response.data.transactions.filter((t: Transaction) => t.type === 'withdraw');
      setTransactions(withdrawals);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `/api/transactions/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Withdrawal approved successfully');
      fetchWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `/api/transactions/${id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Withdrawal rejected');
      fetchWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading...</div>
        </div>
    );
  }

  return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Withdrawal Requests</h1>
        
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-400">No withdrawal requests found</p>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction._id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-white">{transaction.userId?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-400">{transaction.userId?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{transaction.transactionId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">${transaction.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{new Date(transaction.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {transaction.description && (
                  <p className="text-sm text-gray-400 mb-3">{transaction.description}</p>
                )}
                
                {transaction.status === 'pending' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleApprove(transaction._id)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      <FaCheckCircle />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(transaction._id)}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      <FaTimesCircle />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
                
                {transaction.status !== 'pending' && (
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm ${
                    transaction.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {transaction.status.toUpperCase()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
  );
}