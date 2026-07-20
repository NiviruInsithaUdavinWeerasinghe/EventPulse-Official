import mongoose from 'mongoose';

// EP-136: Records that a user has voted in a specific category for an event.
// The compound unique index is the core anti-double-vote safeguard —
// MongoDB itself will reject a duplicate (userId, eventId, category) insert.
const voteSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
  },
  { timestamps: true }
);

// One vote per user per category per event — enforced at the database level
voteSchema.index({ eventId: 1, userId: 1, category: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);

export default Vote;