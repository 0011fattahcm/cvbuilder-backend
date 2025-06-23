import express from 'express';
import adminOnly from '../middleware/authAdminMiddleware.js';
import { getAllUsers, getUserCV } from '../controllers/adminController.js';

const router = express.Router();

router.get('/rx78gpo1p6/users', adminOnly, getAllUsers);
router.get('/rx78gpo1p6/cv/:userId', adminOnly, getUserCV);

export default router;
