/**
 * @file formatters.js
 * @description Distance, currency, date, spot label, booking ID, time-ago,
 *              and coin reason formatting utilities.
 */

import { COLORS } from '../theme/colors';

/** Calculates distance between two coordinates using the Haversine formula. */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Formats a distance in kilometers to a human-readable string. */
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

/** Formats a currency value as Indian Rupees. */
export const formatPrice = (amount) => {
  return `₹${amount}`;
};

/** Formats currency in Indian style with commas (e.g. "₹1,250"). */
export const formatCurrency = (amount) => {
  const formatted = Math.round(amount).toLocaleString('en-IN');
  return `₹${formatted}`;
};

/** Calculates 18% GST on an amount rounded to nearest integer. */
export const calculateGST = (amount) => {
  return Math.round(amount * 0.18);
};

/** Formats a Date object or ISO string into "Today, 27 Jun" or "Mon, 28 Jun". */
export const formatBookingDate = (dateObj) => {
  if (!dateObj) return '';
  const date = new Date(dateObj);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const dayName = isToday
    ? 'Today'
    : date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });

  return `${dayName}, ${dayNum} ${monthName}`;
};

/** Formats an hour number (0-23) to 12-hour format string (e.g. "10:00 AM"). */
export const formatTime = (hour) => {
  if (typeof hour !== 'number') return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};

/** Formats spot label for display (e.g. "A1" → "Spot A1"). */
export const formatSpotLabel = (label) => {
  if (label && label.startsWith('Spot ')) {
    return label;
  }
  return `Spot ${label}`;
};

/** Returns color hex based on spot status. */
export const getSpotColor = (status) => {
  if (status === 'available') {
    return COLORS.available;
  }
  if (status === 'occupied') {
    return COLORS.occupied;
  }
  return COLORS.coins;
};

/** Shortens a booking ID for display — returns first 8 characters uppercase. */
export const shortBookingId = (bookingId) => {
  if (!bookingId) return '--------';
  return bookingId.slice(0, 8).toUpperCase();
};

/**
 * Formats a Firestore timestamp, Date, or milliseconds value into a
 * human-readable "time ago" string.
 * Examples: "Just now", "3 min ago", "2 hrs ago", "4 days ago".
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';

  let ms;
  if (timestamp?.toDate) {
    // Firestore Timestamp object
    ms = timestamp.toDate().getTime();
  } else if (timestamp instanceof Date) {
    ms = timestamp.getTime();
  } else if (typeof timestamp === 'number') {
    ms = timestamp;
  } else {
    ms = new Date(timestamp).getTime();
  }

  const diffSec = Math.floor((Date.now() - ms) / 1000);

  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hr' : 'hrs'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
};

/** Maps a coin transaction reason snake_case key to a user-friendly label. */
export const formatCoinReason = (reason) => {
  const map = {
    community_report: 'Reported free spot',
    booking_reward: 'Booking reward',
    payment_discount: 'Used for discount',
    referral: 'Referral bonus',
    'Community Report Reward': 'Reported free spot',
    'Booking Reward': 'Booking reward',
  };
  return map[reason] || reason;
};

/** Alias for formatBookingDate for backwards compatibility. */
export const formatDate = (d) => {
  return formatBookingDate(d);
};
