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

export const updateUserBalance = async (req: AuthRequest, res: Response): Promise<void> => {
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