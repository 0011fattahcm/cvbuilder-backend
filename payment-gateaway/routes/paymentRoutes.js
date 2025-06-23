//paymentRoutes.js
import express from 'express';
import { createPaymentWithQRIS, checkPaymentStatus, getExportQuota, decreaseQuota, getAllPaymentHistories, getTotalIncome } from '../controllers/paymentController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import authAdminMiddleware from '../../middleware/authAdminMiddleware.js';

const router = express.Router();

router.post('/create/qris', createPaymentWithQRIS);
router.get('/check-status/:referenceId', checkPaymentStatus);
router.get('/export-quota/:userId', getExportQuota);
router.post('/decrease-quota', authMiddleware, decreaseQuota);
router.get('/histories', authAdminMiddleware, getAllPaymentHistories);
router.get('/total-income', authAdminMiddleware, getTotalIncome);

export default router;
