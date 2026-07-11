import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import PaymentToken from '../models/PaymentToken.js';
import WalletLedger from '../models/WalletLedger.js';
import { processPayHereNotification } from '../controllers/payhereController.js';
import { processVendorCheckout } from '../controllers/vendorController.js';



const MONGO_URI = process.env.MONGO_URI;
const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '1226194';
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET || 'MTEyNzE1MTU1MzQwMDMxNjkyNjcyMjc5NjMyNDEyMTM2Mjc1OTEwNg==';

process.env.PAYHERE_MERCHANT_ID = MERCHANT_ID;
process.env.PAYHERE_MERCHANT_SECRET = MERCHANT_SECRET;

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  let customer, vendor, wallet;

  try {
    // 1. Create mock Customer and Vendor
    const rand = Math.floor(Math.random() * 1000000);
    customer = await User.create({
      fullName: 'Test Customer',
      email: `customer${rand}@test.com`,
      phone: '0771234567',
      password: 'password123',
      role: 'customer',
    });

    vendor = await User.create({
      fullName: 'Test Vendor',
      email: `vendor${rand}@test.com`,
      phone: '0777654321',
      password: 'password123',
      role: 'vendor',
    });

    console.log(`Created test users:\nCustomer: ${customer._id}\nVendor: ${vendor._id}`);

    // 2. Simulate PayHere Webhook (deposit funds)
    console.log('\n--- Test 1: PayHere Webhook Deposit ---');
    const orderId = `TOPUP-${customer._id}-${Date.now()}`;
    const amount = '1500.00';
    const currency = 'LKR';
    const statusCode = '2'; // Success
    const paymentId = '123456789';

    // Generate MD5 signature
    const hashedSecret = crypto
      .createHash('md5')
      .update(MERCHANT_SECRET)
      .digest('hex')
      .toUpperCase();

    const md5sig = crypto
      .createHash('md5')
      .update(
        MERCHANT_ID +
        orderId +
        amount +
        currency +
        statusCode +
        hashedSecret
      )
      .digest('hex')
      .toUpperCase();

    const reqMock = {
      body: {
        merchant_id: MERCHANT_ID,
        order_id: orderId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        payment_id: paymentId,
        md5sig: md5sig,
      },
    };

    let resStatusCode = 0;
    let resBody = '';
    const resMock = {
      status: (code) => {
        resStatusCode = code;
        return {
          json: (data) => { resBody = JSON.stringify(data); },
          send: (data) => { resBody = data; }
        };
      },
      send: (data) => {
        resStatusCode = 200;
        resBody = data;
      }
    };

    await processPayHereNotification(reqMock, resMock);
    console.log(`Webhook response status: ${resStatusCode}, body: ${resBody}`);

    // Retrieve Wallet and check balance
    wallet = await Wallet.findOne({ user: customer._id });
    console.log(`Wallet Balance after Webhook: LKR ${wallet.balance.toString()}`);
    if (parseFloat(wallet.balance.toString()) === 1500.00) {
      console.log('✅ Test 1 Passed: Wallet successfully credited!');
    } else {
      console.error('❌ Test 1 Failed: Balance incorrect.');
    }

    // 3. Generate a PaymentToken
    console.log('\n--- Test 2: Vendor POS Checkout ---');
    const tokenString = crypto.randomBytes(32).toString('hex');
    const paymentToken = await PaymentToken.create({
      wallet: wallet._id,
      user: customer._id,
      token: tokenString,
      expiresAt: new Date(Date.now() + 60_000),
      status: 'Active',
    });

    const checkoutReqMock = {
      user: { id: vendor._id },
      body: {
        token: tokenString,
        amount: 350.50,
      },
    };

    let checkoutResCode = 0;
    let checkoutResBody = null;
    const checkoutResMock = {
      status: (code) => {
        checkoutResCode = code;
        return {
          json: (data) => { checkoutResBody = data; },
        };
      },
    };

    await processVendorCheckout(checkoutReqMock, checkoutResMock);
    console.log(`Checkout response status: ${checkoutResCode}, body:`, checkoutResBody);

    const updatedWallet = await Wallet.findOne({ user: customer._id });
    console.log(`Wallet Balance after Checkout: LKR ${updatedWallet.balance.toString()}`);
    if (checkoutResBody.success && parseFloat(updatedWallet.balance.toString()) === (1500.00 - 350.50)) {
      console.log('✅ Test 2 Passed: POS checkout successfully processed!');
    } else {
      console.error('❌ Test 2 Failed: Transaction error.');
    }

    // 4. Test Insufficient Balance
    console.log('\n--- Test 3: Insufficient Balance Check ---');
    const secondTokenString = crypto.randomBytes(32).toString('hex');
    await PaymentToken.create({
      wallet: wallet._id,
      user: customer._id,
      token: secondTokenString,
      expiresAt: new Date(Date.now() + 60_000),
      status: 'Active',
    });

    const overdrawReqMock = {
      user: { id: vendor._id },
      body: {
        token: secondTokenString,
        amount: 2000.00,
      },
    };

    let overdrawResCode = 0;
    let overdrawResBody = null;
    const overdrawResMock = {
      status: (code) => {
        overdrawResCode = code;
        return {
          json: (data) => { overdrawResBody = data; },
        };
      },
    };

    await processVendorCheckout(overdrawReqMock, overdrawResMock);
    console.log(`Overdraw response status: ${overdrawResCode}, message: "${overdrawResBody.message}"`);
    if (overdrawResCode === 400 && overdrawResBody.message === 'Insufficient Wallet Balance') {
      console.log('✅ Test 3 Passed: Insufficient balance rejected correctly!');
    } else {
      console.error('❌ Test 3 Failed: Overdraft was not rejected correctly.');
    }

  } catch (err) {
    console.error('An error occurred during tests:', err);
  } finally {
    // Cleanup
    console.log('\nCleaning up mock databases entries...');
    if (customer) {
      await User.deleteOne({ _id: customer._id });
      await Wallet.deleteOne({ user: customer._id });
      await PaymentToken.deleteMany({ user: customer._id });
      if (wallet) {
        await WalletLedger.deleteMany({ wallet: wallet._id });
      }
    }
    if (vendor) {
      await User.deleteOne({ _id: vendor._id });
    }
    await mongoose.disconnect();
    console.log('Disconnected and cleaned up.');
  }
}

runTests();
