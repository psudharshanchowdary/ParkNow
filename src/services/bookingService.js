/**
 * @file bookingService.js
 * @description Firestore booking and order management services with real-time
 *              subscriptions, QR verification, period revenue queries, and mock fallback.
 */

import firestore from '@react-native-firebase/firestore';

/** In-memory mock storage for offline/mock operations. */
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

/** Updates the status of an order. */
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

/** Fetches a booking and joins lot coordinates. */
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
 * @param {string} bookingId
 * @param {string} adminLotId
 * @returns {{ valid: boolean, booking: object|null, error: string|null }}
 */
export const verifyBookingQR = async (bookingId, adminLotId) => {
  try {
    const doc = await firestore().collection('bookings').doc(bookingId).get();
    if (!doc.exists) {
      const mock = mockBookings[bookingId];
      if (!mock) return { valid: false, booking: null, error: 'not_found' };
    }
    const booking = doc.exists ? { id: doc.id, ...doc.data() } : mockBookings[bookingId];

    if (booking.status === 'cancelled') return { valid: false, booking, error: 'cancelled' };
    if (booking.status === 'active' || booking.status === 'completed') {
      return { valid: false, booking, error: 'already_used' };
    }
    if (booking.status !== 'confirmed') return { valid: false, booking, error: 'invalid_qr' };
    if (adminLotId && booking.lotId && booking.lotId !== adminLotId) {
      return { valid: false, booking, error: 'wrong_lot' };
    }

    const startH = booking.startHour ?? 9;
    const startMs = booking.date
      ? new Date(booking.date).setHours(startH, 0, 0, 0)
      : Date.now();
    const endMs = startMs + (booking.duration || 1) * 3600 * 1000;
    if (endMs < Date.now()) return { valid: false, booking, error: 'expired' };

    return { valid: true, booking, error: null };
  } catch (_e) {
    return { valid: false, booking: null, error: 'invalid_qr' };
  }
};

/**
 * Marks a booking as active and updates the spot to occupied.
 * @param {string} bookingId
 * @param {string} spotId
 * @param {string} lotId
 */
export const confirmBookingEntry = async (bookingId, spotId, lotId) => {
  try {
    const batch = firestore().batch();
    batch.update(firestore().collection('bookings').doc(bookingId), {
      status: 'active',
      entryTime: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    if (spotId && lotId) {
      batch.update(
        firestore().collection('lots').doc(lotId).collection('spots').doc(spotId),
        { status: 'occupied', updatedAt: firestore.FieldValue.serverTimestamp() }
      );
    }
    await batch.commit();
  } catch (_e) {
    if (mockBookings[bookingId]) mockBookings[bookingId].status = 'active';
  }
};

/**
 * Fetches all bookings for a lot within a date range.
 * @param {string} lotId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array>}
 */
export const getBookingsByPeriod = async (lotId, startDate, endDate) => {
  try {
    const snap = await firestore()
      .collection('bookings')
      .where('lotId', '==', lotId)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'desc')
      .get();
    if (!snap.empty) return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return [];
  } catch (_e) {
    return [];
  }
};

/**
 * Returns aggregated revenue metrics for a lot within a date range.
 * @param {string} lotId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{ total: number, bookingsCount: number, byDay: Array, byHour: Array }>}
 */
export const getRevenueForPeriod = async (lotId, startDate, endDate) => {
  try {
    const bookings = await getBookingsByPeriod(lotId, startDate, endDate);
    const total = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const bookingsCount = bookings.length;

    // Group by day of week
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const hourMap = {};
    for (let h = 8; h <= 22; h++) hourMap[h] = 0;

    bookings.forEach((b) => {
      try {
        const ts = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || Date.now());
        const day = dayLabels[ts.getDay()];
        dayMap[day] = (dayMap[day] || 0) + (b.totalAmount || 0);
        const hr = ts.getHours();
        if (hr >= 8 && hr <= 22) hourMap[hr] = (hourMap[hr] || 0) + (b.totalAmount || 0);
      } catch (_e) {}
    });

    const byDay = dayLabels.map((label) => ({ label, revenue: dayMap[label] || 0 }));
    const byHour = Object.keys(hourMap).map((h) => ({
      label: `${parseInt(h, 10) > 12 ? parseInt(h, 10) - 12 : h}${parseInt(h, 10) >= 12 ? 'PM' : 'AM'}`,
      revenue: hourMap[h],
      hour: parseInt(h, 10),
    }));

    return { total, bookingsCount, byDay, byHour, bookings };
  } catch (_e) {
    return { total: 0, bookingsCount: 0, byDay: [], byHour: [], bookings: [] };
  }
};

/** Subscribes to real-time booking updates for a specific user. */
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

/** Subscribes to today's bookings for a specific lot. */
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
 * Fetches the most recent N bookings for a lot.
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
