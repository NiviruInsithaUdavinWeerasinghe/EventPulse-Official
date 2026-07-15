import mongoose from 'mongoose';

// EP-126/129/134: Location-based vendor advertisement
// Anchored to the vendor's stall zone (x/y already stored on Event.zones) —
// no separate GPS coordinates needed since the whole map runs on SVG units.
const vendorAdSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stallId: {
      type: String,
      required: [true, 'stallId is required — the ad is anchored to your approved stall.'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Ad title is required'],
      trim: true,
      maxlength: 60,
    },
    message: {
      type: String,
      required: [true, 'Ad message is required'],
      trim: true,
      maxlength: 100,
    },
    // Trigger radius in SVG map units (same coordinate space as userPosition/zone.center)
    radiusPx: {
      type: Number,
      required: true,
      default: 80,
      min: 20,
      max: 300,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

vendorAdSchema.index({ eventId: 1, isActive: 1 });

const VendorAd = mongoose.model('VendorAd', vendorAdSchema);

export default VendorAd;