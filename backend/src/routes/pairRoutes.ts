import express from 'express';
import {
  getPairs,
  getRecommendedPairs,
  createPair,
  updatePair,
  deletePair,
  updatePairValue
} from '../controllers/pairController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.get('/', getPairs);
router.get('/recommended', getRecommendedPairs);
router.post('/', protect, admin, createPair);
router.put('/:id', protect, admin, updatePair);
router.delete('/:id', protect, admin, deletePair);
router.put('/:id/value', updatePairValue);

export default router;