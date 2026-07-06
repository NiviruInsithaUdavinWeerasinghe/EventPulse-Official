import express from 'express';
import upload from '../middleware/upload.js';
import { createEvent, getAllEvents, getEventById, updateEvent, purchaseTicket, getUserTickets } from '../controllers/eventController.js';

const router = express.Router();

router.post('/', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.put('/:id', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), updateEvent);
router.post('/:id/purchase', purchaseTicket);
router.get('/user/:userId/tickets', getUserTickets);

export default router;
