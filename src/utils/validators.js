/**
 * @file validators.js
 * @description Input validation utility functions for user registration, phone numbers, and vehicle tags.
 */

/** Validate email format */
export const isValidEmail = (email = '') => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/** Validate 10-digit Indian phone number */
export const isValidPhone = (phone = '') => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/** Validate Indian vehicle registration number format (e.g. KA01AB1234 or KA-01-AB-1234) */
export const isValidVehicleNumber = (vehicleNo = '') => {
  const formatted = vehicleNo.replace(/[\s-]/g, '').toUpperCase();
  const vehicleRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
  return vehicleRegex.test(formatted);
};

/** Validate booking time slot start and end hours */
export const isValidBookingTime = (startTime, endTime) => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return !isNaN(start) && !isNaN(end) && start < end && start > Date.now();
};
