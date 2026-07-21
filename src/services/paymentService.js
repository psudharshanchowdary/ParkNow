import RazorpayCheckout from 'react-native-razorpay';
import { deductCoins, awardCoins } from './coinsService';

/**
 * Process booking payment via Razorpay SDK with optional ParkCoins discount.
 * 
 * @param {Object} paymentData
 * @param {string} paymentData.bookingId - Unique booking identifier
 * @param {number} paymentData.amount - Total amount in INR
 * @param {number} paymentData.coinsToUse - ParkCoins redeemed
 * @param {Object} paymentData.userInfo - User name and email
 * @returns {Promise<Object>} Razorpay payment response
 */
export const processPayment = async ({ bookingId, amount, coinsToUse = 0, userInfo = {} }) => {
  const finalAmountInPaise = Math.max(0, (amount - coinsToUse)) * 100;

  if (coinsToUse > 0) {
    await deductCoins(userInfo.uid, coinsToUse, `Redeemed on booking #${bookingId}`);
  }

  if (finalAmountInPaise === 0) {
    const earnedCoins = Math.floor(amount * 0.1);
    if (earnedCoins > 0) {
      await awardCoins(userInfo.uid, earnedCoins, `Earned from booking #${bookingId}`);
    }
    return { status: 'SUCCESS', paymentId: `FREE_COINS_${bookingId}`, amountPaid: 0 };
  }

  const options = {
    description: `ParkNow Booking #${bookingId}`,
    image: 'https://raw.githubusercontent.com/psudharshanchowdary/psudharshanchowdary/main/github_readme_banner.svg',
    currency: 'INR',
    key: 'rzp_test_parknow_key',
    amount: finalAmountInPaise,
    name: 'ParkNow',
    prefill: {
      email: userInfo.email || 'user@parknow.com',
      contact: userInfo.phone || '9999999999',
      name: userInfo.name || 'Driver User',
    },
    theme: { color: '#6366F1' },
  };

  const response = await RazorpayCheckout.open(options);
  const earnedCoins = Math.floor(amount * 0.1);
  if (earnedCoins > 0 && userInfo.uid) {
    await awardCoins(userInfo.uid, earnedCoins, `Earned from booking #${bookingId}`);
  }

  return response;
};
