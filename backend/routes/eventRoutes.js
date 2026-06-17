import express from 'express';
import upload from '../middleware/upload.js';
import { createEvent, getAllEvents, getEventById } from '../controllers/eventController.js';

const router = express.Router();

router.post('/', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);

export default router;
