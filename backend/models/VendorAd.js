import mongoose from 'mongoose';

// EP-126/129/134: Location-based vendor advertisement
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
      trim: true,
      default: '',
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
      maxlength: 200,
    },
    // Real-world GPS anchor point for the stall/shop
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
    },
    // Geofence trigger radius, in meters
    radiusMeters: {
      type: Number,
      required: true,
      default: 50,
      min: 5,
      max: 500,
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