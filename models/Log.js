import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  waktu: { type: Date, default: Date.now },
  aksi: { type: String, required: true },
  user: { type: String, required: true }, // email user
});

const Log = mongoose.model('Log', logSchema);

export default Log;
