import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();

const updatePasswords = async () => {
  try {
    await connectDB();
    
    // Find users with role not admin
    const users = await User.find({ role: { $ne: 'admin' } });
    
    let updatedCount = 0;
    
    for (const user of users) {
      user.password = '123456';
      await user.save(); // pre-save hook will hash it
      updatedCount++;
      console.log(`Updated user ${user.phone}`);
    }
    
    console.log(`Successfully updated ${updatedCount} users.`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

updatePasswords();
