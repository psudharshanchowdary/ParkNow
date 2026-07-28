// Polished Day 19
/**
 * @file SplashScreen.js
 * @description App launch screen with logo spring, name fade+slide,
 *              tagline fade, and loading bar fill animations.
 *              Navigates to Login when the loading bar completes.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { COLORS } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** SplashScreen functional component. */
const SplashScreen = ({ navigation }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const loadingWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Logo spring: 0 → 1.1 → 1.0
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // 2. App name fade + slide up (delay 300ms)
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Tagline fade (delay 600ms)
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 400,
      delay: 600,
      useNativeDriver: true,
    }).start();

    // 4. Loading bar fill (delay 500ms, 1800ms duration)
    Animated.timing(loadingWidth, {
      toValue: SCREEN_WIDTH - 80,
      duration: 1800,
      delay: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        navigation.replace('Login');
      }
    });

    return () => {
      logoScale.stopAnimation();
      titleOpacity.stopAnimation();
      titleY.stopAnimation();
      taglineOpacity.stopAnimation();
      loadingWidth.stopAnimation();
    };
  }, [logoScale, titleOpacity, titleY, taglineOpacity, loadingWidth, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Logo */}
      <Animated.View style={[styles.logoCircle, { transform: [{ scale: logoScale }] }]}>
        <Text style={styles.logoText}>🅿</Text>
      </Animated.View>

      {/* App name */}
      <Animated.Text
        style={[
          styles.appName,
          { opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        ParkNow
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Find. Book. Park.
      </Animated.Text>

      {/* Loading bar */}
      <View style={styles.loadingTrack}>
        <Animated.View style={[styles.loadingFill, { width: loadingWidth }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoText: { fontSize: 48 },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 60,
  },
  loadingTrack: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});

export default React.memo(SplashScreen);
