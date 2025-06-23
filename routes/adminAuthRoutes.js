import express from 'express';
import { loginAdmin } from '../controllers/adminController.js';

const router = express.Router();

router.post('/rx78gpo1p6/login', loginAdmin);

export default router;
