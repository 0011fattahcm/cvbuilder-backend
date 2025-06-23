import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ Token tidak tersedia di header');
    return res.status(401).json({ message: 'Token tidak tersedia' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('email name');
    if (!user) return res.status(401).json({ message: 'User tidak ditemukan' });

    req.user = {
      id: decoded.id,           // ✅ pakai `id` supaya standar
      email: user.email,
      name: user.name
    };

    console.log('✅ Token valid. userId:', decoded.id);
    next();
  } catch (err) {
    console.error('❌ Token tidak valid:', err.message);
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};

export default authMiddleware;
