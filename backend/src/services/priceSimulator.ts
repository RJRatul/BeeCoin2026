import { Server } from 'socket.io';
import Pair from '../models/Pair';
import Order from '../models/Order';
import { TICK_MS } from '../config/tradeConfig';
import { settleIfExpired, closeAsLossImmediately } from './orderSettlement';

const simulatedPrices = new Map<string, number>();

export const startPriceSimulator = (io: Server): void => {
  console.log(`[PriceSimulator] Starting — tick every ${TICK_MS / 1000}s`);

  setInterval(async () => {
    try {
      const pairs = await Pair.find({ isActive: true });

      for (const pair of pairs) {
        const pairId = pair._id.toString();

        // Admin zeroed the pair — force-close all orders as loss
        if (pair.minValue === 0 && pair.maxValue === 0) {
          const openOrders = await Order.find({ pairId, status: 'open' });
          for (const order of openOrders) {
            await closeAsLossImmediately(io, order);
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

        const next = computeNextPrice(prev, pair.minValue, pair.maxValue);

        simulatedPrices.set(pairId, next);
        pair.currentValue = next;
        await pair.save();

        io.to(`pair:${pair.symbol}`).emit('price_update', { symbol: pair.symbol, price: next });

        // Fast-path settlement — win/loss is decided by each order's target
        // vs Low/High (see orderSettlement.ts), not by this tick's price.
        // Checking here just resolves expired orders sooner than the 5s cron.
        const openOrders = await Order.find({ pairId, status: 'open' });
        for (const order of openOrders) {
          await settleIfExpired(io, order, pair);
        }
      }
    } catch (err) {
      console.error('[PriceSimulator] Tick error:', err);
    }
  }, TICK_MS);
};

// Cosmetic price walk — hard-clamped to [minValue, maxValue] so the
// displayed "Current" always stays within the pair's Low/High band. This no
// longer drives win/loss (that's purely target price vs Low/High), it just
// keeps the live ticker/chart looking alive.
const computeNextPrice = (
  currentPrice: number,
  minValue: number,
  maxValue: number
): number => {
  const bandWidth = maxValue - minValue;
  if (bandWidth <= 0) return currentPrice;

  const pct = (0.1 + Math.random() * 0.4) / 100; // 0.1%-0.5% of band per tick
  const moveAmount = bandWidth * pct;
  const direction = Math.random() < 0.5 ? 1 : -1;
  const next = currentPrice + direction * moveAmount;

  return Math.min(maxValue, Math.max(minValue, parseFloat(next.toFixed(6))));
};
