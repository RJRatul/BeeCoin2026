import express from 'express';
import {
  createOrder,
  getOpenOrder,
  closeOrder,
  getOrderHistory,
  cancelOrder
} from '../controllers/orderController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/create', protect, createOrder);
router.get('/open', protect, getOpenOrder);
router.get('/history', protect, getOrderHistory);
router.put('/:id/close', protect, closeOrder);
router.put('/:id/cancel', protect, cancelOrder);

export default router;