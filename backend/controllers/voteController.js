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

// ── EP-21: List distinct voting categories for an event (leaderboard selector) ──
// GET /api/vote/categories/:eventId
export const getCategories = async (req, res) => {
  try {
    const { eventId } = req.params;
    const categories = await Candidate.distinct('category', { eventId });
    res.status(200).json({ success: true, data: categories.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-21: Organizer-facing leaderboard — candidates ranked by vote count ──
// GET /api/vote/leaderboard/:eventId/:category
//
// Tallies the *raw* votes collection live (GROUP BY candidateId, COUNT(*),
// ORDER BY count DESC) rather than trusting the denormalized Candidate.totalVotes
// counter, so the leaderboard reflects an independently-verifiable source of truth.
// The { eventId, category, candidateId } index on Vote (see models/Vote.js) lets
// the $match + $group stages run as an index scan instead of a full collection scan.
export const getLeaderboard = async (req, res) => {
  try {
    const { eventId, category } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid Event ID.' });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Core tally: GROUP BY candidateId over the votes collection, COUNT(*) per
    // group, ORDER BY that count descending — the highest-voted candidate first.
    const tally = await Vote.aggregate([
      { $match: { eventId: eventObjectId, category } },
      { $group: { _id: '$candidateId', voteCount: { $sum: 1 } } },
      { $sort: { voteCount: -1 } },
      {
        $lookup: {
          from: 'candidates',
          localField: '_id',
          foreignField: '_id',
          as: 'candidate',
        },
      },
      { $unwind: '$candidate' },
      {
        $project: {
          _id: '$candidate._id',
          name: '$candidate.name',
          photoUrl: '$candidate.photoUrl',
          voteCount: 1,
        },
      },
    ]);

    // Candidates with zero votes have no rows in the votes collection, so they
    // can never surface from the GROUP BY above — append them at the bottom
    // so the leaderboard still lists every candidate registered in this category.
    const talliedIds = tally.map((t) => t._id);
    const untallied = await Candidate.find({
      eventId: eventObjectId,
      category,
      _id: { $nin: talliedIds },
    })
      .select('name photoUrl')
      .sort({ name: 1 });

    const leaderboard = [
      ...tally,
      ...untallied.map((c) => ({ _id: c._id, name: c.name, photoUrl: c.photoUrl, voteCount: 0 })),
    ];

    const totalVotes = leaderboard.reduce((sum, c) => sum + c.voteCount, 0);

    res.status(200).json({ success: true, data: leaderboard, totalVotes });
  } catch (error) {
    console.error('getLeaderboard error:', error);
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