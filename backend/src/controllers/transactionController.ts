import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const createDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, transactionId: userTransactionId, description } = req.body;
    const userId = req.user?._id;

    if (!userTransactionId) {
      res.status(400).json({ message: 'Transaction ID is required' });
      return;
    }

    // Check for duplicate transactionId
    const existing = await Transaction.findOne({ transactionId: userTransactionId });
    if (existing) {
      res.status(400).json({ message: 'This transaction ID has already been used' });
      return;
    }

    const transaction = await Transaction.create({
      userId,
      type: 'deposit',
      amount,
      transactionId: userTransactionId,
      description,
      status: 'pending'
    });

    res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createWithdraw = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, binanceId, remarks } = req.body;
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!binanceId) {
      res.status(400).json({ message: 'Binance ID is required' });
      return;
    }

    if (!user || user.balance < amount) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    if (amount < 10) {
      res.status(400).json({ message: 'Minimum withdrawal amount is $10' });
      return;
    }

    const transactionId = `WIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const description = `Binance: ${binanceId}${remarks ? ` | ${remarks}` : ''}`;

    const transaction = await Transaction.create({
      userId,
      type: 'withdraw',
      amount,
      transactionId,
      description,
      status: 'pending'
    });

    user.balance -= amount;
    await user.save();

    res.status(201).json({ success: true, transaction, newBalance: user.balance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approveTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    if (transaction.status !== 'pending') {
      res.status(400).json({ message: 'Transaction already processed' });
      return;
    }

    transaction.status = 'approved';
    await transaction.save();

    if (transaction.type === 'deposit') {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
      }
    }

    res.json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    if (transaction.status !== 'pending') {
      res.status(400).json({ message: 'Transaction already processed' });
      return;
    }

    transaction.status = 'rejected';
    await transaction.save();

    if (transaction.type === 'withdraw') {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
      }
    }

    res.json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, transactions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, transactions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};