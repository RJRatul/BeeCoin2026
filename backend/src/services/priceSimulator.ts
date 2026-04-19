import { Server } from 'socket.io';
import Pair from '../models/Pair';
import Order from '../models/Order';
import User from '../models/User';

const TICK_MS = 60_000; // 1 minute per tick

const simulatedPrices = new Map<string, number>();

export const startPriceSimulator = (io: Server): void => {
  console.log('[PriceSimulator] Starting (1 min interval)...');

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
        console.log(`[PriceSimulator] ${pair.symbol} price: ${next.toFixed(4)} (prev: ${prev.toFixed(4)}, floor: ${pair.minValue})`);

        await settleOrders(io, next, openOrders);
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
    const distToFloor = (currentPrice - floorPrice) / currentPrice; // 0 = at floor
    if (distToFloor <= 0.03)       upProb = 0.92; // almost at floor — strong bounce
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
  console.log(`[PriceSimulator] Order ${order._id} — LOSS (price crashed to 0 / pair deactivated)`);
  io.to(`user:${order.userId.toString()}`).emit('order_closed', {
    orderId: order._id,
    won: false,
    profit: 0,
    newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
  });
};

const settleOrders = async (io: Server, currentPrice: number, orders: any[]): Promise<void> => {
  for (const order of orders) {
    let won = false;
    let profit = 0;
    let closed = false;

    if (order.type === 'buy' && currentPrice >= order.targetPrice) {
      profit = ((order.targetPrice - order.price) / order.price) * order.amount;
      // Guard: if target was set below entry (bad order), use actual price movement
      if (profit <= 0) profit = ((currentPrice - order.price) / order.price) * order.amount;
      profit = Math.max(0, profit);
      closed = true;
      won = true;
    } else if (order.type === 'sell' && currentPrice <= order.targetPrice) {
      profit = ((order.price - order.targetPrice) / order.price) * order.amount;
      // Guard: if target was set above entry (bad order), use actual price movement
      if (profit <= 0) profit = ((order.price - currentPrice) / order.price) * order.amount;
      profit = Math.max(0, profit);
      closed = true;
      won = true;
    }

    if (!closed) continue;

    const user = await User.findById(order.userId);
    const roundedProfit = parseFloat(profit.toFixed(2));

    // Return original investment + profit on win
    if (user) {
      user.balance += order.amount + roundedProfit;
      await user.save();
    }

    order.status = 'closed';
    order.closedAt = new Date();
    order.profit = roundedProfit;
    order.won = true;
    await order.save();

    console.log(`[PriceSimulator] Order ${order._id} — WIN +$${roundedProfit} | price: ${currentPrice} | target: ${order.targetPrice} | type: ${order.type}`);
    io.to(`user:${order.userId.toString()}`).emit('order_closed', {
      orderId: order._id,
      won: true,
      profit: roundedProfit,
      newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
    });
  }
};
