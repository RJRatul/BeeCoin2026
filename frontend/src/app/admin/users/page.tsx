'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../layout';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaEdit, FaBan, FaCheckCircle, FaSearch } from 'react-icons/fa';

interface User {
  _id: string;
  name: string;
  email: string;
  balance: number;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'ban' : 'unban';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `/api/users/${userId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`User ${action}ned successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;
    if (!newBalance || parseFloat(newBalance) < 0) {
      toast.error('Please enter a valid balance amount');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/users/${selectedUser._id}/balance`,
        { balance: parseFloat(newBalance) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Balance update response:', response.data);
      
      if (response.data.success) {
        toast.success(`Balance updated to $${parseFloat(newBalance).toLocaleString()}`);
        setShowBalanceModal(false);
        setNewBalance('');
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error('Failed to update balance');
      }
    } catch (error: any) {
      console.error('Error updating balance:', error);
      toast.error(error.response?.data?.message || 'Failed to update balance');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading...</div>
        </div>
    );
  }

  return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-white">Name</th>
                  <th className="text-left py-3 px-4 text-white">Email</th>
                  <th className="text-right py-3 px-4 text-white">Balance</th>
                  <th className="text-left py-3 px-4 text-white">Role</th>
                  <th className="text-left py-3 px-4 text-white">Status</th>
                  <th className="text-left py-3 px-4 text-white">Joined</th>
                  <th className="text-center py-3 px-4 text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-white">{user.name}</td>
                    <td className="py-3 px-4 text-gray-300">{user.email}</td>
                    <td className="py-3 px-4 text-right text-green-400">
                      ${user.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewBalance(user.balance.toString());
                            setShowBalanceModal(true);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                          title="Edit Balance"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleBanUser(user._id, user.status)}
                          className={`p-2 rounded-lg transition ${
                            user.status === 'active'
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-green-400 hover:bg-green-500/10'
                          }`}
                          title={user.status === 'active' ? 'Ban User' : 'Unban User'}
                        >
                          <FaBan />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balance Update Modal */}
        {showBalanceModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Update User Balance</h2>
              <p className="text-gray-300 mb-4">
                User: <span className="text-green-400">{selectedUser.name}</span>
              </p>
              <p className="text-gray-300 mb-2">
                Current Balance: <span className="text-yellow-400">${selectedUser.balance.toLocaleString()}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Balance (USD)
                </label>
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter new balance"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleUpdateBalance}
                  disabled={updating}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Balance'}
                </button>
                <button
                  onClick={() => {
                    setShowBalanceModal(false);
                    setSelectedUser(null);
                    setNewBalance('');
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}