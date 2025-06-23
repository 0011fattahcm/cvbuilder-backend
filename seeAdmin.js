// seedAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB terkoneksi');

    const existing = await Admin.findOne({ email: 'admin@jeca.id' });
    if (existing) {
      console.log('Admin sudah ada');
      return process.exit(0);
    }

    const admin = new Admin({
      email: 'admin@jeca.id',
      password: 'admin123' // akan di-hash otomatis
    });

    await admin.save();
    console.log('Admin berhasil dibuat!');
    process.exit(0);
  } catch (err) {
    console.error('Gagal seeding:', err);
    process.exit(1);
  }
};

seedAdmin();
