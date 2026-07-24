/**
 * @file bookingService.js
 * @description Firestore booking and order management services with real-time
 *              subscriptions, QR verification, and mock fallback support.
 */

import firestore from '@react-native-firebase/firestore';
import { BOOKINGS } from '../utils/mockData';

/** In-memory mock storage for orders and bookings during offline/mock operations. */
const mockOrders = {};
const mockBookings = {};

/** Mock lot data for offline fallback. */
const MOCK_LOT_DATA = {
  lot_001: { id: 'lot_001', name: 'City Centre Mall', latitude: 12.9725, longitude: 77.5930 },
  lot_002: { id: 'lot_002', name: 'Express Market', latitude: 12.9680, longitude: 77.5980 },
  lot_003: { id: 'lot_003', name: 'Brigade Plaza Lot', latitude: 12.9800, longitude: 77.5850 },
  lot_004: { id: 'lot_004', name: 'Commercial Street', latitude: 12.9820, longitude: 77.6080 },
  lot_005: { id: 'lot_005', name: 'Phoenix Market Lot C', latitude: 12.9960, longitude: 77.6960 },
};

/** Returns today's midnight as a Date object. */
const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Creates a pending order before payment processing. */
export const createOrder = async (orderData) => {
  try {
    const docRef = await firestore().collection('orders').add({
      ...orderData,
      status: 'pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    const mockId = `ord_mock_${Date.now()}`;
    mockOrders[mockId] = { ...orderData, id: mockId, status: 'pending' };
    return mockId;
  }
};

/** Updates the status of an order (e.g. 'completed' or 'failed'). */
export const updateOrderStatus = async (orderId, status) => {
  try {
    await firestore().collection('orders').doc(orderId).update({
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (mockOrders[orderId]) mockOrders[orderId].status = status;
  }
};

/** Creates a confirmed booking document after successful payment. */
export const createBooking = async (bookingData) => {
  try {
    const docRef = await firestore().collection('bookings').add({
      ...bookingData,
      status: 'confirmed',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    const mockId = `bk_mock_${Date.now()}`;
    mockBookings[mockId] = { ...bookingData, id: mockId, status: 'confirmed' };
    return mockId;
  }
};

/** Fetches a single booking document by ID. */
export const getBookingById = async (bookingId) => {
  try {
    const doc = await firestore().collection('bookings').doc(bookingId).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
    return mockBookings[bookingId] || null;
  } catch (error) {
    return mockBookings[bookingId] || null;
  }
};

/**
 * Fetches a booking and joins its associated lot coordinates.
 * Returns a merged object needed for QR ticket and navigation screens.
 */
export const getBookingWithLotDetails = async (bookingId) => {
  try {
    let booking = null;
    const bookingDoc = await firestore().collection('bookings').doc(bookingId).get();
    if (bookingDoc.exists) {
      booking = { id: bookingDoc.id, ...bookingDoc.data() };
    } else {
      booking = mockBookings[bookingId] || null;
    }
    if (!booking) return null;

    let lot = MOCK_LOT_DATA[booking.lotId] || null;
    try {
      const lotDoc = await firestore().collection('lots').doc(booking.lotId).get();
      if (lotDoc.exists) lot = { id: lotDoc.id, ...lotDoc.data() };
    } catch (_e) {}

    return {
      ...booking,
      lotLat: lot?.latitude ?? 12.9716,
      lotLng: lot?.longitude ?? 77.5946,
    };
  } catch (error) {
    const booking = mockBookings[bookingId] || null;
    if (!booking) return null;
    const lot = MOCK_LOT_DATA[booking.lotId] || {};
    return { ...booking, lotLat: lot.latitude ?? 12.9716, lotLng: lot.longitude ?? 77.5946 };
  }
};

/**
 * Verifies a booking for QR scan entry at a specific lot.
 * Runs all 4 validation checks: exists, confirmed, correct lot, not expired.
 * @param {string} bookingId - The booking document ID from the QR code.
 * @param {string} adminLotId - The lot ID the admin manages.
 * @returns {{ valid: boolean, booking: object|null, error: string|null }}
 */
export const verifyBookingQR = async (bookingId, adminLotId) => {
  try {
    const doc = await firestore().collection('bookings').doc(bookingId).get();

    // 1. Check exists
    if (!doc.exists) {
      const mock = mockBookings[bookingId];
      if (!mock) return { valid: false, booking: null, error: 'not_found' };
    }

    const booking = doc.exists ? { id: doc.id, ...doc.data() } : mockBookings[bookingId];

    // 2. Check status
    if (booking.status === 'cancelled') {
      return { valid: false, booking, error: 'cancelled' };
    }
    if (booking.status === 'active' || booking.status === 'completed') {
      return { valid: false, booking, error: 'already_used' };
    }
    if (booking.status !== 'confirmed') {
      return { valid: false, booking, error: 'invalid_qr' };
    }

    // 3. Check correct lot
    if (adminLotId && booking.lotId && booking.lotId !== adminLotId) {
      return { valid: false, booking, error: 'wrong_lot' };
    }

    // 4. Check not expired
    const startH = booking.startHour ?? 9;
    const startMs = booking.date
      ? new Date(booking.date).setHours(startH, 0, 0, 0)
      : Date.now();
    const endMs = startMs + (booking.duration || 1) * 3600 * 1000;
    if (endMs < Date.now()) {
      return { valid: false, booking, error: 'expired' };
    }

    return { valid: true, booking, error: null };
  } catch (_e) {
    return { valid: false, booking: null, error: 'invalid_qr' };
  }
};

/**
 * Marks a booking as active (driver has entered the lot) and updates the spot.
 * @param {string} bookingId - The booking document ID.
 * @param {string} spotId - The spot document ID to mark occupied.
 * @param {string} lotId - The lot document ID.
 */
export const confirmBookingEntry = async (bookingId, spotId, lotId) => {
  try {
    const batch = firestore().batch();

    const bookingRef = firestore().collection('bookings').doc(bookingId);
    batch.update(bookingRef, {
      status: 'active',
      entryTime: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    if (spotId && lotId) {
      const spotRef = firestore()
        .collection('lots')
        .doc(lotId)
        .collection('spots')
        .doc(spotId);
      batch.update(spotRef, {
        status: 'occupied',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (_e) {
    // Fallback for offline: update mock booking
    if (mockBookings[bookingId]) {
      mockBookings[bookingId].status = 'active';
    }
  }
};

/**
 * Subscribes to real-time booking updates for a specific user.
 * Returns an unsubscribe function.
 */
export const subscribeUserBookings = (uid, callback) => {
  try {
    const unsubscribe = firestore()
      .collection('bookings')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          } else {
            callback(Object.values(mockBookings).filter((b) => b.userId === uid));
          }
        },
        (_err) => {
          callback(Object.values(mockBookings).filter((b) => b.userId === uid));
        }
      );
    return unsubscribe;
  } catch (error) {
    callback(Object.values(mockBookings).filter((b) => b.userId === uid));
    return () => {};
  }
};

/**
 * Subscribes to today's bookings for a specific lot.
 * Returns an unsubscribe function.
 */
export const subscribeLotBookingsToday = (lotId, callback) => {
  try {
    const midnight = todayMidnight();
    const unsubscribe = firestore()
      .collection('bookings')
      .where('lotId', '==', lotId)
      .where('createdAt', '>=', midnight)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          } else {
            callback([]);
          }
        },
        (_err) => { callback([]); }
      );
    return unsubscribe;
  } catch (error) {
    callback([]);
    return () => {};
  }
};

/**
 * Fetches the most recent N bookings for a specific lot (one-shot).
 * @param {string} lotId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getRecentLotBookings = async (lotId, limit = 5) => {
  try {
    const snapshot = await firestore()
      .collection('bookings')
      .where('lotId', '==', lotId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    if (!snapshot.empty) return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return [];
  } catch (error) {
    return [];
  }
};

/** Fetches all bookings for a user (one-shot). */
export const getBookings = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection('bookings')
      .where('userId', '==', userId)
      .get();
    if (!snapshot.empty) return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return Object.values(mockBookings).filter((b) => b.userId === userId);
  } catch (error) {
    return Object.values(mockBookings).filter((b) => b.userId === userId);
  }
};

/** Cancels a booking by updating its status to 'cancelled'. */
export const cancelBooking = async (bookingId) => {
  try {
    await firestore().collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (mockBookings[bookingId]) mockBookings[bookingId].status = 'cancelled';
  }
};
