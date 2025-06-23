import jwt from 'jsonwebtoken';

const adminOnly = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('authHeader:', authHeader);  // debug

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('Token tidak ditemukan');
    return res.status(401).json({ message: 'Tidak ada token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('decoded token:', decoded);  // debug

    if (!decoded.role || decoded.role !== 'admin') {
      console.log('Role bukan admin');
      return res.status(403).json({ message: 'Akses hanya untuk admin' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.log('Token tidak valid:', err.message);
    return res.status(401).json({ message: 'Token tidak valid atau kadaluwarsa' });
  }
};

export default adminOnly;
