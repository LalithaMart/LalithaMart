// Firebase Cloud Messaging (FCM) Utility
// In a production environment, you would initialize firebase-admin here
// import admin from 'firebase-admin';

/* 
// Example Firebase Admin Initialization
const serviceAccount = require('../firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
*/

/**
 * Sends a push notification using Firebase Cloud Messaging.
 * This is a mocked wrapper that can be easily replaced with actual firebase-admin code.
 * 
 * @param {Array<String>} tokens - Array of FCM device tokens
 * @param {Object} payload - Notification payload { title, body, data, link }
 */
export const sendPushNotification = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) {
    return;
  }

  // Formatting payload for FCM
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      link: payload.link || '/',
      ...payload.data
    }
  };

  try {
    // MOCK: Console logging the push notification instead of sending
    console.log(`\n--- 🔔 PUSH NOTIFICATION SIMULATION ---`);
    console.log(`To Tokens: ${tokens.join(', ')}`);
    console.log(`Title: ${message.notification.title}`);
    console.log(`Body: ${message.notification.body}`);
    console.log(`Data Link: ${message.data.link}`);
    console.log(`---------------------------------------\n`);

    /* 
    // ACTUAL IMPLEMENTATION (Uncomment when Firebase is setup):
    const response = await admin.messaging().sendMulticast({
      tokens: tokens,
      notification: message.notification,
      data: message.data,
    });
    console.log(response.successCount + ' messages were sent successfully');
    */
    
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};
