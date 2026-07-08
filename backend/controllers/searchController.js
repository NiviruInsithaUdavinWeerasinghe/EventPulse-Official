import Event from '../models/Event.js';

// GET /api/events/:id/search?q=query&category=category
// EP-28: Backend search API to query stall titles, stall IDs, and product tags
export const searchEventZones = async (req, res) => {
  try {
    const { id } = req.params;
    const { q = '', category = '' } = req.query;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    let zones = event.zones || [];

    // Filter by search query (matches id, name, category, tags)
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      zones = zones.filter(zone =>
        zone.id?.toLowerCase().includes(query) ||
        zone.name?.toLowerCase().includes(query) ||
        zone.category?.toLowerCase().includes(query) ||
        (zone.tags && zone.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Filter by category pill
    if (category.trim() && category !== 'All') {
      zones = zones.filter(zone =>
        zone.category?.toLowerCase() === category.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: zones.length,
      data: zones,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
