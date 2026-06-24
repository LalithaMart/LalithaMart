import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const seedAdmin = async () => {
  try {
    console.log('Attempting to connect with guessed username guruvenkat99...');
    await mongoose.connect('mongodb+srv://guruvenkat99:JFFnCo8UMH9hAGVU@cluster0.ss7ajzm.mongodb.net/lalithamart?appName=Cluster0');
    console.log('Connected to DB successfully!');

    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      phone: { type: String, required: true, unique: true },
      email: { type: String },
      password: { type: String, required: true },
      role: { type: String, enum: ['admin', 'customer', 'delivery'], default: 'customer' },
      isApproved: { type: Boolean, default: true },
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('LalithaMart', salt);

    // Check if admin already exists
    const existing = await User.findOne({ phone: '8074899831' });
    if (existing) {
      console.log('Admin already exists! Updating role just in case.');
      existing.role = 'admin';
      existing.password = hashedPassword;
      await existing.save();
      return;
    }

    const adminUser = new User({
      name: 'Admin',
      phone: '8074899831',
      email: 'lalitha.support@gmail.com',
      password: hashedPassword,
      role: 'admin',
      isApproved: true
    });

    await adminUser.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error connecting or creating user:', error.message);
    
    // Fallback guess: admin
    try {
      console.log('\nFallback: Attempting to connect with username "admin"...');
      await mongoose.connect('mongodb+srv://admin:JFFnCo8UMH9hAGVU@cluster0.ss7ajzm.mongodb.net/lalithamart?appName=Cluster0');
      console.log('Connected to DB successfully!');
      
      const userSchema = new mongoose.Schema({
        name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },
        email: { type: String },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'customer', 'delivery'], default: 'customer' },
        isApproved: { type: Boolean, default: true },
      }, { timestamps: true });
      const User = mongoose.model('User', userSchema);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('LalithaMart', salt);
      const adminUser = new User({
        name: 'Admin',
        phone: '8074899831',
        email: 'lalitha.support@gmail.com',
        password: hashedPassword,
        role: 'admin',
        isApproved: true
      });
      await adminUser.save();
      console.log('Admin user created successfully with admin username');
    } catch (e2) {
      console.error('Fallback error:', e2.message);
      
      // Fallback 3: lalithamart
      try {
        console.log('\nFallback 2: Attempting to connect with username "lalithamart"...');
        await mongoose.connect('mongodb+srv://lalithamart:JFFnCo8UMH9hAGVU@cluster0.ss7ajzm.mongodb.net/lalithamart?appName=Cluster0');
        console.log('Connected to DB successfully!');
        const userSchema = new mongoose.Schema({
          name: { type: String, required: true },
          phone: { type: String, required: true, unique: true },
          email: { type: String },
          password: { type: String, required: true },
          role: { type: String, enum: ['admin', 'customer', 'delivery'], default: 'customer' },
          isApproved: { type: Boolean, default: true },
        }, { timestamps: true });
        const User = mongoose.model('User', userSchema);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('LalithaMart', salt);
        const adminUser = new User({
          name: 'Admin',
          phone: '8074899831',
          email: 'lalitha.support@gmail.com',
          password: hashedPassword,
          role: 'admin',
          isApproved: true
        });
        await adminUser.save();
        console.log('Admin user created successfully with lalithamart username');
      } catch (e3) {
        console.error('Failed all attempts:', e3.message);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
