import mongoose from 'mongoose';

const subEventSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'SubEvent must reference a main Event']
  },
  name: {
    type: String,
    required: [true, 'SubEvent name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  start_time: {
    type: Date,
    required: [true, 'Start time is required']
  },
  end_time: {
    type: Date,
    required: [true, 'End time is required']
  },
  stage: {
    type: String,
    required: [true, 'Stage/Location is required'],
    trim: true
  },
  performer: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

// Index for high performance chronological queries
subEventSchema.index({ event: 1, start_time: 1 });

const SubEvent = mongoose.model('SubEvent', subEventSchema);
export default SubEvent;
