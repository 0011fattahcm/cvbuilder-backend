// routes/xenditWebhook.js
import express from 'express';
import PaymentHistory from '../models/PaymentHistory.js';
import { sendPaymentSuccessEmail } from '../config/nodemailerConfig.js';
import User from '../../models/User.js';

const router = express.Router();
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;

    const reference_id = payload?.qr_code?.external_id;
    const status = payload?.status;

    if (!reference_id || !status) {
      console.warn('⚠️ Webhook tidak lengkap:', payload);
      return res.status(400).json({ message: 'Invalid webhook payload' });
    }

    if (status === 'COMPLETED' || status === 'SUCCEEDED') {
      const payment = await PaymentHistory.findOne({ referenceId: reference_id });

      if (payment && payment.paymentStatus !== 'PAID') {
        payment.paymentStatus = 'PAID';
        payment.remainingExports = 2;
        await payment.save();
        console.log(`✅ Payment sukses untuk user ${payment.userId}`);
        await sendPaymentSuccessEmail(payment.payerEmail, payment.amount, payment.referenceId);
      }
    }

    res.status(200).json({ message: 'Webhook diterima' });
  } catch (err) {
    console.error('❌ Error di webhook:', err);
    res.status(500).json({ message: 'Error webhook' });
  }
});



export default router;
