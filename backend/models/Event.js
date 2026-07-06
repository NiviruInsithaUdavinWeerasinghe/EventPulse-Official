import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  center: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  points: { type: String }
});

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: null,
    },
    bannerImageUrl: {
      type: String,
      required: true,
    },
    bannerPublicId: {
      type: String,
      required: true,
    },
    floorMapUrl: {
      type: String,
      required: true,
    },
    floorMapPublicId: {
      type: String,
      required: true,
    },
    floorMapFileType: {
      type: String,
      enum: ['svg', 'raster'],
      default: 'raster',
    },
    rawSvgContent: {
      type: String,
    },
    zones: [zoneSchema],
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
