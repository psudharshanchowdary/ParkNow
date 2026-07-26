// Built Day 18
/**
 * @file notificationService.js
 * @description Push notification service for ParkNow.
 *              Handles FCM token management, foreground/background handlers,
 *              notification-tap navigation, and scheduled local reminders.
 *
 * TODO (Backend team): Community spot nearby notifications must be
 * triggered from a Firebase Cloud Function — NOT from the client —
 * because the server needs to query nearby users and batch-send via FCM.
 *
 * TODO (Backend team): Admin new-booking alert should originate from a
 * Cloud Function triggered by Firestore onCreate on /bookings/{id}.
 */

import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

// Notifee is loaded lazily so the module still works if it is not yet linked
let notifee = null;
let AndroidImportance = null;
let AndroidColor = null;
let TriggerType = null;
try {
  const n = require('@notifee/react-native');
  notifee = n.default;
  AndroidImportance = n.AndroidImportance;
  AndroidColor = n.AndroidColor;
  TriggerType = n.TriggerType;
} catch (_e) {
  // Notifee not yet linked — local notifications will be skipped gracefully
}

/** Default notification channel ID used across the app. */
const CHANNEL_ID = 'parknow_default';

/**
 * Creates the Android notification channel required for Android 8.0+.
 * Safe to call multiple times — Notifee is idempotent on existing channels.
 */
export const createNotificationChannel = async () => {
  if (!notifee || !AndroidImportance) return;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'ParkNow Notifications',
      importance: AndroidImportance.HIGH,
      vibration: true,
      lights: true,
      lightColor: AndroidColor?.PURPLE ?? '#7C3AED',
      sound: 'default',
    });
  } catch (_e) {}
};

/**
 * Requests notification permission from the OS.
 * On iOS shows the system prompt; on Android 13+ requests POST_NOTIFICATIONS.
 * @returns {Promise<boolean>} True if permission was granted.
 */
export const requestPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (_e) {
    return false;
  }
};

/**
 * Retrieves the FCM device token and saves it to Firestore.
 * Must be called after the user is authenticated.
 * @param {string} uid - Authenticated user UID.
 * @returns {Promise<string|null>}
 */
export const getFCMToken = async (uid) => {
  try {
    const token = await messaging().getToken();
    if (token && uid) {
      await firestore().collection('users').doc(uid).update({
        fcmToken: token,
        fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
    return token;
  } catch (_e) {
    return null;
  }
};

/**
 * Displays a local notification immediately using Notifee.
 * @param {string} title
 * @param {string} body
 * @param {Object} data - Custom key-value payload forwarded to tap handler.
 */
const showLocalNotification = async (title, body, data = {}) => {
  if (!notifee) return;
  try {
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        color: '#7C3AED',
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: { alert: true, badge: true, sound: true },
      },
    });
  } catch (_e) {}
};

/**
 * Sets up the foreground message handler.
 * FCM messages received while the app is in the foreground are shown via Notifee.
 * Call once on app start inside a useEffect in App.js.
 * @returns {Function} Unsubscribe function — call on cleanup.
 */
export const setupForegroundHandler = () => {
  try {
    return messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? 'ParkNow';
      const body = remoteMessage.notification?.body ?? '';
      await showLocalNotification(title, body, remoteMessage.data ?? {});
    });
  } catch (_e) {
    return () => {};
  }
};

/**
 * Registers the background / quit-state message handler.
 * MUST be called at module level — outside any React component —
 * before AppRegistry.registerComponent in index.js.
 */
export const setupBackgroundHandler = () => {
  try {
    messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
      // FCM handles background display automatically via the notification payload.
      // TODO: Add analytics event here once the analytics service is ready.
    });
  } catch (_e) {}
};

/**
 * Routes a notification data payload to the correct React Navigation screen.
 * @param {Object} navigation - RN navigation object.
 * @param {Object} data - remoteMessage.data from FCM.
 */
const routeNotification = (navigation, data) => {
  if (!navigation || !data) return;
  const { screen, bookingId, lotId } = data;
  switch (screen) {
    case 'QRTicket':
      navigation.navigate('QRTicket', { bookingId });
      break;
    case 'Navigation':
      navigation.navigate('NavigationScreen', { bookingId });
      break;
    case 'LotDetail':
      navigation.navigate('LotDetailScreen', { lotId });
      break;
    case 'ParkCoinsWallet':
      navigation.navigate('ParkCoinsWallet');
      break;
    case 'AdminDashboard':
      navigation.navigate('AdminDashboard');
      break;
    default:
      break;
  }
};

/**
 * Sets up notification-tap navigation handlers for background and quit states.
 * Call inside NavigationContainer after navigation ref is ready.
 * @param {Object} navigation - React Navigation navigation object.
 */
export const setupNotificationOpenedHandler = (navigation) => {
  if (!navigation) return;

  // App in background — user tapped a notification
  try {
    messaging().onNotificationOpenedApp((remoteMessage) => {
      routeNotification(navigation, remoteMessage?.data);
    });
  } catch (_e) {}

  // App opened from quit state by tapping a notification
  try {
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          // Delay to let NavigationContainer finish mounting before navigating
          setTimeout(() => routeNotification(navigation, remoteMessage.data), 1000);
        }
      });
  } catch (_e) {}
};

/**
 * Schedules a local reminder notification 30 minutes before a booking's start time.
 * @param {Object} booking - Booking object: { id, date, startHour, spotLabel, lotName }
 * @returns {Promise<string|null>} Notifee trigger notification ID, or null if not scheduled.
 */
export const scheduleBookingReminder = async (booking) => {
  if (!notifee || !TriggerType) return null;
  try {
    const startDate = new Date(booking.date || Date.now());
    startDate.setHours(booking.startHour ?? 9, 0, 0, 0);
    const reminderTime = new Date(startDate.getTime() - 30 * 60 * 1000);

    if (reminderTime.getTime() <= Date.now()) return null;

    const triggerId = await notifee.createTriggerNotification(
      {
        title: 'Parking in 30 mins ⏰',
        body: `Head to ${booking.lotName ?? 'your lot'} for Spot ${booking.spotLabel ?? ''}. Tap to navigate.`,
        data: { type: 'booking_reminder', bookingId: booking.id ?? '', screen: 'Navigation' },
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_notification',
          color: '#7C3AED',
          pressAction: { id: 'default' },
        },
      },
      { type: TriggerType.TIMESTAMP, timestamp: reminderTime.getTime() }
    );

    // Persist triggerId so the reminder can be cancelled if booking is cancelled
    if (triggerId && booking.id) {
      await firestore()
        .collection('bookings')
        .doc(booking.id)
        .update({ reminderTriggerId: triggerId })
        .catch(() => {});
    }

    return triggerId;
  } catch (_e) {
    return null;
  }
};

/**
 * Cancels a previously scheduled trigger notification.
 * @param {string} triggerId - ID returned by scheduleBookingReminder.
 */
export const cancelNotification = async (triggerId) => {
  if (!notifee || !triggerId) return;
  try {
    await notifee.cancelTriggerNotification(triggerId);
  } catch (_e) {}
};
