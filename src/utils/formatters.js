/**
 * @file formatters.js
 * @description Distance formatting, distance calculations, and spot label styling.
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

/** Placeholder for date formatting. */
export const formatDate = () => {};

/** Placeholder for time formatting. */
export const formatTime = () => {};
