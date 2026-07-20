import mongoose from 'mongoose';

// EP-133/136: A candidate entry within a voting category for an event
const candidateSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    category: {
      type: String,
      required: [true, 'Voting category is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    totalVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

candidateSchema.index({ eventId: 1, category: 1 });

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;