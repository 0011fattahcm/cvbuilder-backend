import Admin from '../models/Admin.js';
import User from '../models/User.js';
import CV from '../models/CV.js';
import jwt from 'jsonwebtoken';

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(401).json({ message: 'Email tidak ditemukan' });

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) return res.status(401).json({ message: 'Password salah' });

  const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
};

export const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

export const getUserCV = async (req, res) => {
  const { userId } = req.params;
  const cv = await CV.findOne({ user: userId });
  if (!cv) return res.status(404).json({ message: 'CV tidak ditemukan' });
  res.json(cv);
};
