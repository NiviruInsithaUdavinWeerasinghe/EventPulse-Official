import mongoose from 'mongoose';

const venueZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Green' },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of coordinates (GeoJSON Polygon standard)
      required: true
    }
  }
}, { timestamps: true });

venueZoneSchema.index({ geometry: '2dsphere' });

const VenueZone = mongoose.model('VenueZone', venueZoneSchema);
export default VenueZone;
