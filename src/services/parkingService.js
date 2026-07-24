/**
 * @file parkingService.js
 * @description Real-time parking lot and spot management services,
 *              including spot status updates and availability management.
 */

import firestore from '@react-native-firebase/firestore';
import { LOTS, MOCK_SPOTS } from '../utils/mockData';

/** Subscribes to real-time updates for all parking lots. */
export const subscribeToLots = (callback) => {
  try {
    return firestore()
      .collection('lots')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const lots = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            callback(lots);
          } else {
            callback(LOTS);
          }
        },
        () => { callback(LOTS); }
      );
  } catch (error) {
    callback(LOTS);
    return () => {};
  }
};

/** Fetches a single parking lot by its ID. */
export const getLotById = async (lotId) => {
  try {
    const doc = await firestore().collection('lots').doc(lotId).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
    return LOTS.find((lot) => lot.id === lotId) || null;
  } catch (error) {
    return LOTS.find((lot) => lot.id === lotId) || null;
  }
};

/** Subscribes to real-time updates for a single parking lot's details. */
export const subscribeLotDetail = (lotId, callback) => {
  try {
    return firestore()
      .collection('lots')
      .doc(lotId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            callback({ id: doc.id, ...doc.data() });
          } else {
            const mock = LOTS.find((lot) => lot.id === lotId);
            if (mock) callback(mock);
          }
        },
        () => {
          const mock = LOTS.find((lot) => lot.id === lotId);
          if (mock) callback(mock);
        }
      );
  } catch (error) {
    const mock = LOTS.find((lot) => lot.id === lotId);
    if (mock) callback(mock);
    return () => {};
  }
};

/**
 * Subscribes to real-time spot updates for a lot's spots subcollection.
 * Falls back to mock data if Firestore is unavailable.
 */
export const subscribeToSpots = (lotId, callback) => {
  try {
    return firestore()
      .collection('lots')
      .doc(lotId)
      .collection('spots')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const spots = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            callback(spots);
          } else {
            callback(MOCK_SPOTS[lotId] || []);
          }
        },
        () => { callback(MOCK_SPOTS[lotId] || []); }
      );
  } catch (error) {
    callback(MOCK_SPOTS[lotId] || []);
    return () => {};
  }
};

/**
 * Updates the status of a single spot in Firestore.
 * @param {string} lotId - The parking lot document ID.
 * @param {string} spotId - The spot document ID within the lot's spots subcollection.
 * @param {string} status - New status: 'available' | 'occupied' | 'reserved'.
 */
export const updateSpotStatus = async (lotId, spotId, status) => {
  try {
    await firestore()
      .collection('lots')
      .doc(lotId)
      .collection('spots')
      .doc(spotId)
      .update({
        status,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    // Silently handle offline scenario — spot update will retry when connected
  }
};

/**
 * Marks a specific spot as available (convenience wrapper).
 * @param {string} lotId
 * @param {string} spotId
 */
export const markSpotAvailable = async (lotId, spotId) => {
  return updateSpotStatus(lotId, spotId, 'available');
};

/** Toggles favorite status for a parking lot. */
export const toggleFavorite = async (uid, lotId) => {
  try {
    const favRef = firestore()
      .collection('users')
      .doc(uid)
      .collection('favorites')
      .doc(lotId);
    const doc = await favRef.get();
    if (doc.exists) {
      await favRef.delete();
      return false;
    } else {
      await favRef.set({ favoritedAt: firestore.FieldValue.serverTimestamp() });
      return true;
    }
  } catch (error) {
    throw error;
  }
};

/** Checks if a parking lot is in the user's favorites list. */
export const isFavorited = async (uid, lotId) => {
  try {
    const doc = await firestore()
      .collection('users')
      .doc(uid)
      .collection('favorites')
      .doc(lotId)
      .get();
    return doc.exists;
  } catch (error) {
    return false;
  }
};

/** Fetches all lots (one-shot, non-realtime). */
export const getLots = async () => {
  try {
    const snapshot = await firestore().collection('lots').get();
    if (!snapshot.empty) return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return LOTS;
  } catch (error) {
    return LOTS;
  }
};

/** Alias for subscribeLotDetail (backwards compatibility). */
export const subscribeToLot = (lotId, callback) => subscribeLotDetail(lotId, callback);

/**
 * Filters parking lots within a maximum radius using the Haversine formula.
 * @param {Array} lots
 * @param {number} userLat
 * @param {number} userLng
 * @param {number} maxRadiusKm
 * @returns {Array} Filtered lots sorted by proximity
 */
export const filterLotsByDistance = (lots = [], userLat, userLng, maxRadiusKm = 5) => {
  const toRad = (value) => (value * Math.PI) / 180;
  return lots
    .map((lot) => {
      if (!lot.latitude || !lot.longitude) return { ...lot, distanceKm: 999 };
      const dLat = toRad(lot.latitude - userLat);
      const dLon = toRad(lot.longitude - userLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(userLat)) *
          Math.cos(toRad(lot.latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...lot, distanceKm: Number((6371 * c).toFixed(2)) };
    })
    .filter((lot) => lot.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
};
