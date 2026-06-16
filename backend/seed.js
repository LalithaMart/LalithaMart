import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lalithamart');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Admin user already exists!');
      process.exit();
    }

    const adminUser = {
      name: 'Super Admin',
      phone: '9999999999',
      password: 'adminpassword',
      role: 'admin',
    };

    await User.create(adminUser);

    console.log('Admin User Seeded Successfully!');
    console.log('--- LOGIN CREDENTIALS ---');
    console.log(`Phone: ${adminUser.phone}`);
    console.log(`Password: ${adminUser.password}`);
    console.log('-------------------------');

    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
