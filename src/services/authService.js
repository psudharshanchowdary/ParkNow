/**
 * @file authService.js
 * @description Firebase Authentication and Firestore user services.
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/** Sends an OTP to the given phone number. */
export const sendOTP = async (phoneNumber) => {
  try {
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    return confirmation;
  } catch (error) {
    throw error;
  }
};

/** Verifies the confirmation code (OTP). */
export const verifyOTP = async (confirmationResult, code) => {
  try {
    const userCredential = await confirmationResult.confirm(code);
    return userCredential;
  } catch (error) {
    throw error;
  }
};

/** Creates a driver user document in Firestore if it doesn't already exist. */
export const createUserIfNotExists = async (uid, phoneNumber) => {
  try {
    const userRef = firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      const newUser = {
        role: 'driver',
        parkCoins: 50,
        phoneNumber,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(newUser);
      return newUser;
    }
    return userDoc.data();
  } catch (error) {
    throw error;
  }
};

/** Returns the currently signed-in Firebase user. */
export const getCurrentUser = () => {
  try {
    return auth().currentUser;
  } catch (error) {
    return null;
  }
};

/** Sign in with Google (Placeholder for Week 2). */
export const signInWithGoogle = async () => {
  try {
    // TODO: implement in Week 2
  } catch (error) {
    throw error;
  }
};

/** Signs out the current user. */
export const signOut = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    throw error;
  }
};

/** Retrieves user profile from Firestore. */
export const getUserProfile = async (uid) => {
  try {
    const doc = await firestore().collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    throw error;
  }
};
