import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Nama wajib diisi"],
  },
  email: {
    type: String,
    required: [true, "Email wajib diisi"],
    unique: true,
  },
  password: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetToken: String,
  resetTokenExpire: Date,
  verificationCode: String
}, {
  timestamps: true
});


export default mongoose.model("User", userSchema);
