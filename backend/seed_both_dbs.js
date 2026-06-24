import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const seedAdmin = async () => {
  const adminData = {
    name: 'Admin',
    phone: '8074899831',
    email: 'lalitha.support@gmail.com',
    role: 'admin',
    isApproved: true
  };

  const seedDB = async (uri, dbName) => {
    try {
      console.log(`\nConnecting to ${dbName}...`);
      await mongoose.connect(uri);
      console.log(`Connected to ${dbName} successfully!`);

      const userSchema = new mongoose.Schema({
        name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },
        email: { type: String },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'customer', 'delivery'], default: 'customer' },
        isApproved: { type: Boolean, default: true },
      }, { timestamps: true });

      const User = mongoose.models.User || mongoose.model('User', userSchema);

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('LalithaMart', salt);

      const existing = await User.findOne({ phone: adminData.phone });
      if (existing) {
        console.log(`Admin already exists in ${dbName}. Updating password and role...`);
        existing.role = 'admin';
        existing.password = hashedPassword;
        await existing.save();
        console.log(`Admin updated successfully in ${dbName}.`);
      } else {
        const adminUser = new User({ ...adminData, password: hashedPassword });
        await adminUser.save();
        console.log(`Admin user created successfully in ${dbName}!`);
      }
    } catch (error) {
      console.error(`Error in ${dbName}:`, error.message);
    } finally {
      await mongoose.disconnect();
    }
  };

  // Seed Live DB
  await seedDB('mongodb+srv://lalithamartsupport_db_user:JFFnCo8UMH9hAGVU@cluster0.ss7ajzm.mongodb.net/lalithamart?appName=Cluster0', 'LIVE Database');
  
  // Seed Local DB
  await seedDB('mongodb://127.0.0.1:27017/lalithamart', 'LOCAL Database');
};

seedAdmin();
