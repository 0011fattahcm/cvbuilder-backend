import express from 'express';
import {
  getActiveAnnouncement,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  setActiveAnnouncement,
  deactivateAllAnnouncements
} from '../controllers/announcementController.js';

const router = express.Router();

router.get('/', getActiveAnnouncement); // untuk user
router.get('/all', getAllAnnouncements); // untuk admin
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);
router.patch('/deactivate-all', deactivateAllAnnouncements);
router.patch('/activate/:id', setActiveAnnouncement);

export default router;
