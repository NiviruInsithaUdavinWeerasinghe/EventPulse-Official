import express from 'express';
import { protect } from '../middleware/auth.js';
import { toggleBookmark, getBookmarks } from '../controllers/bookmarkController.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// POST /api/bookmarks/toggle
router.post('/toggle', toggleBookmark);

// GET /api/bookmarks
router.get('/', getBookmarks);

export default router;
