// middleware/authUniversal.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

const authUniversal = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token tidak tersedia" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    const admin = await Admin.findById(decoded.adminId);
    
    if (user) {
      req.user = { userId: user._id, role: 'user' };
    } else if (admin) {
      req.user = { userId: decoded.userId, role: 'admin' };
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch {
    res.status(401).json({ message: "Token tidak valid" });
  }
};

export default authUniversal;
