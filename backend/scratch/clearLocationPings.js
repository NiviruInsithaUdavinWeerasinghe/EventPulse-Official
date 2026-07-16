import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import LocationPing from '../models/LocationPing.js';

dotenv.config();

async function clear() {
  try {
    await connectDB();
    console.log('Clearing all location pings from database...');
    const result = await LocationPing.deleteMany({});
    console.log(`Successfully cleared all ${result.deletedCount} location pings.`);
    process.exit(0);
  } catch (error) {
    console.error('Error clearing location pings:', error);
    process.exit(1);
  }
}

clear();
