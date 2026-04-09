import { Server } from 'socket.io';
import Pair from '../models/Pair';
import Order from '../models/Order';
import User from '../models/User';

const TICK_MS       = 10000;              // 10 seconds per tick
const MIN_HOLD_MS   = 48 * 60 * 60 * 1000; // 48 hours
const MAX_HOLD_MS   = 72 * 60 * 60 * 1000; // 72 hours

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

        // Fetch all open orders for this pair once per tick
        const openOrders = await Order.find({ pairId, status: 'open' });

        // ── Determine upper price bound ─────────────────────────────────────
        // While an order is < 48h old, keep the simulated price BELOW the
        // target so the UI never shows price > target while order is still locked.
        // After 48h the cap is lifted and normal settlement can fire.
        const now = Date.now();
        const youngOrders = openOrders.filter(
          o => now - new Date(o.createdAt).getTime() < MIN_HOLD_MS
        );

        let upperBound = maxValue;
        if (youngOrders.length > 0) {
          const minTarget = Math.min(...youngOrders.map(o => o.targetPrice));
          // Stay just below the closest target (0.2% margin)
          upperBound = Math.min(maxValue, minTarget * 0.998);
        }

        // ── Calculate next simulated price ──────────────────────────────────
        const prev = simulatedPrices.get(pairId) ?? pair.currentValue;
        const pct  = (minPercentage + Math.random() * (maxPercentage - minPercentage)) / 100;
        const direction = Math.random() < 0.5 ? 1 : -1;

        const next = parseFloat(
          Math.min(upperBound, Math.max(minValue, prev + direction * prev * pct)).toFixed(6)
        );

        simulatedPrices.set(pairId, next);

        // Persist so REST API and cron fallback see the live price
        pair.currentValue = next;
        await pair.save();

        // Broadcast to all clients watching this pair's room
        io.to(`pair:${pair.symbol}`).emit('price_update', {
          symbol: pair.symbol,
          price: next,
        });

        // Settle mature orders
        await settleOrders(io, pairId, next, minValue, openOrders);
      }
    } catch (err) {
      console.error('[PriceSimulator] Tick error:', err);
    }
  }, TICK_MS);
};

const settleOrders = async (
  io: Server,
  pairId: string,
  currentPrice: number,
  minValue: number,
  orders: any[]
): Promise<void> => {
  const now = Date.now();

  for (const order of orders) {
    const ageMs = now - new Date(order.createdAt).getTime();

    // Must stay open for at least 48 hours
    if (ageMs < MIN_HOLD_MS) continue;

    let closed = false;
    let won    = false;
    let profit = 0;

    // ── FORCE CLOSE at 72 hours — loss ─────────────────────────────────────
    if (ageMs >= MAX_HOLD_MS) {
      closed = true;
      won    = false;
    }

    // ── LOSS: price hit the minimum floor ──────────────────────────────────
    else if (currentPrice <= minValue) {
      closed = true;
      won    = false;
    }

    // ── WIN: BUY — user expects price to RISE to target ────────────────────
    else if (order.type === 'buy' && currentPrice >= order.targetPrice) {
      profit = ((order.targetPrice - order.price) / order.price) * order.amount;
      if (profit > 0) { closed = true; won = true; }
    }

    // ── WIN: SELL — user expects price to DROP to target ───────────────────
    else if (order.type === 'sell' && currentPrice <= order.targetPrice) {
      profit = ((order.price - order.targetPrice) / order.price) * order.amount;
      if (profit > 0) { closed = true; won = true; }
    }

    if (!closed) continue;

    const user = await User.findById(order.userId);
    if (user && won && profit > 0) {
      user.balance += profit;
      await user.save();
    }

    order.status   = 'closed';
    order.closedAt = new Date();
    await order.save();

    const roundedProfit = parseFloat(profit.toFixed(2));
    console.log(
      `[PriceSimulator] Order ${order._id} — ` +
      `${won ? `WIN +$${roundedProfit}` : 'LOSS'} | ` +
      `price: ${currentPrice} | target: ${order.targetPrice} | type: ${order.type}`
    );

    io.to(`user:${order.userId.toString()}`).emit('order_closed', {
      orderId: order._id,
      won,
      profit: roundedProfit,
      newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
    });
  }
};
