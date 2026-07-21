/**
 * @file formatters.js
 * @description Distance formatting, distance calculations, currency, date, and spot label styling.
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

/** Formats currency in Indian style with commas. */
export const formatCurrency = (amount) => {
  const formatted = Math.round(amount).toLocaleString('en-IN');
  return `₹${formatted}`;
};

/** Calculates 18% GST on an amount rounded to nearest integer. */
export const calculateGST = (amount) => {
  return Math.round(amount * 0.18);
};

/** Formats a Date object into "Today, 27 Jun" or "Mon, 28 Jun" style string. */
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

/** Formats an hour number (0-23) to 12hr format string (e.g. "10:00 AM"). */
export const formatTime = (hour) => {
  if (typeof hour !== 'number') return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};

/** Formats spot label for display. */
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

/** Placeholder for general date formatting. */
export const formatDate = (d) => {
  return formatBookingDate(d);
};
