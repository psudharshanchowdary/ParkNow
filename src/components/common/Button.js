// Polished Day 19
/**
 * @file Button.js
 * @description AnimatedButton component used across ParkNow.
 *              Applies a spring scale press animation on every press interaction.
 */

import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../theme/colors';

/**
 * AnimatedButton — wraps any CTA with press-in/press-out spring scale animation.
 *
 * @param {{
 *   onPress: Function,
 *   children?: React.ReactNode,
 *   label?: string,
 *   style?: Object,
 *   labelStyle?: Object,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   variant?: 'primary'|'secondary'|'ghost',
 * }} props
 */
const AnimatedButton = ({
  onPress,
  children,
  label,
  style,
  labelStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  /** Compresses button slightly on press-in. */
  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }, [scale]);

  /** Bounces button back to full size on press-out. */
  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [scale]);

  const variantStyle =
    variant === 'secondary' ? styles.secondary :
    variant === 'ghost' ? styles.ghost :
    styles.primary;

  const variantLabelStyle =
    variant === 'ghost' ? styles.ghostLabel :
    styles.primaryLabel;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && styles.disabledWrapper]}>
      <TouchableOpacity
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={disabled || loading ? undefined : handlePressIn}
        onPressOut={disabled || loading ? undefined : handlePressOut}
        activeOpacity={1}
        style={[styles.base, variantStyle, disabled && styles.disabled, style]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : children ? (
          children
        ) : (
          <Text style={[variantLabelStyle, labelStyle]}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  ghostLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledWrapper: {
    opacity: 0.5,
  },
});

export default React.memo(AnimatedButton);
