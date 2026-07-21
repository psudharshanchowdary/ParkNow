/**
 * @file coinsService.js
 * @description ParkCoins balance tracking, deduction, and rewards service.
 */

import firestore from '@react-native-firebase/firestore';

/** Local memory store for user coins during fallback mode. */
const mockUserCoins = {
  temp_user_id: 120,
};

/** Gets a user's current ParkCoins balance. */
export const getCoinBalance = async (uid) => {
  try {
    const doc = await firestore().collection('users').doc(uid).get();
    if (doc.exists && doc.data()?.parkCoins !== undefined) {
      return doc.data().parkCoins;
    }
    return mockUserCoins[uid] !== undefined ? mockUserCoins[uid] : 120;
  } catch (error) {
    return mockUserCoins[uid] !== undefined ? mockUserCoins[uid] : 120;
  }
};

/** Deducts ParkCoins from user balance after redemption. */
export const deductCoins = async (uid, amount) => {
  try {
    const userRef = firestore().collection('users').doc(uid);
    await userRef.update({
      parkCoins: firestore.FieldValue.increment(-amount),
    });
  } catch (error) {
    const current = mockUserCoins[uid] || 120;
    mockUserCoins[uid] = Math.max(0, current - amount);
  }
};

/** Adds ParkCoins as a reward to user balance and records transaction. */
export const addCoins = async (uid, amount, reason = 'Booking Reward') => {
  try {
    const userRef = firestore().collection('users').doc(uid);
    await userRef.update({
      parkCoins: firestore.FieldValue.increment(amount),
    });
    await firestore().collection('coinTransactions').add({
      userId: uid,
      amount,
      reason,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const current = mockUserCoins[uid] || 120;
    mockUserCoins[uid] = current + amount;
  }
};

/** Backwards compatibility alias for getCoinBalance. */
export const getUserCoins = async (uid) => {
  return getCoinBalance(uid);
};

/** Placeholder for report rewards. */
export const rewardCoinsForReport = async (uid) => {
  return addCoins(uid, 10, 'Community Report Reward');
};

/** Placeholder for booking redemption. */
export const redeemCoinsForBooking = async (uid, amount) => {
  return deductCoins(uid, amount);
};
