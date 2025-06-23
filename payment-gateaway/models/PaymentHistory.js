import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  paymentId: { 
    type: String, 
    required: true, 
  },
  referenceId: { 
    type: String, 
    required: true, 
  },
  paymentStatus: { 
    type: String, 
    default: 'PENDING', 
    enum: ['PENDING', 'PAID', 'FAILED'], 
  },
  remainingExports: { 
    type: Number, 
    default: 2,  // Memberikan 2 kesempatan ekspor untuk setiap pembayaran
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now, 
  },
  amount: { 
    type: Number, 
    required: true, 
  },
  payerEmail: { 
    type: String, 
    required: true, 
  },
  qrCodeUrl: { 
    type: String, 
    required: false, 
  },
  externalId: { 
    type: String, 
    required: true, 
  },
});

paymentHistorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

export default PaymentHistory;
