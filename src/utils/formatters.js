/**
 * @file formatters.js
 * @description All display formatting utilities for ParkNow.
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
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

/** Formats a currency value as plain Indian Rupees string. */
export const formatPrice = (amount) => `₹${amount}`;

/** Formats currency in Indian locale style with commas (e.g. "₹1,250"). */
export const formatCurrency = (amount) => {
  const formatted = Math.round(amount).toLocaleString('en-IN');
  return `₹${formatted}`;
};

/** Calculates 18% GST on an amount, rounded to nearest integer. */
export const calculateGST = (amount) => Math.round(amount * 0.18);

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
  return `${dayName}, ${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
};

/** Formats an hour integer (0-23) to 12-hour format string (e.g. "10:00 AM"). */
export const formatTime = (hour) => {
  if (typeof hour !== 'number') return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};

/** Formats spot label for display (e.g. "A1" → "Spot A1"). */
export const formatSpotLabel = (label) => {
  if (label && label.startsWith('Spot ')) return label;
  return `Spot ${label}`;
};

/** Returns a color hex string based on spot status. */
export const getSpotColor = (status) => {
  if (status === 'available') return COLORS.available;
  if (status === 'occupied') return COLORS.occupied;
  return COLORS.coins;
};

/** Shortens a booking ID for display — returns first 8 characters uppercase. */
export const shortBookingId = (bookingId) => {
  if (!bookingId) return '--------';
  return bookingId.slice(0, 8).toUpperCase();
};

/**
 * Formats a Firestore timestamp, Date, or ms value into a "time ago" string.
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  let ms;
  if (timestamp?.toDate) ms = timestamp.toDate().getTime();
  else if (timestamp instanceof Date) ms = timestamp.getTime();
  else if (typeof timestamp === 'number') ms = timestamp;
  else ms = new Date(timestamp).getTime();

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

/** Maps a coin transaction reason key to a user-friendly display label. */
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

/**
 * Formats a countdown to a future start time.
 * @param {Date|string|number} startDateTime
 * @returns {string}
 */
export const formatCountdown = (startDateTime) => {
  if (!startDateTime) return '';
  const start = new Date(startDateTime);
  const diffMs = start.getTime() - Date.now();
  if (diffMs <= 0) return 'Started';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 5) return 'Starting soon';
  if (diffMin < 60) return `Starts in ${diffMin} mins`;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `Starts in ${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  return `Starts in ${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${mins} mins`;
};

/**
 * Returns a time-based greeting string.
 * @returns {string}
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Calculates percentage change between two values.
 * @param {number} current
 * @param {number} previous
 * @returns {string}
 */
export const percentageChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? '+100%' : '0%';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
};

/**
 * Formats the end time of a booking as "Until 2:30 PM".
 * @param {number|string} startHour
 * @param {number} duration
 * @returns {string}
 */
export const formatEndTime = (startHour, duration) => {
  try {
    let startH = 9;
    let startM = 0;
    if (typeof startHour === 'number') {
      startH = startHour;
    } else if (typeof startHour === 'string' && startHour.includes(':')) {
      const parts = startHour.split(':');
      startH = parseInt(parts[0], 10);
      startM = parseInt(parts[1], 10) || 0;
    } else if (typeof startHour === 'string') {
      startH = parseInt(startHour, 10) || 9;
    }
    const totalMinutes = startH * 60 + startM + Math.round((duration || 1) * 60);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const period = endH >= 12 ? 'PM' : 'AM';
    const displayH = endH % 12 === 0 ? 12 : endH % 12;
    const displayM = endM === 0 ? '' : `:${endM.toString().padStart(2, '0')}`;
    return `Until ${displayH}${displayM} ${period}`;
  } catch (_e) {
    return 'Until —';
  }
};

/**
 * Maps a QR scan error code to a user-friendly message string.
 * @param {string} errorCode
 * @returns {string}
 */
export const formatScanError = (errorCode) => {
  const map = {
    invalid_qr: 'Invalid QR code. Please ask the driver to show a valid ParkNow ticket.',
    already_used: 'This booking has already been checked in.',
    expired: 'This booking has expired.',
    wrong_lot: 'This ticket is for a different parking lot.',
    cancelled: 'This booking was cancelled.',
    not_found: 'Booking not found. Please check the ID.',
  };
  return map[errorCode] || 'Something went wrong. Please try again.';
};

/**
 * Formats a revenue amount for compact chart axis labels.
 * @param {number} amount
 * @returns {string} e.g. "₹2k" or "₹450"
 */
export const formatChartRevenue = (amount) => {
  if (!amount || amount === 0) return '₹0';
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return `₹${Math.round(amount)}`;
};

/**
 * Groups an array of bookings by day-of-week label.
 * @param {Array} bookings - Array of booking objects with createdAt field.
 * @returns {Object} e.g. { Mon: 1200, Tue: 800, Wed: 0, ... }
 */
export const groupBookingsByDay = (bookings) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  (bookings || []).forEach((b) => {
    try {
      const ts = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || Date.now());
      const day = days[ts.getDay()];
      result[day] = (result[day] || 0) + (b.totalAmount || 0);
    } catch (_e) {}
  });
  return result;
};

/**
 * Converts a 24-hour time string to 12-hour display format.
 * @param {string} timeString - e.g. "14:30"
 * @returns {string} e.g. "2:30 PM"
 */
export const format24to12 = (timeString) => {
  if (!timeString || !timeString.includes(':')) return timeString || '';
  const [hStr, mStr] = timeString.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
  return `${displayH}${displayM} ${period}`;
};

/**
 * Clamps a numeric value between a minimum and maximum.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** Alias for formatBookingDate for backwards compatibility. */
export const formatDate = (d) => formatBookingDate(d);
