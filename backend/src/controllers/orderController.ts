import { Request, Response } from 'express';
import { Server as SocketServer } from 'socket.io';
import Order from '../models/Order';
import User from '../models/User';
import Pair from '../models/Pair';
import { AuthRequest } from '../middleware/auth';
import { TRADE_DURATION_MS } from '../config/tradeConfig';
import { settleIfExpired, closeAsLossImmediately } from '../services/orderSettlement';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pairId, pairSymbol, pairName, type, amount, price, targetPrice } = req.body;
    const userId = req.user?._id;

    // Check if user already has an open order
    const existingOrder = await Order.findOne({ userId, status: 'open' });
    if (existingOrder) {
      res.status(400).json({ message: 'You already have an open order' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if pair is active
    const pair = await Pair.findById(pairId);
    if (!pair || !pair.isActive) {
      res.status(400).json({ message: 'This trading pair is currently inactive' });
      return;
    }

    // Validate target price direction
    if (type === 'buy' && targetPrice <= price) {
      res.status(400).json({ message: 'Buy target price must be above the current entry price' });
      return;
    }
    if (type === 'sell' && targetPrice >= price) {
      res.status(400).json({ message: 'Sell target price must be below the current entry price' });
      return;
    }

    // Check balance for all order types
    if (user.balance < amount) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    // Deduct balance immediately — refunded only on win
    user.balance -= amount;
    await user.save();

    const order = await Order.create({
      userId,
      pairId,
      pairSymbol,
      pairName,
      type,
      amount,
      price,
      targetPrice,
      status: 'open',
      expiresAt: new Date(Date.now() + TRADE_DURATION_MS)
    });

    res.status(201).json({ 
      success: true, 
      order,
      newBalance: user.balance 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOpenOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const order = await Order.findOne({ userId, status: 'open' });
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const closeOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { success, profit } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const user = await User.findById(order.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // If success is true and profit exists, add profit to user balance
    if (success && profit && profit > 0) {
      user.balance += profit;
      await user.save();
    }

    order.status = 'closed';
    order.closedAt = new Date();
    await order.save();

    res.json({ success: true, order, newBalance: user.balance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Check and update all open orders (cron fallback — runs every 5s to catch anything the simulator missed)
export const checkOpenOrders = async (io?: SocketServer): Promise<void> => {
  try {
    const openOrders = await Order.find({ status: 'open' });

    for (const order of openOrders) {
      const pair = await Pair.findById(order.pairId);

      // Pair deleted or admin zeroed it — close as loss immediately, ignoring the timer
      if (!pair || !pair.isActive || (pair.minValue === 0 && pair.maxValue === 0)) {
        await closeAsLossImmediately(io, order);
        continue;
      }

      // Win/loss is decided by target price vs Low/High, settled once the
      // fixed 1-minute timer expires — see orderSettlement.ts.
      await settleIfExpired(io, order, pair);
    }
  } catch (error) {
    console.error('Error checking open orders:', error);
  }
};

export const getOrderHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const orders = await Order.find({ userId, status: 'closed' }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Refund full amount for any cancelled order
    const user = await User.findById(order.userId);
    if (user) {
      user.balance += order.amount;
      await user.save();
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};