import express from 'express';
import {
  createCV,
  getCV,
  updateCV,
  deleteCV,
  getCVByUserId,
  getCVByToken
} from '../controllers/cvController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createCV);
router.get('/', authMiddleware, getCVByToken);
router.get('/', authMiddleware, getCV);
router.put('/', authMiddleware, updateCV);
router.delete('/', authMiddleware, deleteCV);
router.get('/:userId', getCVByUserId);

export default router;
