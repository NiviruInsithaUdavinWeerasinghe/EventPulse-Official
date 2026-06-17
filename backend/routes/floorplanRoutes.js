import express from 'express';
import upload from '../middleware/upload.js';
import {
  uploadFloorplan,
  getAllFloorplans,
  getFloorplanById,
} from '../controllers/floorplanController.js';

const router = express.Router();

router.post('/upload', upload.single('floorplanImage'), uploadFloorplan);
router.get('/', getAllFloorplans);
router.get('/:id', getFloorplanById);

export default router;
