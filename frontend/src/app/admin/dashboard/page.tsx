'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUsers, FaExchangeAlt, FaMoneyBillWave, FaChartLine } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    activePairs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [usersRes, depositsRes, withdrawalsRes, pairsRes] = await Promise.all([
        axios.get('/api/users', config),
        axios.get('/api/transactions/all', config),
        axios.get('/api/transactions/all', config),
        axios.get('/api/pairs'),
      ]);

      const deposits = depositsRes.data.transactions.filter((t: any) => t.type === 'deposit' && t.status === 'approved');
      const withdrawals = withdrawalsRes.data.transactions.filter((t: any) => t.type === 'withdraw' && t.status === 'approved');

      setStats({
        totalUsers: usersRes.data.users.length,
        totalDeposits: deposits.reduce((sum: number, t: any) => sum + t.amount, 0),
        totalWithdrawals: withdrawals.reduce((sum: number, t: any) => sum + t.amount, 0),
        activePairs: pairsRes.data.pairs.filter((p: any) => p.isActive).length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: <FaUsers className="w-8 h-8" />, color: 'from-blue-500 to-blue-600' },
    { title: 'Total Deposits', value: `$${stats.totalDeposits.toLocaleString()}`, icon: <FaMoneyBillWave className="w-8 h-8" />, color: 'from-green-500 to-green-600' },
    { title: 'Total Withdrawals', value: `$${stats.totalWithdrawals.toLocaleString()}`, icon: <FaExchangeAlt className="w-8 h-8" />, color: 'from-red-500 to-red-600' },
    { title: 'Active Pairs', value: stats.activePairs, icon: <FaChartLine className="w-8 h-8" />, color: 'from-purple-500 to-purple-600' },
  ];

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading...</div>
        </div>
    );
  }

  return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`bg-gradient-to-r ${card.color} rounded-xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{card.title}</p>
                  <p className="text-2xl font-bold mt-2">{card.value}</p>
                </div>
                <div className="opacity-80">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}