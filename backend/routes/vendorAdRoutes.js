import express from 'express';
import {
  createVendorAd,
  getVendorAds,
  updateVendorAd,
  deleteVendorAd,
  getNearbyAds,
} from '../controllers/vendorAdController.js';

const router = express.Router();

// EP-126: Vendor dashboard CRUD
router.post('/', createVendorAd);
router.get('/vendor/:vendorId', getVendorAds);
router.put('/:id', updateVendorAd);
router.delete('/:id', deleteVendorAd);

// EP-129 + EP-134: Attendee geofence trigger, with anti-spam cooldown
router.post('/nearby', getNearbyAds);

export default router;