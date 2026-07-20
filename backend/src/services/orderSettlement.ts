import { Server } from 'socket.io';
import { IOrder } from '../models/Order';
import { IPair } from '../models/Pair';
import User from '../models/User';
import { sendPushToUser } from './pushNotifier';

// Win/loss is decided purely by where the chosen target price sits relative
// to the pair's Low/High band — not by what the live price actually does
// during the trade. Sell wins if its target is at/above Low (within range);
// below Low is a loss. Buy wins if its target is at/below High; above High
// is a loss. The trade's duration is just a suspense timer before revealing
// this already-determined result.
export const settleIfExpired = async (io: Server | undefined, order: IOrder, pair: IPair): Promise<void> => {
  if (order.status !== 'open') return;
  if (Date.now() < new Date(order.expiresAt).getTime()) return;

  const won = order.type === 'sell'
    ? order.targetPrice >= pair.minValue
    : order.targetPrice <= pair.maxValue;

  const profit = won ? order.amount : 0;

  const user = await User.findById(order.userId);
  if (user && won) {
    user.balance += order.amount + profit;
    await user.save();
  }

  order.status = 'closed';
  order.closedAt = new Date();
  order.profit = profit;
  order.won = won;
  await order.save();

  console.log(`[Settlement] Order ${order._id} — ${won ? '✅ WIN' : '❌ LOSS'} [${order.type.toUpperCase()}] target:$${order.targetPrice} Low:$${pair.minValue} High:$${pair.maxValue} profit:$${profit}`);

  if (io) {
    io.to(`user:${order.userId.toString()}`).emit('order_closed', {
      orderId: order._id,
      won,
      profit,
      newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
    });
  }

  await sendPushToUser(order.userId.toString(), won
    ? { title: '🎉 Trade Won!', body: `Your ${order.type.toUpperCase()} on ${order.pairSymbol} won! +$${profit} profit added to balance.` }
    : { title: '❌ Trade Closed — Loss', body: `Your ${order.type.toUpperCase()} on ${order.pairSymbol} was closed. Investment lost.` });
};

// Pair deleted or admin zeroed it — force-close as loss immediately regardless of timer
export const closeAsLossImmediately = async (io: Server | undefined, order: IOrder): Promise<void> => {
  const user = await User.findById(order.userId);
  order.status = 'closed';
  order.closedAt = new Date();
  order.profit = 0;
  order.won = false;
  await order.save();
  console.log(`[Settlement] Order ${order._id} — ❌ LOSS (pair inactive/zeroed)`);
  if (io) {
    io.to(`user:${order.userId.toString()}`).emit('order_closed', {
      orderId: order._id, won: false, profit: 0,
      newBalance: parseFloat((user?.balance ?? 0).toFixed(2)),
    });
  }
  await sendPushToUser(order.userId.toString(), {
    title: '❌ Trade Closed — Loss',
    body: `Your ${order.type.toUpperCase()} on ${order.pairSymbol} was closed. Investment lost.`,
  });
};
