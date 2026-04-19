import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const updateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);

    const result = await User.findOneAndUpdate(
      { email: 'admin@beecoin.com' },
      { $set: { email: 'admin@cryptax.com' } },
      { new: true }
    );

    if (result) {
      console.log('Admin email updated to admin@cryptax.com');
    } else {
      // No existing admin — create fresh
      await User.create({
        name: 'Admin',
        email: 'admin@cryptax.com',
        password: 'admin123',
        role: 'admin',
        balance: 0,
      });
      console.log('Admin created: admin@cryptax.com / admin123');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateAdmin();
