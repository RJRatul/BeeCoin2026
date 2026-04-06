import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import cron from 'node-cron';
import authRoutes from './routes/authRoutes';
import pairRoutes from './routes/pairRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';
import orderRoutes from './routes/orderRoutes';
import { errorHandler } from './middleware/errorHandler';
import { checkOpenOrders } from './controllers/orderController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://beecoin.cloud'
];

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

// Error Handler
app.use(errorHandler);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS enabled for development`);
    });
    
    // Schedule cron job to check open orders every 5 seconds (more frequent)
    cron.schedule('*/5 * * * * *', async () => {
      try {
        await checkOpenOrders();
      } catch (error) {
        console.error('Error in cron job:', error);
      }
    });
    
    console.log('Order checking cron job scheduled (every 5 seconds)');
    
    // Initial check on startup
    setTimeout(async () => {
      await checkOpenOrders();
    }, 2000);
    
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });