import { Server } from 'socket.io';
import Pair from '../models/Pair';
import Order from '../models/Order';
import User from '../models/User';

const TICK_MS = 10000; // 10 seconds per tick

// In-memory store of the latest simulated price per pairId
const simulatedPrices = new Map<string, number>();

export const startPriceSimulator = (io: Server): void => {
  console.log('[PriceSimulator] Starting...');

  setInterval(async () => {
    try {
      const pairs = await Pair.find({ isActive: true });

      for (const pair of pairs) {
        const { minValue, maxValue, minPercentage, maxPercentage } = pair;
        const pairId = pair._id.toString();

        // Start from last simulated price, fall back to DB value
        const prev = simulatedPrices.get(pairId) ?? pair.currentValue;

        // Pick a random % within the configured range
        const pct =
          (minPercentage + Math.random() * (maxPercentage - minPercentage)) / 100;

        // Randomly go up or down
        const direction = Math.random() < 0.5 ? 1 : -1;

        // Clamp within [minValue, maxValue] to keep prices realistic
        const next = parseFloat(
          Math.min(maxValue, Math.max(minValue, prev + direction * prev * pct)).toFixed(6)
        );

        simulatedPrices.set(pairId, next);

        // Persist to DB so the REST API and cron fallback see the live price
        pair.currentValue = next;
        await pair.save();

        // Broadcast to all clients watching this pair's room
        io.to(`pair:${pair.symbol}`).emit('price_update', {
          symbol: pair.symbol,
          price: next,
        });

        // Settle any open orders that this price tick triggers
        await settleOrders(io, pairId, next, minValue);
      }
    } catch (err) {
      console.error('[PriceSimulator] Tick error:', err);
    }
  }, TICK_MS);
};

const MIN_HOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_HOLD_MS = 72 * 60 * 60 * 1000; // 72 hours

const settleOrders = async (
  io: Server,
  pairId: string,
  currentPrice: number,
  minValue: number
): Promise<void> => {
  const orders = await Order.find({ pairId, status: 'open' });

  for (const order of orders) {
    const ageMs = Date.now() - new Date(order.createdAt).getTime();

    // ── Too early — order must stay open for at least 48 hours ────────────
    if (ageMs < MIN_HOLD_MS) continue;

    let closed = false;
    let won = false;
    let profit = 0;

    // ── FORCE CLOSE at 72 hours — counts as loss ───────────────────────────
    if (ageMs >= MAX_HOLD_MS) {
      closed = true;
      won = false;
    }

    // ── LOSS: price hit the minimum floor ──────────────────────────────────
    else if (currentPrice <= minValue) {
      closed = true;
      won = false;
    }

    // ── WIN: BUY order — triggers when price drops to/below target ─────────
    else if (order.type === 'buy' && currentPrice <= order.targetPrice) {
      profit = (order.price - order.targetPrice) * (order.amount / order.price);
      if (profit > 0) {
        closed = true;
        won = true;
      }
    }

    // ── WIN: SELL order — triggers when price rises to/above target ────────
    else if (order.type === 'sell' && currentPrice >= order.targetPrice) {
      profit = (order.targetPrice - order.price) * (order.amount / order.price);
      if (profit > 0) {
        closed = true;
        won = true;
      }
    }

    if (!closed) continue;

    // Update user balance on win
    const user = await User.findById(order.userId);
    if (user && won && profit > 0) {
      user.balance += profit;
      await user.save();
    }

    // Close the order
    order.status = 'closed';
    order.closedAt = new Date();
    await order.save();

    const roundedProfit = parseFloat(profit.toFixed(2));

    console.log(
      `[PriceSimulator] Order ${order._id} closed — ` +
      `${won ? `WIN +$${roundedProfit}` : 'LOSS'} | ` +
      `price: ${currentPrice} | target: ${order.targetPrice}`
    );

    // Notify the specific user via their private socket room
    io.to(`user:${order.userId.toString()}`).emit('order_closed', {
      orderId: order._id,
      won,
      profit: roundedProfit,
      newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
    });
  }
};
