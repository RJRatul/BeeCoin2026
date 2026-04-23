'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../layout';
import axios from 'axios';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { FaUpload, FaTrash, FaStar, FaRegStar } from 'react-icons/fa';

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

export default function TradingPairsPage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPair, setEditingPair] = useState<Pair | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    minValue: '',
    maxValue: '',
    minPercentage: '',
    maxPercentage: '',
    isRecommended: false
  });

  useEffect(() => {
    fetchPairs();
  }, []);

  const fetchPairs = async () => {
    try {
      const response = await axios.get('/api/pairs/all');
      setPairs(response.data.pairs);
    } catch (error) {
      console.error('Error fetching pairs:', error);
      toast.error('Failed to fetch trading pairs');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = localStorage.getItem('adminToken');
    const response = await axios.post('/api/upload', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.imageUrl;
  };

  const handleCreatePair = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      let imageUrl = '';
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      await axios.post(
        '/api/pairs',
        {
          ...formData,
          image: imageUrl,
          minValue: parseFloat(formData.minValue),
          maxValue: parseFloat(formData.maxValue),
          minPercentage: parseFloat(formData.minPercentage),
          maxPercentage: parseFloat(formData.maxPercentage)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Pair created successfully');
      resetForm();
      fetchPairs();
    } catch (error) {
      console.error('Error creating pair:', error);
      toast.error('Failed to create pair');
    }
  };

  const handleUpdatePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPair) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      let imageUrl = editingPair.image;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      await axios.put(
        `/api/pairs/${editingPair._id}`,
        {
          ...formData,
          image: imageUrl,
          minValue: parseFloat(formData.minValue),
          maxValue: parseFloat(formData.maxValue),
          minPercentage: parseFloat(formData.minPercentage),
          maxPercentage: parseFloat(formData.maxPercentage)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Pair updated successfully');
      resetForm();
      fetchPairs();
    } catch (error) {
      console.error('Error updating pair:', error);
      toast.error('Failed to update pair');
    }
  };

  const handleDeletePair = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pair?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/pairs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Pair deleted successfully');
      fetchPairs();
    } catch (error) {
      console.error('Error deleting pair:', error);
      toast.error('Failed to delete pair');
    }
  };

  const handleToggleRecommendation = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `/api/pairs/${id}`,
        { isRecommended: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pair updated successfully');
      fetchPairs();
    } catch (error) {
      console.error('Error updating pair:', error);
      toast.error('Failed to update pair');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setShowCreateModal(false);
    setEditingPair(null);
    setFormData({
      name: '',
      symbol: '',
      minValue: '',
      maxValue: '',
      minPercentage: '',
      maxPercentage: '',
      isRecommended: false
    });
    setImageFile(null);
    setImagePreview('');
  };

  const editPair = (pair: Pair) => {
    setEditingPair(pair);
    setFormData({
      name: pair.name,
      symbol: pair.symbol,
      minValue: pair.minValue.toString(),
      maxValue: pair.maxValue.toString(),
      minPercentage: pair.minPercentage.toString(),
      maxPercentage: pair.maxPercentage.toString(),
      isRecommended: pair.isRecommended
    });
    setImagePreview(pair.image);
    setShowCreateModal(true);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Trading Pairs</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            + Add New Pair
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pairs.map((pair) => (
            <div key={pair._id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="relative h-32 bg-gray-700">
                {pair.image && (
                  <Image src={pair.image} alt={pair.name} fill className="object-contain p-4" />
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{pair.name}</h3>
                    <p className="text-sm text-gray-400">{pair.symbol}/USD</p>
                  </div>
                  <button
                    onClick={() => handleToggleRecommendation(pair._id, pair.isRecommended)}
                    className="text-yellow-400 hover:text-yellow-500"
                  >
                    {pair.isRecommended ? <FaStar /> : <FaRegStar />}
                  </button>
                </div>
                
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Current Value:</span>
                    <span className="text-green-400">${pair.currentValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Range:</span>
                    <span className="text-white">${pair.minValue} - ${pair.maxValue}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Percentage Range:</span>
                    <span className="text-white">{pair.minPercentage}% - {pair.maxPercentage}%</span>
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => editPair(pair)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePair(pair._id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingPair ? 'Edit Trading Pair' : 'Create New Trading Pair'}
              </h2>
              
              <form onSubmit={editingPair ? handleUpdatePair : handleCreatePair} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pair Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Symbol
                    </label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pair Image
                  </label>
                  <div className="flex items-center space-x-4">
                    {imagePreview && (
                      <div className="relative w-20 h-20">
                        <Image src={imagePreview} alt="Preview" fill className="object-contain" />
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition">
                        <FaUpload className="mr-2" />
                        <span>Upload Image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Value ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minValue}
                      onChange={(e) => setFormData({ ...formData, minValue: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Maximum Value ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maxValue}
                      onChange={(e) => setFormData({ ...formData, maxValue: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Percentage Change (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.minPercentage}
                      onChange={(e) => setFormData({ ...formData, minPercentage: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Percentage Change (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.maxPercentage}
                      onChange={(e) => setFormData({ ...formData, maxPercentage: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isRecommended}
                    onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="text-gray-300">Add to Recommended (Top 5)</span>
                </label>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    {editingPair ? 'Update Pair' : 'Create Pair'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}