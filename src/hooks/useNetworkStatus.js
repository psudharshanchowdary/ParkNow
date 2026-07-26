// Built Day 18
/**
 * @file useNetworkStatus.js
 * @description Custom hook that monitors internet connectivity and provides
 *              an OfflineBanner component to show when the device is offline.
 *
 * Usage:
 *   const { isConnected, OfflineBanner } = useNetworkStatus();
 *   // Inside render (near bottom of screen root): {OfflineBanner}
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from '../theme/colors';

/**
 * useNetworkStatus hook — subscribes to NetInfo and returns connectivity state.
 * @returns {{ isConnected: boolean, OfflineBanner: React.Element }}
 */
const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const bannerOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(!!connected);

      Animated.timing(bannerOpacity, {
        toValue: connected ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      unsubscribe();
    };
  }, [bannerOpacity]);

  /** Fixed-bottom offline banner — only visible when disconnected. */
  const OfflineBanner = (
    <Animated.View
      style={[styles.banner, { opacity: bannerOpacity }]}
      pointerEvents="none"
    >
      <View style={styles.dot} />
      <Text style={styles.bannerText}>No internet connection</Text>
    </Animated.View>
  );

  return { isConnected, OfflineBanner };
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,59,92,0.13)',
    borderTopWidth: 1,
    borderTopColor: COLORS.occupied,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9990,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.occupied,
  },
  bannerText: {
    color: COLORS.occupied,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default useNetworkStatus;
