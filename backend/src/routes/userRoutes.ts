import express from 'express';
import { getAllUsers, updateUserBalance } from '../controllers/userController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.get('/', protect, admin, getAllUsers);
router.put('/balance', protect, updateUserBalance);

export default router;