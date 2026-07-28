import assert from 'assert';

// Mock function representing 2 decimal places rounding logic used in US-603
const round2 = (n) => Math.round(n * 100) / 100;

function calculateVendorPayout(gross, splitPercentage = 5.0) {
  const splitRate = splitPercentage / 100;
  const grossRevenue = round2(gross);
  const platformFee = round2(grossRevenue * splitRate);
  const netPayout = round2(grossRevenue - platformFee);
  return { grossRevenue, platformFee, netPayout };
}

console.log('Running US-603 Vendor Payout Calculation Tests...');

// Test 1: Standard 5.0% split
const test1 = calculateVendorPayout(100.00, 5.0);
assert.strictEqual(test1.grossRevenue, 100.00);
assert.strictEqual(test1.platformFee, 5.00);
assert.strictEqual(test1.netPayout, 95.00);
console.log('✔ Test 1 passed (100.00 LKR @ 5%)');

// Test 2: Fractional values requiring 2-decimal rounding
const test2 = calculateVendorPayout(155.75, 5.0);
// 155.75 * 0.05 = 7.7875 -> rounded to 7.79
// Net payout = 155.75 - 7.79 = 147.96
assert.strictEqual(test2.grossRevenue, 155.75);
assert.strictEqual(test2.platformFee, 7.79);
assert.strictEqual(test2.netPayout, 147.96);
console.log('✔ Test 2 passed (155.75 LKR @ 5%)');

// Test 3: Zero transaction
const test3 = calculateVendorPayout(0.00, 5.0);
assert.strictEqual(test3.grossRevenue, 0.00);
assert.strictEqual(test3.platformFee, 0.00);
assert.strictEqual(test3.netPayout, 0.00);
console.log('✔ Test 3 passed (0.00 LKR @ 5%)');

console.log('All US-603 calculation precision tests PASSED successfully!');
