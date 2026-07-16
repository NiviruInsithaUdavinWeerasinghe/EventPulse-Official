import UserBookmark from '../models/UserBookmark.js';

/**
 * POST /api/bookmarks/toggle
 * Toggle bookmark state for an event.
 */
export async function toggleBookmark(req, res) {
  try {
    const user_id = req.body.user_id || req.user?.id;
    const { event_id } = req.body;

    if (!user_id || !event_id) {
      return res.status(400).json({
        success: false,
        message: 'Both user_id and event_id are required.',
      });
    }

    // Check if bookmark exists
    const existing = await UserBookmark.findOne({ user_id, event_id });

    if (existing) {
      // Delete (un-bookmark)
      await UserBookmark.deleteOne({ _id: existing._id });
    } else {
      // Insert (bookmark)
      await UserBookmark.create({ user_id, event_id });
    }

    // Fetch and return the updated array of bookmarked event IDs
    const bookmarks = await UserBookmark.find({ user_id }).select('event_id');
    const bookmarkedIds = bookmarks.map((b) => b.event_id.toString());

    return res.status(200).json({
      success: true,
      bookmarks: bookmarkedIds,
      data: bookmarkedIds, // Return both formats to be safe
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while toggling bookmark.',
      error: error.message,
    });
  }
}

/**
 * GET /api/bookmarks
 * Get all bookmarked event IDs for the user.
 */
export async function getBookmarks(req, res) {
  try {
    const user_id = req.query.user_id || req.user?.id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required.',
      });
    }

    const bookmarks = await UserBookmark.find({ user_id }).select('event_id');
    const bookmarkedIds = bookmarks.map((b) => b.event_id.toString());

    return res.status(200).json({
      success: true,
      bookmarks: bookmarkedIds,
      data: bookmarkedIds,
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching bookmarks.',
      error: error.message,
    });
  }
}
