import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import ScavengerCode from '../models/ScavengerCode.js';
import ScannedCode from '../models/ScannedCode.js';
import { seedScavengerCodes } from '../routes/scavengerRoutes.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'eventpulse_secret';

async function runTests() {
  console.log('--- Starting Scavenger Hunt Automated Verification Suite ---');

  await connectDB();
  await seedScavengerCodes();

  // Cleanup test users and scan records
  await User.deleteMany({ email: { $in: ['test_hunter_1@eventpulse.com', 'test_hunter_2@eventpulse.com'] } });
  await ScannedCode.deleteMany({ qr_string: { $in: ['HUNT_ZONE_A_101', 'HUNT_VIP_LOUNGE_202', 'INVALID_CODE_999'] } });

  // Create Test User 1 & Test User 2
  const user1 = await User.create({
    fullName: 'Test Hunter One',
    email: 'test_hunter_1@eventpulse.com',
    phone: '0770000001',
    password: 'password123',
    role: 'customer',
    scavengerScore: 0,
  });

  const user2 = await User.create({
    fullName: 'Test Hunter Two',
    email: 'test_hunter_2@eventpulse.com',
    phone: '0770000002',
    password: 'password123',
    role: 'customer',
    scavengerScore: 0,
  });

  const token1 = jwt.sign({ id: user1._id, role: user1.role }, JWT_SECRET, { expiresIn: '1h' });
  const token2 = jwt.sign({ id: user2._id, role: user2.role }, JWT_SECRET, { expiresIn: '1h' });

  const BASE_URL = 'http://localhost:5000/api/scavenger';

  // TEST 1: 401 Unauthorized without JWT
  console.log('\n[TEST 1] Testing 401 Unauthorized without token...');
  const res1 = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr_string: 'HUNT_ZONE_A_101' }),
  });
  console.log(`STATUS: ${res1.status} (Expected: 401)`);
  const data1 = await res1.json();
  console.log(`RESPONSE:`, data1);
  if (res1.status !== 401) throw new Error('Test 1 failed: Expected 401 Unauthorized');

  // TEST 2: 404 Not Found for Invalid QR Code
  console.log('\n[TEST 2] Testing 404 Not Found for invalid QR code...');
  const res2 = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token1}`,
    },
    body: JSON.stringify({ qr_string: 'INVALID_CODE_999' }),
  });
  console.log(`STATUS: ${res2.status} (Expected: 404)`);
  const data2 = await res2.json();
  console.log(`RESPONSE:`, data2);
  if (res2.status !== 404 || data2.message !== 'Invalid QR Code') {
    throw new Error('Test 2 failed: Expected 404 Invalid QR Code');
  }

  // TEST 3: 200 Success for Valid Scan
  console.log('\n[TEST 3] Testing 200 Success for valid code scan...');
  const res3 = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token1}`,
    },
    body: JSON.stringify({ qr_string: 'HUNT_ZONE_A_101' }),
  });
  console.log(`STATUS: ${res3.status} (Expected: 200)`);
  const data3 = await res3.json();
  console.log(`RESPONSE:`, data3);
  if (res3.status !== 200 || !data3.success || data3.score !== 1) {
    throw new Error('Test 3 failed: Expected 200 Success with score = 1');
  }

  // TEST 4: 400 Bad Request Duplicate Scan Prevention ('Already Claimed')
  console.log('\n[TEST 4] Testing 400 Bad Request for duplicate scan...');
  const res4 = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token1}`,
    },
    body: JSON.stringify({ qr_string: 'HUNT_ZONE_A_101' }),
  });
  console.log(`STATUS: ${res4.status} (Expected: 400)`);
  const data4 = await res4.json();
  console.log(`RESPONSE:`, data4);
  if (res4.status !== 400 || data4.message !== 'Already Claimed') {
    throw new Error('Test 4 failed: Expected 400 Bad Request with "Already Claimed"');
  }

  // TEST 5: Concurrent Scans Deduplication
  console.log('\n[TEST 5] Testing Concurrent Scan Requests...');
  const concurrentReqs = Array.from({ length: 5 }).map(() =>
    fetch(`${BASE_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`,
      },
      body: JSON.stringify({ qr_string: 'HUNT_VIP_LOUNGE_202' }),
    }).then(async r => ({ status: r.status, data: await r.json() }))
  );

  const results = await Promise.all(concurrentReqs);
  const successCount = results.filter(r => r.status === 200).length;
  const duplicateCount = results.filter(r => r.status === 400 && r.data.message === 'Already Claimed').length;
  console.log(`Concurrent results: ${successCount} Success (200), ${duplicateCount} Duplicates (400)`);
  if (successCount !== 1 || duplicateCount !== 4) {
    throw new Error(`Test 5 failed: Expected exactly 1 success and 4 duplicate rejections. Got ${successCount} and ${duplicateCount}`);
  }

  // TEST 6: Multi-user Independent Claiming
  console.log('\n[TEST 6] Testing Multi-user Independent Claiming (User B claiming same code)...');
  const res6 = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token2}`,
    },
    body: JSON.stringify({ qr_string: 'HUNT_ZONE_A_101' }),
  });
  console.log(`STATUS: ${res6.status} (Expected: 200)`);
  const data6 = await res6.json();
  console.log(`RESPONSE:`, data6);
  if (res6.status !== 200 || !data6.success) {
    throw new Error('Test 6 failed: User B should be able to claim HUNT_ZONE_A_101 independently');
  }

  // TEST 7: Progress Dashboard Data Fetching
  console.log('\n[TEST 7] Testing GET /api/scavenger/progress...');
  const res7 = await fetch(`${BASE_URL}/progress`, {
    headers: { 'Authorization': `Bearer ${token1}` },
  });
  console.log(`STATUS: ${res7.status} (Expected: 200)`);
  const data7 = await res7.json();
  console.log(`PROGRESS RESPONSE:`, data7);
  if (res7.status !== 200 || data7.score !== 2 || data7.claimedCount !== 2) {
    throw new Error('Test 7 failed: User 1 should have score 2 and 2 claimed codes');
  }

  console.log('\n======================================================');
  console.log('✅ ALL TEST SUITES PASSED CLEANLY & empiriCALLY VERIFIED!');
  console.log('======================================================\n');

  // Cleanup
  await User.deleteMany({ email: { $in: ['test_hunter_1@eventpulse.com', 'test_hunter_2@eventpulse.com'] } });
  await ScannedCode.deleteMany({ qr_string: { $in: ['HUNT_ZONE_A_101', 'HUNT_VIP_LOUNGE_202', 'INVALID_CODE_999'] } });
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
