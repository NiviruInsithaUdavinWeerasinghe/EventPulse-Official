import mongoose from 'mongoose';

const UserBookmarkSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'user_bookmarks',
  }
);

// Composite unique index to ensure no duplicate bookmarks
UserBookmarkSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

const UserBookmark = mongoose.model('UserBookmark', UserBookmarkSchema);

export default UserBookmark;
