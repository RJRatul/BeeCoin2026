import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  pairId: mongoose.Types.ObjectId;
  pairSymbol: string;
  pairName: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  targetPrice: number;
  status: 'open' | 'closed' | 'cancelled';
  closedAt?: Date;
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pairId: {
    type: Schema.Types.ObjectId,
    ref: 'Pair',
    required: true
  },
  pairSymbol: {
    type: String,
    required: true
  },
  pairName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true
  },
  targetPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'cancelled'],
    default: 'open'
  },
  closedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IOrder>('Order', OrderSchema);