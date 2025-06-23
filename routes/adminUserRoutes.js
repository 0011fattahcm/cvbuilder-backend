import express from 'express';
import adminOnly from '../middleware/authAdminMiddleware.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/rx78gpo1p6/users', adminOnly, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

router.delete('/rx78gpo1p6/users/:id', adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User berhasil dihapus' });
});

router.put('/rx78gpo1p6/users/:id', adminOnly, async (req, res) => {
    const { name, email } = req.body;
    const updated = await User.findByIdAndUpdate(req.params.id, { name, email }, { new: true });
    res.json(updated);
  });

  router.post('/rx78gpo1p6/users', adminOnly, async (req, res) => {
    const { name, email, password } = req.body;
  
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: 'Email sudah digunakan' });
  
    // ✅ Hash password dulu sebelum simpan
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
  
    const newUser = new User({ name, email, password: hashedPassword });
  
    await newUser.save();
    res.status(201).json(newUser);
  });
  

// routes/adminUsers.js
router.patch('/rx78gpo1p6/users/:id/status', adminOnly, async (req, res) => {
    const { isActive } = req.body;
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Gagal mengubah status pengguna' });
    }
  });
  
  
  
export default router;
