import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './models/User.js';


dotenv.config();

async function testAPI() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found');
            return;
        }

        const token = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_SECRET || 'supersecretjwtkey123', { expiresIn: '30d' });
        const headers = { 'Authorization': `Bearer ${token}` };

        const runTest = async (url) => {
            console.log(`Testing ${url}...`);
            const res = await fetch(`http://localhost:5000${url}`, { headers });
            console.log(`Status: ${res.status}`);
            if (res.status !== 200) {
                console.log(await res.text());
            }
        };

        // Use global fetch
        const gFetch = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;

        const runTestG = async (url) => {
            console.log(`Testing ${url}...`);
            const res = await gFetch(`http://localhost:5000${url}`, { headers });
            console.log(`Status: ${res.status}`);
            if (res.status !== 200) {
                console.log(await res.text());
            } else {
                console.log('Length:', (await res.json()).length);
            }
        };

        await runTestG('/api/products?all=true');
        await runTestG('/api/orders');
        await runTestG('/api/users');
        
        console.log(`Testing /api/notifications/analytics...`);
        const nRes = await gFetch(`http://localhost:5000/api/notifications/analytics`, { headers });
        console.log(`Status: ${nRes.status}`);

        console.log('Done');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testAPI();
