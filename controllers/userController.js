import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import logActivity from '../utils/logActivity.js';


export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id); // ✅ pakai `id` sesuai middleware

    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Password lama salah' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: '✅ Password berhasil diubah' });
  } catch (err) {
    console.error('❌ Gagal update password:', err);
    res.status(500).json({ message: 'Gagal ubah password' });
  }
};

// registerUser.js
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: "Email sudah terdaftar" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode,
    });

    await newUser.save();
    await logActivity('Registrasi user baru', email);
    await sendEmail({
      to: email,
      subject: 'Kode Verifikasi Akun CV Builder',
      html: `<p>Kode verifikasi Anda adalah:</p><h2>${verificationCode}</h2>`,
    });

    res.status(201).json({ message: "Registrasi berhasil. Silakan verifikasi email Anda." });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan", error });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email tidak ditemukan" });

    // ⛔ Tambahkan pengecekan status akun
    if (!user.isActive) {
      return res.status(403).json({ message: "Akun Anda telah dinonaktifkan" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Password salah" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    await logActivity('Login user', email);

    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan saat login", error });
  }
};


export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email');
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email tidak terdaftar' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpire = Date.now() + 1000 * 60 * 30; // 30 menit

    user.resetToken = token;
    user.resetTokenExpire = tokenExpire;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const html = `
      <p>Anda meminta reset password untuk akun CV Builder.</p>
      <p>Klik link berikut untuk mengatur ulang password Anda:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Link ini akan kedaluwarsa dalam 30 menit.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Reset Password CV Builder',
      html,
    });

    res.json({ message: '📧 Email reset password sudah dikirim' });
  } catch (err) {
    console.error('❌ Gagal kirim email reset:', err);
    res.status(500).json({ message: 'Gagal kirim email reset password' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token dan password baru wajib diisi." });
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() } // ✅ Ubah dari "resetTokenExpires"
  });
  console.log("USER:", user);
  
  if (!user) {
    return res.status(400).json({ message: "Token tidak valid atau sudah expired." });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;
  await user.save();

  res.status(200).json({ message: "Password berhasil direset." });
};

export const verifyCode = async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.verificationCode !== code) {
    return res.status(400).json({ message: 'Kode verifikasi salah' });
  }

  user.isVerified = true;
  user.verificationCode = undefined; // hapus setelah verifikasi
  await user.save();

  res.json({ message: '✅ Email berhasil diverifikasi' });
};

export const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    if (user.isVerified) return res.status(400).json({ message: 'Akun sudah terverifikasi' });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Kode Verifikasi Baru - CV Builder',
      html: ` <p>Halo ${user.name},</p>
      <p>Terima kasih telah mendaftar di <strong>JECA CV Builder</strong>.</p>
      <p>Kode verifikasi email Anda adalah:</p>
      <h2>${verificationCode}</h2>
      <p>Masukkan kode ini di halaman verifikasi untuk mengaktifkan akun Anda.</p>
      <p>Salam, <br> Tim JECA</p>`,
    });

    res.json({ message: '📨 Kode verifikasi berhasil dikirim ulang' });
  } catch (err) {
    res.status(500).json({ message: '❌ Gagal kirim ulang kode' });
  }
};

