import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import http from 'http';
import cron from 'node-cron';
import { Server as SocketServer } from 'socket.io';
import authRoutes from './routes/authRoutes';
import pairRoutes from './routes/pairRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';
import orderRoutes from './routes/orderRoutes';
import { errorHandler } from './middleware/errorHandler';
import { checkOpenOrders } from './controllers/orderController';
import { startPriceSimulator } from './services/priceSimulator';
import pushRoutes from './routes/pushRoutes';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://cryptax.live',
  'https://cryptax.live',
  'http://www.cryptax.live',
  'https://www.cryptax.live'
];

// Socket.io server
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Socket connection handlers
io.on('connection', (socket) => {
  // Client joins a pair room to receive price updates for that symbol
  socket.on('join_pair', (symbol: string) => {
    socket.join(`pair:${symbol}`);
  });

  // Client joins their private user room to receive order notifications
  socket.on('join_user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on('leave_pair', (symbol: string) => {
    socket.leave(`pair:${symbol}`);
  });

  socket.on('disconnect', () => {});
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('Origin blocked:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pairs', pairRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/push', pushRoutes);

// Error Handler
app.use(errorHandler);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');

    // Start HTTP + Socket.io server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Socket.io enabled');
    });

    // Start server-side price simulator (emits price_update + order_closed via socket)
    startPriceSimulator(io);

    // Cron job as fallback safety net — checks orders every 5 seconds
    // (the simulator also settles orders on each tick, this handles edge cases)
    cron.schedule('*/5 * * * * *', async () => {
      try {
        await checkOpenOrders(io);
      } catch (error) {
        console.error('Error in cron job:', error);
      }
    });

    console.log('Order checking cron job scheduled (every 5 seconds)');

    // Initial check on startup
    setTimeout(async () => {
      await checkOpenOrders(io);
    }, 2000);
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
