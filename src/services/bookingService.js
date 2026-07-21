/**
 * @file bookingService.js
 * @description Firestore booking and order management services with mock fallback support.
 */

import firestore from '@react-native-firebase/firestore';

/** In-memory mock storage for orders and bookings during offline/mock operations. */
const mockOrders = {};
const mockBookings = {};

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
    mockOrders[mockId] = {
      ...orderData,
      id: mockId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
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
    if (mockOrders[orderId]) {
      mockOrders[orderId].status = status;
    }
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
    mockBookings[mockId] = {
      ...bookingData,
      id: mockId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    return mockId;
  }
};

/** Fetches a single booking document by ID. */
export const getBookingById = async (bookingId) => {
  try {
    const doc = await firestore().collection('bookings').doc(bookingId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return mockBookings[bookingId] || null;
  } catch (error) {
    return mockBookings[bookingId] || null;
  }
};

/** Fetches all bookings for a user. */
export const getBookings = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection('bookings')
      .where('userId', '==', userId)
      .get();
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return Object.values(mockBookings).filter((b) => b.userId === userId);
  } catch (error) {
    return Object.values(mockBookings).filter((b) => b.userId === userId);
  }
};

/** Cancels a booking. */
export const cancelBooking = async (bookingId) => {
  try {
    await firestore().collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (mockBookings[bookingId]) {
      mockBookings[bookingId].status = 'cancelled';
    }
  }
};
