import express from 'express';
import { getAllUsers, suspendUser, updateUserBalance } from '../controllers/userController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.get('/', protect, admin, getAllUsers);
router.put('/balance', protect, updateUserBalance);
router.put('/:id/suspend', protect, admin, suspendUser);
export default router;