'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  balance: number;
  role: string;
}

interface Transaction {
  _id: string;
  userId: User;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  transactionId: string;
  description: string;
  createdAt: string;
}

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
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPair, setNewPair] = useState({
    name: '',
    symbol: '',
    image: '',
    minValue: '',
    maxValue: '',
    minPercentage: '',
    maxPercentage: '',
    isRecommended: false
  });

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      router.push('/admin-login');
      return;
    }
    fetchData();
  }, [activeTab]);

  // Create axios instance with auth header
  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin-login');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      if (activeTab === 'transactions') {
        const response = await axios.get('http://localhost:5000/api/transactions/all', config);
        setTransactions(response.data.transactions);
      } else if (activeTab === 'users') {
        const response = await axios.get('http://localhost:5000/api/users', config);
        setUsers(response.data.users);
      } else if (activeTab === 'pairs') {
        const response = await axios.get('http://localhost:5000/api/pairs', config);
        setPairs(response.data.pairs);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/admin-login');
      } else {
        toast.error('Failed to fetch data: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `http://localhost:5000/api/transactions/${id}/approve`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success('Transaction approved');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to approve transaction: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectTransaction = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `http://localhost:5000/api/transactions/${id}/reject`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success('Transaction rejected');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to reject transaction: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreatePair = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        'http://localhost:5000/api/pairs',
        {
          ...newPair,
          minValue: parseFloat(newPair.minValue),
          maxValue: parseFloat(newPair.maxValue),
          minPercentage: parseFloat(newPair.minPercentage),
          maxPercentage: parseFloat(newPair.maxPercentage)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success('Pair created successfully');
      setNewPair({
        name: '',
        symbol: '',
        image: '',
        minValue: '',
        maxValue: '',
        minPercentage: '',
        maxPercentage: '',
        isRecommended: false
      });
      fetchData();
    } catch (error: any) {
      toast.error('Failed to create pair: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePair = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pair?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(
        `http://localhost:5000/api/pairs/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success('Pair deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to delete pair: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdatePairRecommendation = async (id: string, isRecommended: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `http://localhost:5000/api/pairs/${id}`,
        { isRecommended: !isRecommended },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success('Pair updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to update pair: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin-login');
    toast.success('Logged out successfully');
  };

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
        {/* Admin Header */}
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-4 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-danger text-white px-4 py-2 rounded-lg hover:bg-danger/90 transition"
          >
            Logout
          </button>
        </div>

        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="border-b border-gray-700">
            <div className="flex space-x-4 p-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('pairs')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'pairs'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Trading Pairs
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'transactions' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Pending & Recent Transactions</h2>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-center text-gray-400">No transactions found</p>
                  ) : (
                    transactions.map((transaction) => (
                      <div key={transaction._id} className="bg-primary/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                          <div>
                            <p className="font-semibold capitalize">{transaction.type}</p>
                            <p className="text-sm text-gray-400">{transaction.transactionId}</p>
                            <p className="text-sm text-gray-400">
                              User: {transaction.userId?.name || 'N/A'} ({transaction.userId?.email})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xl">${transaction.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {transaction.status === 'pending' && (
                          <div className="flex space-x-2 mt-4">
                            <button
                              onClick={() => handleApproveTransaction(transaction._id)}
                              className="bg-success text-white px-4 py-2 rounded-lg hover:bg-success/90 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectTransaction(transaction._id)}
                              className="bg-danger text-white px-4 py-2 rounded-lg hover:bg-danger/90 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {transaction.status !== 'pending' && (
                          <div className={`mt-2 text-sm ${
                            transaction.status === 'approved' ? 'text-success' : 'text-danger'
                          }`}>
                            Status: {transaction.status.toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">All Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Email</th>
                        <th className="text-right py-2">Balance</th>
                        <th className="text-left py-2">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} className="border-b border-gray-700">
                          <td className="py-2">{user.name}</td>
                          <td className="py-2">{user.email}</td>
                          <td className="py-2 text-right">${user.balance.toLocaleString()}</td>
                          <td className="py-2 capitalize">{user.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'pairs' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Manage Trading Pairs</h2>
                
                {/* Create New Pair Form */}
                <div className="bg-primary/50 rounded-lg p-6 mb-8">
                  <h3 className="text-xl font-semibold mb-4">Create New Pair</h3>
                  <form onSubmit={handleCreatePair} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Pair Name (e.g., Bitcoin)"
                      value={newPair.name}
                      onChange={(e) => setNewPair({ ...newPair, name: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Symbol (e.g., BTC)"
                      value={newPair.symbol}
                      onChange={(e) => setNewPair({ ...newPair, symbol: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={newPair.image}
                      onChange={(e) => setNewPair({ ...newPair, image: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Minimum Value"
                      value={newPair.minValue}
                      onChange={(e) => setNewPair({ ...newPair, minValue: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Maximum Value"
                      value={newPair.maxValue}
                      onChange={(e) => setNewPair({ ...newPair, maxValue: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Min Percentage Change"
                      value={newPair.minPercentage}
                      onChange={(e) => setNewPair({ ...newPair, minPercentage: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Max Percentage Change"
                      value={newPair.maxPercentage}
                      onChange={(e) => setNewPair({ ...newPair, maxPercentage: e.target.value })}
                      className="px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white"
                      required
                    />
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newPair.isRecommended}
                        onChange={(e) => setNewPair({ ...newPair, isRecommended: e.target.checked })}
                        className="form-checkbox"
                      />
                      <span>Add to Recommended</span>
                    </label>
                    <button
                      type="submit"
                      className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent/90 transition md:col-span-2"
                    >
                      Create Pair
                    </button>
                  </form>
                </div>

                {/* Existing Pairs List */}
                <div className="space-y-4">
                  {pairs.length === 0 ? (
                    <p className="text-center text-gray-400">No trading pairs found</p>
                  ) : (
                    pairs.map((pair) => (
                      <div key={pair._id} className="bg-primary/50 rounded-lg p-4">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                          <div>
                            <h4 className="font-semibold text-lg">{pair.name} ({pair.symbol})</h4>
                            <p className="text-sm text-gray-400">
                              Min: ${pair.minValue} | Max: ${pair.maxValue}
                            </p>
                            <p className="text-sm text-gray-400">
                              Current: ${pair.currentValue.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              Percentage Range: {pair.minPercentage}% - {pair.maxPercentage}%
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex space-x-2 mb-2">
                              <button
                                onClick={() => handleUpdatePairRecommendation(pair._id, pair.isRecommended)}
                                className={`px-3 py-1 rounded-lg text-sm transition ${
                                  pair.isRecommended
                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                    : 'bg-gray-600 hover:bg-gray-700'
                                }`}
                              >
                                {pair.isRecommended ? 'Remove from Top 5' : 'Add to Top 5'}
                              </button>
                              <button
                                onClick={() => handleDeletePair(pair._id)}
                                className="bg-danger text-white px-3 py-1 rounded-lg text-sm hover:bg-danger/90 transition"
                              >
                                Delete
                              </button>
                            </div>
                            <div className={`text-sm ${pair.isActive ? 'text-success' : 'text-danger'}`}>
                              {pair.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}