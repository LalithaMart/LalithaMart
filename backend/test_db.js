import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import User from './models/User.js';

dotenv.config();

async function testDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const userCount = await User.countDocuments();
        console.log('Users:', userCount);

        const orderCount = await Order.countDocuments();
        console.log('Orders:', orderCount);

        console.log('Done');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testDB();
