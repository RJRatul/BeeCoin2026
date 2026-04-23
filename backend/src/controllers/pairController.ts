import { Request, Response } from 'express';
import Pair from '../models/Pair';

// Normalize image URL — strip absolute localhost prefix so it works in production
const normalizeImage = (image: string): string => {
  if (!image) return image;
  // e.g. "http://localhost:5000/uploads/foo.png" → "/uploads/foo.png"
  return image.replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, '');
};

const normalizePairs = (pairs: any[]) =>
  pairs.map(p => ({ ...p.toObject(), image: normalizeImage(p.image) }));

export const getPairs = async (req: Request, res: Response): Promise<void> => {
  try {
    const pairs = await Pair.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, pairs: normalizePairs(pairs) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin-only: returns ALL pairs including inactive ones
export const getAllPairs = async (req: Request, res: Response): Promise<void> => {
  try {
    const pairs = await Pair.find({}).sort({ createdAt: -1 });
    res.json({ success: true, pairs: normalizePairs(pairs) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getRecommendedPairs = async (req: Request, res: Response): Promise<void> => {
  try {
    const pairs = await Pair.find({ isActive: true, isRecommended: true })
      .limit(5)
      .sort({ createdAt: -1 });
    res.json({ success: true, pairs: normalizePairs(pairs) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPair = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, symbol, image, minValue, maxValue, minPercentage, maxPercentage, isRecommended } = req.body;

    // If pair exists but is inactive, reactivate it with the new data
    const existing = await Pair.findOne({ $or: [{ name }, { symbol }] });
    if (existing) {
      if (existing.isActive) {
        res.status(400).json({ message: 'Pair with this name or symbol already exists' });
        return;
      }
      // Reactivate with updated values
      existing.name = name;
      existing.symbol = symbol;
      existing.image = image;
      existing.minValue = minValue;
      existing.maxValue = maxValue;
      existing.minPercentage = minPercentage;
      existing.maxPercentage = maxPercentage;
      existing.isRecommended = isRecommended || false;
      existing.currentValue = minValue + Math.random() * (maxValue - minValue);
      existing.isActive = true;
      await existing.save();
      res.status(201).json({ success: true, pair: existing });
      return;
    }

    const randomValue = minValue + Math.random() * (maxValue - minValue);
    const pair = await Pair.create({
      name, symbol, image, minValue, maxValue,
      minPercentage, maxPercentage,
      currentValue: randomValue,
      isRecommended: isRecommended || false
    });

    res.status(201).json({ success: true, pair });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePair = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const pair = await Pair.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!pair) {
      res.status(404).json({ message: 'Pair not found' });
      return;
    }

    res.json({ success: true, pair });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePair = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pair = await Pair.findByIdAndDelete(id);
    if (!pair) {
      res.status(404).json({ message: 'Pair not found' });
      return;
    }

    res.json({ success: true, message: 'Pair deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePairValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pair = await Pair.findById(id);
    if (!pair) {
      res.status(404).json({ message: 'Pair not found' });
      return;
    }

    const randomValue = pair.minValue + Math.random() * (pair.maxValue - pair.minValue);
    pair.currentValue = randomValue;
    await pair.save();

    res.json({ success: true, pair });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};