import mongoose, { Document, Schema } from 'mongoose';

export interface IPair extends Document {
  name: string;
  symbol: string;
  image: string;
  minValue: number;
  maxValue: number;
  minPercentage: number;
  maxPercentage: number;
  currentValue: number;
  isRecommended: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PairSchema = new Schema<IPair>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  image: {
    type: String,
    required: true
  },
  minValue: {
    type: Number,
    required: true
  },
  maxValue: {
    type: Number,
    required: true
  },
  minPercentage: {
    type: Number,
    required: true
  },
  maxPercentage: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    required: true,
    default: 0
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

PairSchema.pre<IPair>('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IPair>('Pair', PairSchema);