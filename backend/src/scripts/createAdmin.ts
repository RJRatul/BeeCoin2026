import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@beecoin.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@beecoin.com',
      password: 'admin123',
      role: 'admin',
      balance: 0
    });
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@beecoin.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();