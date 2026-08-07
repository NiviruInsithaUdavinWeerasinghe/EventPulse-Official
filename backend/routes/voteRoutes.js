import express from 'express';
import { getCandidates, getVoteStatus, castVote, getCategories, getLeaderboard } from '../controllers/voteController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// EP-133: Candidate grid data source
router.get('/candidates/:eventId/:category', getCandidates);

// EP-138: Check vote status (for restoring the locked UI on page reload)
router.get('/status/:eventId/:category/:userId', getVoteStatus);

// EP-136: Cast a vote — atomic transaction
router.post('/', castVote);

// EP-21: Organizer-only leaderboard endpoints
router.get('/categories/:eventId', protect, requireRole('organizer'), getCategories);
router.get('/leaderboard/:eventId/:category', protect, requireRole('organizer'), getLeaderboard);

export default router;