import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import LocationPing from '../models/LocationPing.js';
import connectDB from '../config/db.js';

dotenv.config();

async function seed() {
  try {
    await connectDB();

    // Fetch all events
    let events = await Event.find();
    if (events.length === 0) {
      console.log('No events found. Creating a dummy event first...');
      const dummyEvent = await Event.create({
        name: 'Tech Show Expo 2026',
        description: 'Annual technical conference and startup exhibition.',
        date: new Date(),
        bannerImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
        bannerPublicId: 'dummy_banner',
        floorMapUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
        floorMapPublicId: 'dummy_floormap',
        zones: []
      });
      events = [dummyEvent];
      console.log(`Dummy event created: ${dummyEvent.name} (${dummyEvent._id})`);
    }

    // Clear existing location pings
    await LocationPing.deleteMany({});
    console.log('Cleared all existing location pings.');

    // Generate dummy user IDs
    const userIds = Array.from({ length: 200 }, () => new mongoose.Types.ObjectId());
    const baseDate = new Date();
    baseDate.setMinutes(0);
    baseDate.setSeconds(0);
    baseDate.setMilliseconds(0);

    const allPings = [];

    for (const event of events) {
      console.log(`Generating pings for event: ${event.name} (${event._id})...`);
      
      // Generate a bell curve or typical traffic trend
      // Peak hours: 10:00 to 14:00 (10 AM to 2 PM) and 18:00 to 20:00 (6 PM to 8 PM)
      for (let hour = 0; hour < 24; hour++) {
        let trafficMultiplier = 0.1; // low baseline for midnight/early hours
        if (hour >= 8 && hour <= 21) {
          // daytime active hours
          if (hour >= 10 && hour <= 14) {
            trafficMultiplier = 0.85; // first peak
          } else if (hour >= 18 && hour <= 20) {
            trafficMultiplier = 0.95; // second peak (evening)
          } else {
            trafficMultiplier = 0.5; // regular daytime
          }
        }

        // Unique user count for this hour
        const numUsers = Math.floor((50 + Math.random() * 100) * trafficMultiplier);
        
        // Shuffle user list to choose a unique subset
        const shuffledUsers = [...userIds].sort(() => 0.5 - Math.random());
        const activeUsersThisHour = shuffledUsers.slice(0, numUsers);

        // Create a timestamp for this hour in the Asia/Colombo timezone
        const timestamp = new Date(baseDate);
        timestamp.setHours(hour);

        activeUsersThisHour.forEach(userId => {
          const numPingsForUser = Math.floor(1 + Math.random() * 3);
          for (let i = 0; i < numPingsForUser; i++) {
            allPings.push({
              eventId: event._id,
              userId,
              latitude: 6.9271 + (Math.random() - 0.5) * 0.01,
              longitude: 79.8612 + (Math.random() - 0.5) * 0.01,
              timestamp: new Date(timestamp.getTime() + Math.floor(Math.random() * 59 * 60 * 1000))
            });
          }
        });
      }
    }

    console.log(`Inserting ${allPings.length} location pings into the database...`);
    await LocationPing.insertMany(allPings);
    console.log('Database seeded successfully with location pings for all events!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding location pings:', error);
    process.exit(1);
  }
}

seed();
