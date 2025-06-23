import express from "express";
import {
  registerUser,
  loginUser,
  getUserById,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyCode,
  resendVerificationCode
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 Authenticated routes
router.put("/update-password", authMiddleware, updatePassword);
router.get("/:id", getUserById); // bisa tambahkan authMiddleware jika perlu proteksi

// 📝 Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-code", verifyCode);
router.post("/resend-code", resendVerificationCode);

export default router;
