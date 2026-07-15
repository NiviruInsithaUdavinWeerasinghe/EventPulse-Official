import admin from 'firebase-admin';

let isFcmInitialized = false;

/**
 * Initializes the Firebase Admin SDK.
 * Checks for process.env.FIREBASE_SERVICE_ACCOUNT (either JSON string or filepath).
 * Falls back to simulated delivery if credentials are not configured.
 */
export const initFCM = () => {
  if (isFcmInitialized) return;

  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch {
        // If not JSON string, assume it's a file path
        serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isFcmInitialized = true;
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.log('[FCM Service] FIREBASE_SERVICE_ACCOUNT environment variable not found. Running in SIMULATOR fallback mode.');
    }
  } catch (error) {
    console.error('[FCM Service Error] Failed to initialize Firebase Admin SDK:', error.message);
  }
};

/**
 * Sends a push notification payload.
 * If credentials are not present, logs the payload to the terminal and returns a simulated status.
 */
export const sendFcmNotification = async (fcmToken, title, body) => {
  initFCM();

  const payload = {
    notification: {
      title: title,
      body: body
    },
    token: fcmToken
  };

  console.log(`[FCM Engine Log] Constructing FCM payload:\n${JSON.stringify(payload, null, 2)}`);

  if (!isFcmInitialized) {
    console.log(`[FCM Simulator Delivery] Logged and delivered notification to device token: ${fcmToken}`);
    return { success: true, simulated: true };
  }

  try {
    const response = await admin.messaging().send(payload);
    console.log('[FCM Engine] Successfully sent FCM message:', response);
    return { success: true, response };
  } catch (error) {
    console.error('[FCM Engine Error] Error sending FCM message:', error);
    return { success: false, error: error.message };
  }
};
