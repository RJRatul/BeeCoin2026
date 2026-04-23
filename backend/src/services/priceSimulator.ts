import { Server } from 'socket.io';
import Pair from '../models/Pair';
import Order from '../models/Order';
import User from '../models/User';
import { sendPushToUser } from './pushNotifier';

// Set TICK_MS=15000 in .env for fast testing (default 60s)
const TICK_MS = parseInt(process.env.TICK_MS || '60000', 10);

// Orders older than MAX_ORDER_MINUTES are auto-settled as WIN (guaranteed result)
const MAX_ORDER_MINUTES = parseInt(process.env.MAX_ORDER_MINUTES || '10', 10);

const simulatedPrices = new Map<string, number>();

export const startPriceSimulator = (io: Server): void => {
  console.log(`[PriceSimulator] Starting — tick every ${TICK_MS / 1000}s | auto-settle after ${MAX_ORDER_MINUTES} min`);

  setInterval(async () => {
    try {
      const pairs = await Pair.find({ isActive: true });

      for (const pair of pairs) {
        const pairId = pair._id.toString();

        // Admin zeroed the pair — force-close all orders as loss
        if (pair.minValue === 0 && pair.maxValue === 0) {
          const openOrders = await Order.find({ pairId, status: 'open' });
          for (const order of openOrders) {
            await closeSingleOrderAsLoss(io, order);
          }
          pair.currentValue = 0;
          await pair.save();
          io.to(`pair:${pair.symbol}`).emit('price_update', { symbol: pair.symbol, price: 0 });
          continue;
        }

        const prev = simulatedPrices.get(pairId) ?? pair.currentValue;
        if (prev <= 0) {
          simulatedPrices.set(pairId, pair.minValue || pair.currentValue);
          continue;
        }

        const openOrders = await Order.find({ pairId, status: 'open' });
        const next = computeNextPrice(prev, openOrders, pair.minPercentage, pair.maxPercentage, pair.minValue);

        simulatedPrices.set(pairId, next);
        pair.currentValue = next;
        await pair.save();

        io.to(`pair:${pair.symbol}`).emit('price_update', { symbol: pair.symbol, price: next });

        if (openOrders.length > 0) {
          console.log(`[PriceSimulator] ${pair.symbol}: $${next.toFixed(4)} (prev: $${prev.toFixed(4)}, floor: $${pair.minValue}) | ${openOrders.length} open order(s)`);
          for (const order of openOrders) {
            const range = order.type === 'buy'
              ? order.targetPrice - order.price
              : order.price - order.targetPrice;
            const moved = order.type === 'buy'
              ? next - order.price
              : order.price - next;
            const pct = range > 0 ? Math.max(0, (moved / range * 100)).toFixed(1) : '0.0';
            const ageMin = ((Date.now() - new Date(order.createdAt).getTime()) / 60000).toFixed(1);
            console.log(`  → [${order.type.toUpperCase()}] entry:$${order.price} → target:$${order.targetPrice} | now:$${next.toFixed(4)} | progress:${pct}% | age:${ageMin}min`);
          }
        } else {
          console.log(`[PriceSimulator] ${pair.symbol}: $${next.toFixed(4)} (floor: $${pair.minValue})`);
        }

        // Auto-settle orders that have been open too long — guaranteed WIN
        const now = Date.now();
        const autoSettled = new Set<string>();
        for (const order of openOrders) {
          const ageMs = now - new Date(order.createdAt).getTime();
          if (ageMs >= MAX_ORDER_MINUTES * 60 * 1000) {
            console.log(`[PriceSimulator] ⏰ Order ${order._id} — auto-settling (age: ${(ageMs / 60000).toFixed(1)} min)`);
            await settleOrderAsWin(io, order, next);
            autoSettled.add(order._id.toString());
          }
        }

        // Normal settlement — skip orders already auto-settled
        await settleOrders(io, next, openOrders.filter(o => !autoSettled.has(o._id.toString())));
      }
    } catch (err) {
      console.error('[PriceSimulator] Tick error:', err);
    }
  }, TICK_MS);
};

// Compute next price — bounded by minValue floor, biased to keep orders alive
const computeNextPrice = (
  currentPrice: number,
  openOrders: any[],
  minPct: number,
  maxPct: number,
  floorPrice: number
): number => {
  const pct = (minPct + Math.random() * (maxPct - minPct)) / 100;
  const moveAmount = currentPrice * pct;

  const buyTargets = openOrders
    .filter(o => o.type === 'buy' && o.targetPrice > currentPrice)
    .map(o => o.targetPrice as number);

  const sellTargets = openOrders
    .filter(o => o.type === 'sell' && o.targetPrice < currentPrice)
    .map(o => o.targetPrice as number);

  // Neutral base — no natural drift toward 0
  let upProb = 0.50;

  // Bounce hard upward when approaching the floor (minValue)
  if (floorPrice > 0) {
    const distToFloor = (currentPrice - floorPrice) / currentPrice;
    if (distToFloor <= 0.03)       upProb = 0.92;
    else if (distToFloor <= 0.08)  upProb = 0.78;
    else if (distToFloor <= 0.15)  upProb = 0.65;
  }

  // BUY orders approaching target: bias downward to delay win naturally
  if (buyTargets.length > 0) {
    const nearestBuyTarget = Math.min(...buyTargets);
    const proximity = currentPrice / nearestBuyTarget;
    if (proximity >= 0.97)       upProb = 0.10;
    else if (proximity >= 0.93)  upProb = 0.22;
    else if (proximity >= 0.88)  upProb = 0.35;
    else if (proximity >= 0.80)  upProb = 0.42;
  }

  // SELL orders approaching target: bias upward to delay win naturally
  if (sellTargets.length > 0) {
    const nearestSellTarget = Math.max(...sellTargets);
    const proximity = nearestSellTarget / currentPrice;
    if (proximity >= 0.97)       upProb = 0.90;
    else if (proximity >= 0.93)  upProb = 0.78;
    else if (proximity >= 0.88)  upProb = 0.65;
    else if (proximity >= 0.80)  upProb = 0.58;
  }

  const direction = Math.random() < upProb ? 1 : -1;
  const next = currentPrice + direction * moveAmount;

  // Hard floor — price never drops below minValue naturally
  const hardFloor = floorPrice > 0 ? floorPrice : 0.0001;
  return Math.max(hardFloor, parseFloat(next.toFixed(6)));
};

const closeSingleOrderAsLoss = async (io: Server, order: any): Promise<void> => {
  const user = await User.findById(order.userId);
  order.status = 'closed';
  order.closedAt = new Date();
  order.profit = 0;
  order.won = false;
  await order.save();
  console.log(`[PriceSimulator] Order ${order._id} — ❌ LOSS (pair deactivated)`);
  io.to(`user:${order.userId.toString()}`).emit('order_closed', {
    orderId: order._id, won: false, profit: 0,
    newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
  });
  await sendPushToUser(order.userId.toString(), {
    title: '❌ Trade Closed — Loss',
    body: `Your ${order.type.toUpperCase()} on ${order.pairSymbol} was closed. Investment lost.`,
  });
};

const settleOrderAsWin = async (io: Server, order: any, currentPrice: number): Promise<void> => {
  if (order.status !== 'open') return;

  // Profit = invested amount (100% flat return)
  const profit = order.amount;

  const user = await User.findById(order.userId);
  if (user) {
    user.balance += order.amount + profit;
    await user.save();
  }

  order.status = 'closed';
  order.closedAt = new Date();
  order.profit = profit;
  order.won = true;
  await order.save();

  console.log(`[PriceSimulator] Order ${order._id} — ✅ AUTO-WIN +$${profit} (= invested $${order.amount}) | new balance: $${user?.balance?.toFixed(2)}`);

  io.to(`user:${order.userId.toString()}`).emit('order_closed', {
    orderId: order._id, won: true, profit,
    newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
  });
  await sendPushToUser(order.userId.toString(), {
    title: '🎉 Trade Won!',
    body: `Your ${order.type.toUpperCase()} on ${order.pairSymbol} won! +$${profit} profit added to balance.`,
  });
};

const settleOrders = async (io: Server, currentPrice: number, orders: any[]): Promise<void> => {
  for (const order of orders) {
    if (order.status !== 'open') continue;

    let won = false;
    let profit = 0;
    let closed = false;

    if (order.type === 'buy' && currentPrice >= order.targetPrice) {
      closed = true; won = true;
    } else if (order.type === 'sell' && currentPrice <= order.targetPrice) {
      closed = true; won = true;
    }

    if (!closed) continue;

    // Profit = invested amount (100% flat return)
    profit = order.amount;

    const user = await User.findById(order.userId);

    if (user) {
      // Return investment + equal profit (investment was already deducted on order creation)
      user.balance += order.amount + profit;
      await user.save();
    }

    order.status = 'closed';
    order.closedAt = new Date();
    order.profit = profit;
    order.won = true;
    await order.save();

    console.log(`[PriceSimulator] Order ${order._id} — ✅ WIN +$${profit} | price:$${currentPrice} target:$${order.targetPrice} [${order.type.toUpperCase()}]`);

    io.to(`user:${order.userId.toString()}`).emit('order_closed', {
      orderId: order._id, won: true, profit,
      newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
    });
    await sendPushToUser(order.userId.toString(), {
      title: '🎉 Trade Won!',
      body: `Your ${order.type.toUpperCase()} on ${order.pairSymbol} won! +$${profit} profit added to balance.`,
    });
  }
};
