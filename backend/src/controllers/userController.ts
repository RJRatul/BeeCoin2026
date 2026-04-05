import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update balance for any user (Admin only)
export const updateUserBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    
    console.log('Updating user balance:', { id, balance });
    
    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.balance = balance;
    await user.save();

    res.json({ success: true, balance: user.balance, user: { id: user._id, name: user.name, balance: user.balance } });
  } catch (error: any) {
    console.error('Error updating balance:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update current user's own balance (if needed)
export const updateMyBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user?._id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.balance = amount;
    await user.save();

    res.json({ success: true, balance: user.balance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const suspendUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};