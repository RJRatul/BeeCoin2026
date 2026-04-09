import { Request, Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Pair from '../models/Pair';
import { AuthRequest } from '../middleware/auth';

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

    // Check balance for buy orders
    if (type === 'buy' && user.balance < amount) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    // Deduct balance for buy orders
    if (type === 'buy') {
      user.balance -= amount;
      await user.save();
    }

    const order = await Order.create({
      userId,
      pairId,
      pairSymbol,
      pairName,
      type,
      amount,
      price,
      targetPrice,
      status: 'open'
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

// Check and update all open orders
export const checkOpenOrders = async (): Promise<void> => {
  try {
    const openOrders = await Order.find({ status: 'open' });
    
    console.log(`[${new Date().toISOString()}] Checking ${openOrders.length} open orders...`);
    
    const MIN_HOLD_MS = 48 * 60 * 60 * 1000;
    const MAX_HOLD_MS = 72 * 60 * 60 * 1000;

    for (const order of openOrders) {
      const ageMs = Date.now() - new Date(order.createdAt).getTime();

      // Order must stay open for at least 48 hours
      if (ageMs < MIN_HOLD_MS) continue;

      const pair = await Pair.findById(order.pairId);

      // If pair is inactive, close as loss
      if (!pair || !pair.isActive || (pair.minValue === 0 && pair.maxValue === 0)) {
        order.status = 'closed';
        order.closedAt = new Date();
        await order.save();
        console.log(`[${new Date().toISOString()}] Order ${order._id} closed due to pair inactivity`);
        continue;
      }

      // Force close at 72 hours — counts as loss
      if (ageMs >= MAX_HOLD_MS) {
        order.status = 'closed';
        order.closedAt = new Date();
        await order.save();
        console.log(`[${new Date().toISOString()}] Order ${order._id} force-closed at 72h — LOSS`);
        continue;
      }

      // Loss condition: price hit the minimum floor
      if (pair.currentValue <= pair.minValue) {
        order.status = 'closed';
        order.closedAt = new Date();
        await order.save();
        console.log(`[${new Date().toISOString()}] Order ${order._id} closed — LOSS (price hit minValue)`);
        continue;
      }

      // Check if target price reached
      let targetReached = false;
      let profit = 0;

      if (order.type === 'buy') {
        // BUY wins when price RISES to/above target
        if (pair.currentValue >= order.targetPrice) {
          targetReached = true;
          profit = ((order.targetPrice - order.price) / order.price) * order.amount;
          console.log(`[${new Date().toISOString()}] BUY Order ${order._id} target reached! Entry: $${order.price}, Target: $${order.targetPrice}, Profit: $${profit.toFixed(2)}`);
        }
      } else if (order.type === 'sell') {
        // SELL wins when price DROPS to/below target
        if (pair.currentValue <= order.targetPrice) {
          targetReached = true;
          profit = ((order.price - order.targetPrice) / order.price) * order.amount;
          console.log(`[${new Date().toISOString()}] SELL Order ${order._id} target reached! Entry: $${order.price}, Target: $${order.targetPrice}, Profit: $${profit.toFixed(2)}`);
        }
      }

      if (targetReached && profit > 0) {
        const user = await User.findById(order.userId);
        if (user) {
          user.balance += profit;
          await user.save();
          console.log(`[${new Date().toISOString()}] Added $${profit.toFixed(2)} profit to user ${user.email}. New balance: $${user.balance.toFixed(2)}`);
        }

        order.status = 'closed';
        order.closedAt = new Date();
        await order.save();
        console.log(`[${new Date().toISOString()}] Order ${order._id} closed successfully with profit: $${profit.toFixed(2)}`);
      }
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

    // Refund amount for cancelled buy orders
    if (order.type === 'buy') {
      const user = await User.findById(order.userId);
      if (user) {
        user.balance += order.amount;
        await user.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};