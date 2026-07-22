/**
 * @file coinsService.js
 * @description ParkCoins balance tracking, deduction, rewards, history, and stats service.
 */

import firestore from '@react-native-firebase/firestore';
import { COIN_TRANSACTIONS } from '../utils/mockData';

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
    await firestore().collection('coinTransactions').add({
      userId: uid,
      amount,
      type: 'spend',
      reason: 'payment_discount',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const current = mockUserCoins[uid] || 120;
    mockUserCoins[uid] = Math.max(0, current - amount);
  }
};

/** Adds ParkCoins as a reward to user balance and records transaction. */
export const addCoins = async (uid, amount, reason = 'booking_reward') => {
  try {
    const userRef = firestore().collection('users').doc(uid);
    await userRef.update({
      parkCoins: firestore.FieldValue.increment(amount),
    });
    await firestore().collection('coinTransactions').add({
      userId: uid,
      amount,
      type: 'earn',
      reason,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const current = mockUserCoins[uid] || 120;
    mockUserCoins[uid] = current + amount;
  }
};

/**
 * Subscribes to real-time coin transaction history for a user.
 * Returns an unsubscribe function for cleanup.
 */
export const subscribeCoinHistory = (uid, callback) => {
  try {
    const unsubscribe = firestore()
      .collection('coinTransactions')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const txns = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            callback(txns);
          } else {
            callback(COIN_TRANSACTIONS.filter((t) => t.userId === uid));
          }
        },
        (_err) => {
          callback(COIN_TRANSACTIONS.filter((t) => t.userId === uid));
        }
      );
    return unsubscribe;
  } catch (error) {
    callback(COIN_TRANSACTIONS.filter((t) => t.userId === uid));
    return () => {};
  }
};

/**
 * Fetches summarised coin stats for a user.
 * Returns { balance, totalEarned, totalSpent }.
 */
export const getCoinStats = async (uid) => {
  try {
    const [userDoc, txnSnapshot] = await Promise.all([
      firestore().collection('users').doc(uid).get(),
      firestore()
        .collection('coinTransactions')
        .where('userId', '==', uid)
        .get(),
    ]);

    const balance =
      userDoc.exists && userDoc.data()?.parkCoins !== undefined
        ? userDoc.data().parkCoins
        : mockUserCoins[uid] || 120;

    let totalEarned = 0;
    let totalSpent = 0;

    if (!txnSnapshot.empty) {
      txnSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'earn') totalEarned += data.amount || 0;
        if (data.type === 'spend') totalSpent += data.amount || 0;
      });
    } else {
      COIN_TRANSACTIONS.filter((t) => t.userId === uid).forEach((t) => {
        if (t.type === 'earn') totalEarned += t.amount || 0;
        if (t.type === 'spend') totalSpent += t.amount || 0;
      });
    }

    return { balance, totalEarned, totalSpent };
  } catch (error) {
    const mockTxns = COIN_TRANSACTIONS.filter((t) => t.userId === uid);
    let totalEarned = 0;
    let totalSpent = 0;
    mockTxns.forEach((t) => {
      if (t.type === 'earn') totalEarned += t.amount || 0;
      if (t.type === 'spend') totalSpent += t.amount || 0;
    });
    return {
      balance: mockUserCoins[uid] || 120,
      totalEarned,
      totalSpent,
    };
  }
};

/** Backwards compatibility alias for getCoinBalance. */
export const getUserCoins = async (uid) => {
  return getCoinBalance(uid);
};

/** Rewards coins for a community parking spot report. */
export const rewardCoinsForReport = async (uid) => {
  return addCoins(uid, 10, 'community_report');
};

/** Redeems coins against a booking payment. */
export const redeemCoinsForBooking = async (uid, amount) => {
  return deductCoins(uid, amount);
};
