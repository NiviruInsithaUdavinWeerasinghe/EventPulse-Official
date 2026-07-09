import express from 'express';
import { initiatePayHerePayment } from '../controllers/payhereController.js';

const router = express.Router();

// EP-55: Secure endpoint to generate PayHere checkout params + hash
router.post('/initiate', initiatePayHerePayment);

export default router;