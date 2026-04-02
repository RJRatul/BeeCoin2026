import express from 'express';
import {
  createDeposit,
  createWithdraw,
  approveTransaction,
  rejectTransaction,
  getUserTransactions,
  getAllTransactions
} from '../controllers/transactionController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.post('/deposit', protect, createDeposit);
router.post('/withdraw', protect, createWithdraw);
router.get('/my', protect, getUserTransactions);
router.get('/all', protect, admin, getAllTransactions);
router.put('/:id/approve', protect, admin, approveTransaction);
router.put('/:id/reject', protect, admin, rejectTransaction);

export default router;