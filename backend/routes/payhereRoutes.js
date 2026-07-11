import express from 'express';
import { initiatePayHerePayment, processPayHereNotification } from '../controllers/payhereController.js';

const router = express.Router();

// EP-55: Secure endpoint to generate PayHere checkout params + hash
router.post('/initiate', initiatePayHerePayment);

// EP-58: Webhook callback route to process successful external gateway deposits
router.post('/notify', processPayHereNotification);

export default router;