import mongoose from 'mongoose';

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
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
