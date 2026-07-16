import mongoose from 'mongoose';

const locationPingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { 
  timestamps: true,
  collection: 'location_pings'
});

// Create compound index for fast query & aggregation by event and timestamp
locationPingSchema.index({ eventId: 1, timestamp: 1 });

export default mongoose.model('LocationPing', locationPingSchema);
