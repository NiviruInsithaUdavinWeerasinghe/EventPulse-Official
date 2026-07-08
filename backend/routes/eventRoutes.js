import express from 'express';
import upload from '../middleware/upload.js';
import { 
  createEvent, 
  getAllEvents, 
  getEventById, 
  updateEvent, 
  purchaseTicket, 
  getUserTickets,
  updateEventZones,
  submitVendorApplication,
  getEventApplications,
  updateApplicationStatus
} from '../controllers/eventController.js';
import { searchEventZones } from '../controllers/searchController.js';

const router = express.Router();

router.post('/', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.put('/:id', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), updateEvent);
router.post('/:id/purchase', purchaseTicket);
router.get('/user/:userId/tickets', getUserTickets);

// Zone and vendor applications routes
router.put('/:id/zones', updateEventZones);
router.post('/applications/submit', submitVendorApplication);
router.get('/applications/event/:eventId', getEventApplications);
router.put('/applications/:id/status', updateApplicationStatus);
router.get('/:id/search', searchEventZones);

export default router;
