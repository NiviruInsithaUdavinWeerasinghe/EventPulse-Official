import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import Vote from '../models/Vote.js';

// ── EP-133: List candidates for a category (grid data source) ──────────────
// GET /api/vote/candidates/:eventId/:category
export const getCandidates = async (req, res) => {
  try {
    const { eventId, category } = req.params;
    const candidates = await Candidate.find({ eventId, category }).sort({ name: 1 });
    res.status(200).json({ success: true, count: candidates.length, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-133/138: Check if this user has already voted in this category ──────
// GET /api/vote/status/:eventId/:category/:userId
export const getVoteStatus = async (req, res) => {
  try {
    const { eventId, category, userId } = req.params;
    const existingVote = await Vote.findOne({ eventId, category, userId });
    res.status(200).json({
      success: true,
      hasVoted: !!existingVote,
      votedCandidateId: existingVote ? existingVote.candidateId : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-136: Cast a vote — fully atomic, race-condition safe ────────────────
// POST /api/vote
// body: { eventId, userId, category, candidateId }
//
// Uses a MongoDB session + transaction so that:
//   1. The "has this user already voted" check
//   2. The vote record insert
//   3. The candidate's vote counter increment
// all succeed together or all roll back together. The unique index on
// Vote (eventId, userId, category) is the ultimate safety net — even if
// two requests race past the initial check simultaneously, only one
// insert can succeed; the other throws a duplicate-key error and aborts.
export const castVote = async (req, res) => {
  const { eventId, userId, category, candidateId } = req.body;

  if (!eventId || !userId || !category || !candidateId) {
    return res.status(400).json({
      success: false,
      message: 'eventId, userId, category, and candidateId are all required.',
    });
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // Step 1: has this user already voted in this category for this event?
      const existingVote = await Vote.findOne({ eventId, userId, category }).session(session);
      if (existingVote) {
        // Abort the transaction cleanly — no writes have happened yet
        throw new Error('ALREADY_VOTED');
      }

      // Step 2: confirm the candidate actually exists in this category
      const candidate = await Candidate.findOne({ _id: candidateId, eventId, category }).session(session);
      if (!candidate) {
        throw new Error('CANDIDATE_NOT_FOUND');
      }

      // Step 3: insert the vote record (unique index double-guards against races)
      await Vote.create([{ eventId, userId, category, candidateId }], { session });

      // Step 4: increment the candidate's vote counter
      candidate.totalVotes += 1;
      await candidate.save({ session });

      result = { candidateId, totalVotes: candidate.totalVotes };
    });

    res.status(200).json({ success: true, message: 'Vote recorded successfully.', data: result });
  } catch (error) {
    if (error.message === 'ALREADY_VOTED') {
      return res.status(409).json({ success: false, message: 'You have already voted in this category.' });
    }
    if (error.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Candidate not found for this category.' });
    }
    // Duplicate-key error from the unique index — the true final safety net
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already voted in this category.' });
    }
    console.error('Cast vote error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};