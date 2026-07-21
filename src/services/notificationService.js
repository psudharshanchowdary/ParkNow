import messaging from '@react-native-firebase/messaging';

/**
 * Request FCM push notification permission from user.
 * @returns {Promise<boolean>} Permission granted
 */
export const requestNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
};

/**
 * Get device FCM token for targeted push notifications.
 * @returns {Promise<string>} Device FCM Token
 */
export const getDeviceToken = async () => {
  const token = await messaging().getToken();
  return token;
};

/**
 * Subscribe to real-time parking spot status update topic.
 * @param {string} spotId 
 */
export const subscribeToSpotAlerts = async (spotId) => {
  await messaging().subscribeToTopic(`spot_${spotId}`);
};
