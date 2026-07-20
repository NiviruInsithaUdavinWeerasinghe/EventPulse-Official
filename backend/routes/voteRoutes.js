import express from 'express';
import { getCandidates, getVoteStatus, castVote } from '../controllers/voteController.js';

const router = express.Router();

// EP-133: Candidate grid data source
router.get('/candidates/:eventId/:category', getCandidates);

// EP-138: Check vote status (for restoring the locked UI on page reload)
router.get('/status/:eventId/:category/:userId', getVoteStatus);

// EP-136: Cast a vote — atomic transaction
router.post('/', castVote);

export default router;