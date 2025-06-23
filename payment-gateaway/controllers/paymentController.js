import dotenv from 'dotenv';
import axios from 'axios';
import PaymentHistory from '../models/PaymentHistory.js';
import { sendPaymentSuccessEmail } from '../config/nodemailerConfig.js';
import User from '../../models/User.js';

dotenv.config();

// Generate Reference ID
const generateReferenceId = (userId) => {
  const timestamp = Date.now();
  return `payment-${userId}-${timestamp}`;
};

// ✅ Generate QRIS pakai Axios (karena SDK tidak support langsung)
export const createPaymentWithQRIS = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('📥 Request from frontend:', userId);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const referenceId = `payment-${userId}-${Date.now()}`;
    const amount = 5000;

    const response = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        external_id: referenceId,
        type: 'DYNAMIC',
        amount,
        currency: 'IDR',
        callback_url: `${process.env.BASE_URL}/api/xendit/webhook`,
      },
      {
        auth: {
          username: process.env.XENDIT_SECRET_KEY,
          password: '',
        },
      }
    );

    console.log('✅ QRIS created:', response.data);

    const payment = response.data;

    const paymentRecord = new PaymentHistory({
      userId,
      paymentId: payment.id,
      referenceId,
      paymentStatus: 'PENDING',
      remainingExports: 0,
      amount,
      payerEmail: user.email,
      qrCodeUrl: payment.qr_code_url,
      externalId: referenceId,
    });

    await paymentRecord.save();

    res.json({
      qrString: payment.qr_string,
      referenceId,
    });    

    } catch (error) {
    console.error('❌ [QRIS Error]:', {
      message: error.message,
      code: error.code,
      response: error?.response?.data,
    });
    res.status(500).json({ message: 'Payment creation failed' });
  }
};

export const checkPaymentStatus = async (req, res) => {
  try {
    const { referenceId } = req.params;
    const record = await PaymentHistory.findOne({ referenceId });

    if (!record) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

    return res.json({
      status: record.paymentStatus,
      remainingExports: record.remainingExports,
    });
  } catch (err) {
    console.error('❌ Error checking status:', err);
    res.status(500).json({ message: 'Gagal cek status pembayaran' });
  }
};

export const getExportQuota = async (req, res) => {
  try {
    const { userId } = req.params;

    // Ambil transaksi terakhir yang PAID
    const latest = await PaymentHistory.findOne({
      userId,
      paymentStatus: 'PAID',
      remainingExports: { $gt: 0 },
    }).sort({ createdAt: -1 });

    // Kalau tidak ada atau kuota sudah habis → anggap 0
    const quota = latest && latest.remainingExports > 0
      ? latest.remainingExports
      : 0;

    res.json({ remainingExports: quota });
  } catch (err) {
    console.error('❌ Error getting export quota:', err);
    res.status(500).json({ message: 'Gagal ambil kuota ekspor' });
  }
};

export const verifyPayment = async (req, res) => {
  const { reference_id, status } = req.body.data;

  if (status === 'SUCCEEDED') {
    try {
      const paymentRecord = await PaymentHistory.findOne({ referenceId: reference_id });

      if (!paymentRecord) {
        return res.status(404).json({ message: 'Payment record not found' });
      }

      if (paymentRecord.paymentStatus !== 'PAID') {
        paymentRecord.paymentStatus = 'PAID';
        paymentRecord.remainingExports = 2;
        await paymentRecord.save();
      }

      await sendPaymentSuccessEmail(paymentRecord.payerEmail);
      return res.status(200).send('✅ Payment verified & updated');
    } catch (err) {
      console.error('❌ Error verifying payment:', err);
      return res.status(500).json({ message: 'Error verifying payment' });
    }
  } else {
    return res.status(200).send('ℹ️ Payment not completed');
  }
  
};

export const decreaseQuota = async (req, res) => {
  try {
    const { referenceId } = req.body;

    if (!referenceId) {
      return res.status(400).json({ message: 'ReferenceId dibutuhkan' });
    }

    const payment = await PaymentHistory.findOne({
      referenceId,
      paymentStatus: 'PAID',
      remainingExports: { $gt: 0 },
    });

    if (!payment) {
      return res.status(403).json({ message: 'Kuota tidak tersedia atau sudah habis' });
    }

    payment.remainingExports -= 1;
    await payment.save();

    res.json({ remainingExports: payment.remainingExports });
  } catch (err) {
    console.error('❌ Error mengurangi kuota:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllPaymentHistories = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 50;
    const { status, keyword } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.paymentStatus = status;
    }

    if (keyword) {
      query.$or = [
        { payerEmail: { $regex: keyword, $options: 'i' } },
        { referenceId: { $regex: keyword, $options: 'i' } },
      ];
    }

    const total = await PaymentHistory.countDocuments(query);
    const histories = await PaymentHistory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: histories,
    });
  } catch (err) {
    console.error('❌ Gagal ambil payment histories:', err);
    res.status(500).json({ message: 'Server error ambil payment histories' });
  }
};

export const getTotalIncome = async (req, res) => {
  try {
    const result = await PaymentHistory.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const total = result[0]?.total || 0;
    res.json({ total });
  } catch (err) {
    console.error('❌ Gagal hitung total pemasukan:', err);
    res.status(500).json({ message: 'Gagal hitung total pemasukan' });
  }
};


