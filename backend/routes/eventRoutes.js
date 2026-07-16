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
  updateApplicationStatus,
  getEventSchedule,
  createSubEvent,
  updateSubEvent,
  deleteSubEvent,
  getPeakHours
} from '../controllers/eventController.js';
import { searchEventZones } from '../controllers/searchController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Zone and vendor applications routes
router.get('/applications/event/:eventId', getEventApplications);
router.put('/:id/zones', updateEventZones);
router.post('/applications/submit', submitVendorApplication);
router.put('/applications/:id/status', updateApplicationStatus);
router.get('/:id/search', searchEventZones);
router.get('/:id/peak-hours', protect, requireRole('organizer'), getPeakHours);

router.post('/', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.put('/:id', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'floorMap', maxCount: 1 }]), updateEvent);
router.post('/:id/purchase', purchaseTicket);
router.get('/user/:userId/tickets', getUserTickets);

// Schedule (SubEvent) CRUD routes
router.get('/:id/schedule', getEventSchedule);
router.post('/:id/schedule', createSubEvent);
router.put('/schedule/:subId', updateSubEvent);
router.delete('/schedule/:subId', deleteSubEvent);

export default router;
