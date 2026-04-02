import { Request, Response } from 'express';
import Pair from '../models/Pair';

export const getPairs = async (req: Request, res: Response): Promise<void> => {
  try {
    const pairs = await Pair.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, pairs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getRecommendedPairs = async (req: Request, res: Response): Promise<void> => {
  try {
    const pairs = await Pair.find({ isActive: true, isRecommended: true })
      .limit(5)
      .sort({ createdAt: -1 });
    res.json({ success: true, pairs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPair = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, symbol, image, minValue, maxValue, minPercentage, maxPercentage, isRecommended } = req.body;

    const pairExists = await Pair.findOne({ $or: [{ name }, { symbol }] });
    if (pairExists) {
      res.status(400).json({ message: 'Pair with this name or symbol already exists' });
      return;
    }

    const randomValue = minValue + Math.random() * (maxValue - minValue);
    const pair = await Pair.create({
      name,
      symbol,
      image,
      minValue,
      maxValue,
      minPercentage,
      maxPercentage,
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