// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceId: { type: String, required: true },
  externalId: { type: String, required: true },
  status: { type: String, default: 'PENDING' }, // 'PENDING', 'PAID'
  exportQuota: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Payment', paymentSchema);
