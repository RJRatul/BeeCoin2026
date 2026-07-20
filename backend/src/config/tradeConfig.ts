// Price tick interval — cosmetic only, the displayed "Current" price
// fluctuates within [Low, High] on this cadence (default 30s).
export const TICK_MS = parseInt(process.env.TICK_MS || '30000', 10);

// Every order runs for this fixed duration before settlement (default 1 min).
// Win/loss itself is decided by target price vs the pair's Low/High at
// settlement time — this duration is purely the suspense timer.
export const TRADE_DURATION_MS = parseInt(process.env.TRADE_DURATION_MS || '60000', 10);
