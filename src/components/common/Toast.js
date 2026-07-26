// Built Day 18
/**
 * @file Toast.js
 * @description Slide-down toast notification component.
 *              Auto-dismisses after 3 seconds.
 *              Supports success, error, and info variants.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_OFFSET = -80;

/** Maps toast type to background color. */
const TYPE_COLORS = {
  success: COLORS.available,
  error: COLORS.occupied,
  info: COLORS.primary,
};

/** Maps toast type to a leading emoji icon. */
const TYPE_ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

/**
 * Animated slide-down toast component.
 * @param {{ message: string, type: 'success'|'error'|'info', visible: boolean }} props
 */
const Toast = ({ message, type = 'info', visible }) => {
  const translateY = useRef(new Animated.Value(TOAST_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out
      Animated.timing(translateY, {
        toValue: TOAST_OFFSET,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const bgColor = TYPE_COLORS[type] || COLORS.primary;
  const icon = TYPE_ICONS[type] || 'ℹ';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 12,
    maxWidth: SCREEN_WIDTH - 32,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default Toast;
