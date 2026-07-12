/**
 * @file parkingService.js
 * @description Real-time parking lot and spot management services.
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
            const lots = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            callback(lots);
          } else {
            callback(LOTS);
          }
        },
        () => {
          callback(LOTS);
        }
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
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
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

/** Subscribes to real-time spot updates for a lot. */
export const subscribeToSpots = (lotId, callback) => {
  try {
    return firestore()
      .collection('lots')
      .doc(lotId)
      .collection('spots')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const spots = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            callback(spots);
          } else {
            callback(MOCK_SPOTS[lotId] || []);
          }
        },
        () => {
          callback(MOCK_SPOTS[lotId] || []);
        }
      );
  } catch (error) {
    callback(MOCK_SPOTS[lotId] || []);
    return () => {};
  }
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
      await favRef.set({
        favoritedAt: firestore.FieldValue.serverTimestamp(),
      });
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

/** Placeholder for direct non-realtime get (for backwards compatibility). */
export const getLots = async () => {
  try {
    const snapshot = await firestore().collection('lots').get();
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return LOTS;
  } catch (error) {
    return LOTS;
  }
};

/** Placeholder for single lot subscriber (for backwards compatibility). */
export const subscribeToLot = (lotId, callback) => {
  return subscribeLotDetail(lotId, callback);
};
