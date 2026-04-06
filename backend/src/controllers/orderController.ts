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
    
    console.log(`Checking ${openOrders.length} open orders...`);
    
    for (const order of openOrders) {
      const pair = await Pair.findById(order.pairId);
      
      // If pair is inactive (minValue and maxValue are 0), close order with loss
      if (!pair || !pair.isActive || (pair.minValue === 0 && pair.maxValue === 0)) {
        order.status = 'closed';
        order.closedAt = new Date();
        await order.save();
        console.log(`Order ${order._id} closed due to pair inactivity - User lost $${order.amount}`);
        continue;
      }
      
      // Check if target price reached
      let targetReached = false;
      let profit = 0;
      
      if (order.type === 'buy' && pair.currentValue <= order.targetPrice) {
        targetReached = true;
        // Calculate profit: (entryPrice - targetPrice) * (amount / entryPrice)
        profit = (order.price - order.targetPrice) * (order.amount / order.price);
        console.log(`Buy order ${order._id} target reached! Entry: $${order.price}, Target: $${order.targetPrice}, Current: $${pair.currentValue}, Profit: $${profit}`);
      } else if (order.type === 'sell' && pair.currentValue >= order.targetPrice) {
        targetReached = true;
        // Calculate profit: (targetPrice - entryPrice) * (amount / entryPrice)
        profit = (order.targetPrice - order.price) * (order.amount / order.price);
        console.log(`Sell order ${order._id} target reached! Entry: $${order.price}, Target: $${order.targetPrice}, Current: $${pair.currentValue}, Profit: $${profit}`);
      }
      
      if (targetReached && profit > 0) {
        const user = await User.findById(order.userId);
        if (user) {
          user.balance += profit;
          await user.save();
          console.log(`Added $${profit} profit to user ${user.email}. New balance: $${user.balance}`);
        }
        
        order.status = 'closed';
        order.closedAt = new Date();
        await order.save();
        console.log(`Order ${order._id} closed successfully with profit: $${profit}`);
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