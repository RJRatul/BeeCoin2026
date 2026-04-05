import express from 'express';
import { 
  getAllUsers, 
  suspendUser, 
  updateUserBalance, 
  updateUserStatus,
  updateMyBalance 
} from '../controllers/userController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.get('/', protect, admin, getAllUsers);
router.put('/balance', protect, updateMyBalance); // For user to update their own balance
router.put('/:id/balance', protect, admin, updateUserBalance); // Admin updates any user's balance
router.put('/:id/status', protect, admin, updateUserStatus);
router.put('/:id/suspend', protect, admin, suspendUser);

export default router;