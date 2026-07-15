import express from 'express';
import {
  createVendorAd,
  getVendorAds,
  getActiveAdsForEvent,
  updateVendorAd,
  deleteVendorAd,
  triggerAdForUser,
} from '../controllers/vendorAdController.js';

const router = express.Router();

// EP-126: Vendor dashboard CRUD
router.post('/', createVendorAd);
router.get('/vendor/:vendorId', getVendorAds);
router.put('/:id', updateVendorAd);
router.delete('/:id', deleteVendorAd);

// EP-129: All active ads for an event (loaded once by MapViewer)
router.get('/event/:eventId/active', getActiveAdsForEvent);

// EP-134: Cooldown-checked trigger — called when "me" enters an ad's radius
router.post('/trigger', triggerAdForUser);

export default router;