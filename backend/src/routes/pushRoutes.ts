import express from 'express';
import webpush from 'web-push';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import PushSubscription from '../models/PushSubscription';

const router = express.Router();

// Return the public VAPID key so the frontend can subscribe
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Save a push subscription for the logged-in user
router.post('/subscribe', protect, async (req: AuthRequest, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user?._id;

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId, endpoint, keys },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Remove subscription on logout
router.post('/unsubscribe', protect, async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteOne({ endpoint });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
