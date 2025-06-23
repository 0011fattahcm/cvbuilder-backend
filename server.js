import http from 'http';
import express from "express";
import cors from "cors";
import bodyParser from 'body-parser';
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import cvRoutes from "./routes/cvRoutes.js";
import exportCvRoutes from "./routes/exportCvRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";
import imageToPdfRoutes from "./routes/imageToPdfRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminStatsRoutes from './routes/adminStatsRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import adminExportCvRoutes from './routes/adminExportCvRoutes.js';
import adminLogRoutes from './routes/adminLogRoutes.js';
import cvAdminRoutes from './routes/cvAdminRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import paymentRoutes from './payment-gateaway/routes/paymentRoutes.js';
import xenditWebhookRoutes from './payment-gateaway/routes/xenditWebhookRoute.js';
import { Server } from 'socket.io';

dotenv.config();
const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: '*' }
});
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/export", exportCvRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api", imageToPdfRoutes);

app.use('/api', adminRoutes);
app.use('/api', adminAuthRoutes);
app.use('/api', adminStatsRoutes);
app.use('/api', adminUserRoutes);
app.use('/api/rx78gpo1p6/export', adminExportCvRoutes);
app.use('/api/rx78gpo1p6/cv', cvAdminRoutes);
app.use('/api', adminLogRoutes);
app.use('/api/announcement', announcementRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/xendit', xenditWebhookRoutes);
// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
