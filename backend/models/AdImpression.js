import mongoose from 'mongoose';

// EP-134: Tracks when an ad was last shown to a specific attendee,
// used to enforce cooldown and prevent notification spam.
const adImpressionSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorAd',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shownAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One impression record per (ad, user) pair — updated on each trigger
adImpressionSchema.index({ adId: 1, userId: 1 }, { unique: true });

const AdImpression = mongoose.model('AdImpression', adImpressionSchema);

export default AdImpression;