import CV from '../models/CV.js';
import logActivity from '../utils/logActivity.js';

export const createCV = async (req, res) => {
  try {
    console.log("req.user:", req.user);
    const existing = await CV.findOne({ user: req.user.id });
    if (existing) return res.status(400).json({ message: 'CV sudah pernah dibuat' });

    console.log("req.body:", req.body);
    console.log("req.user.id:", req.user.id);
    const newCV = new CV({
      ...req.body,
      user: req.user.id,
    });

    await newCV.save();
    await logActivity('Buat CV Baru', req.user.email);
    res.status(201).json({ message: 'CV berhasil dibuat', data: newCV });
  } catch (error) {
    console.error('❌ Gagal membuat CV:', error);
    res.status(500).json({ message: 'Gagal membuat CV' });
  }
};

export const getCV = async (req, res) => {
  try {
    const cv = await CV.findOne({ user: req.user.id });
    if (!cv) return res.status(404).json({ message: 'CV belum tersedia' });

    res.json(cv);
  } catch (error) {
    console.error('❌ Gagal ambil CV:', error);
    res.status(500).json({ message: 'Gagal ambil data CV' });
  }
};

export const updateCV = async (req, res) => {
  try {
    let cv = await CV.findOne({ user: req.user.id });
    if (!cv) {
      cv = new CV({
        user: req.user.id,
        ...req.body
      });
      await cv.save();
      await logActivity('Buat CV Baru', req.user.email);
      return res.status(201).json({ message: 'CV berhasil dibuat', data: cv });
    }
    // kalau sudah ada update saja
    Object.assign(cv, req.body);
    await cv.save();
    res.json({ message: 'CV berhasil diperbarui', data: cv });
  } catch (error) {
    console.error('❌ Gagal update CV:', error);
    res.status(500).json({ message: 'Gagal update CV' });
  }
};


export const deleteCV = async (req, res) => {
  try {
    await CV.findOneAndDelete({ user: req.user.id });
    res.json({ message: 'CV berhasil dihapus' });
  } catch (error) {
    console.error('❌ Gagal hapus CV:', error);
    res.status(500).json({ message: 'Gagal hapus CV' });
  }
};
export const getCVByToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const cv = await CV.findOne({ user: userId });
    if (!cv) return res.status(404).json({ message: 'CV tidak ditemukan' });
    res.json(cv);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil CV', error });
  }
};

export const getCVByUserId = async (req, res) => {
  const { id } = req.params;
  try {
    const cv = await CV.findOne({ user: id });
    if (!cv) return res.status(404).json({ message: 'CV tidak ditemukan' });
    res.json(cv);
  } catch (err) {
    res.status(500).json({ message: 'Gagal ambil data CV' });
  }
};

