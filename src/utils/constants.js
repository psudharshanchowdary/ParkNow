/**
 * @file constants.js
 * @description Global application constants, theme color tokens, and error message definitions.
 */

export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  backgroundDark: '#0F172A',
  cardDark: '#1E293B',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  INVALID_VEHICLE: 'Please enter a valid vehicle registration number (e.g., KA-01-AB-1234).',
  INVALID_PHONE: 'Please enter a valid 10-digit mobile number.',
  INVALID_TIME: 'Booking start time must be in the future.',
  SLOT_UNAVAILABLE: 'Selected parking spot is no longer available.',
  PAYMENT_FAILED: 'Transaction could not be completed. Please try again.',
};

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};
