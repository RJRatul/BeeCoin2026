import { Request, Response } from 'express';
import { Server as SocketServer } from 'socket.io';
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

// Check and update all open orders (cron fallback — runs every 5s to catch anything the simulator missed)
export const checkOpenOrders = async (io?: SocketServer): Promise<void> => {
  try {
    const openOrders = await Order.find({ status: 'open' });

    for (const order of openOrders) {
      const pair = await Pair.findById(order.pairId);

      // Pair deleted or admin zeroed it — close as loss immediately
      if (!pair || !pair.isActive || (pair.minValue === 0 && pair.maxValue === 0)) {
        order.status   = 'closed';
        order.closedAt = new Date();
        order.profit   = 0;
        order.won      = false;
        await order.save();
        console.log(`[Cron] Order ${order._id} closed — pair inactive/zeroed — LOSS`);
        if (io) {
          const u = await User.findById(order.userId);
          io.to(`user:${order.userId.toString()}`).emit('order_closed', {
            orderId: order._id, won: false, profit: 0,
            newBalance: parseFloat((u?.balance ?? 0).toFixed(2)),
          });
        }
        continue;
      }

      const currentPrice = pair.currentValue;
      let closed = false;
      let won = false;
      let profit = 0;

      if (order.type === 'buy') {
        if (currentPrice >= order.targetPrice) {
          profit = ((order.targetPrice - order.price) / order.price) * order.amount;
          if (profit <= 0) profit = ((currentPrice - order.price) / order.price) * order.amount;
          profit = Math.max(0, profit);
          closed = true; won = true;
        }
        // No natural loss — price is floored at minValue by the simulator
      } else if (order.type === 'sell') {
        if (currentPrice <= order.targetPrice) {
          profit = ((order.price - order.targetPrice) / order.price) * order.amount;
          if (profit <= 0) profit = ((order.price - currentPrice) / order.price) * order.amount;
          profit = Math.max(0, profit);
          closed = true; won = true;
        }
        // No natural loss — price is floored at minValue by the simulator
      }

      if (!closed) continue;

      const user = await User.findById(order.userId);
      const roundedProfit = parseFloat(profit.toFixed(2));

      if (user && won) {
        user.balance += order.amount + roundedProfit;
        await user.save();
        console.log(`[Cron] Order ${order._id} WIN — profit: $${roundedProfit}, new balance: $${user.balance.toFixed(2)}`);
      } else {
        console.log(`[Cron] Order ${order._id} LOSS`);
      }

      order.status   = 'closed';
      order.closedAt = new Date();
      order.profit   = won ? roundedProfit : 0;
      order.won      = won;
      await order.save();

      if (io) {
        io.to(`user:${order.userId.toString()}`).emit('order_closed', {
          orderId: order._id,
          won,
          profit: roundedProfit,
          newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
        });
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