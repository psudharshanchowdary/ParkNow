import Config from 'react-native-config';

export const ENV = {
  GOOGLE_MAPS_KEY: Config.GOOGLE_MAPS_API_KEY || 'your_key_here',
  RAZORPAY_KEY: Config.RAZORPAY_KEY_ID || 'your_key_here',
  FIREBASE_PROJECT: Config.FIREBASE_PROJECT_ID || 'your_project_id',
  IS_DEV: __DEV__,
};
