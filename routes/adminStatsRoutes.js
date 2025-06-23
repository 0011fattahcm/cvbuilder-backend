import express from 'express';
import adminOnly from '../middleware/authAdminMiddleware.js';
import { getLogs } from '../controllers/adminStatsController.js';

const router = express.Router();

router.get('/rx78gpo1p6/logs', adminOnly, getLogs);

export default router;
