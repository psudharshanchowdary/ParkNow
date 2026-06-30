/**
 * @file parkingService.js
 * @description Real-time parking lot management services.
 */

import firestore from '@react-native-firebase/firestore';
import { LOTS } from '../utils/mockData';

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

/** Placeholder for single lot subscriber. */
export const subscribeToLot = (lotId, callback) => {
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
