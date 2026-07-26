// Built Day 18
/**
 * @file useToast.js
 * @description Custom hook for showing animated slide-down toast notifications.
 *
 * Usage:
 *   const { showToast, ToastComponent } = useToast();
 *   // Inside render: {ToastComponent}
 *   // To trigger:   showToast('Booking confirmed!', 'success');
 */

import React, { useState, useRef, useCallback } from 'react';
import Toast from '../components/common/Toast';

/**
 * useToast hook — manages toast visibility, message, and type.
 * @returns {{ showToast: Function, ToastComponent: React.Element }}
 */
const useToast = () => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const dismissTimer = useRef(null);

  /**
   * Shows a toast notification and auto-dismisses after 3 seconds.
   * @param {string} message - Text to display in the toast.
   * @param {'success'|'error'|'info'} type - Visual variant.
   */
  const showToast = useCallback((message, type = 'info') => {
    // Cancel any existing dismiss timer
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    dismissTimer.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }, []);

  /** The rendered Toast element — place this inside the screen's root View. */
  const ToastComponent = (
    <Toast
      message={toastMessage}
      type={toastType}
      visible={toastVisible}
    />
  );

  return { showToast, ToastComponent };
};

export default useToast;
