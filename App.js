// Built Day 20
/**
 * @file App.js
 * @description Main application entry point for ParkNow.
 *              Wraps NavigationContainer with ErrorBoundary, StatusBar configuration,
 *              and notification setup.
 */

import React, { useEffect } from 'react';
import { StatusBar, SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import {
  createNotificationChannel,
  setupForegroundHandler,
  setupNotificationOpenedHandler,
} from './src/services/notificationService';
import { COLORS } from './src/theme/colors';

export const navigationRef = createNavigationContainerRef();

const App = () => {
  useEffect(() => {
    // Initialize notification channels and listeners on app launch
    createNotificationChannel();
    const unsubscribeForeground = setupForegroundHandler();
    return () => {
      if (typeof unsubscribeForeground === 'function') {
        unsubscribeForeground();
      }
    };
  }, []);

  const handleNavReady = () => {
    if (navigationRef.isReady()) {
      setupNotificationOpenedHandler(navigationRef);
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0D0D14"
          translucent={false}
        />
        <NavigationContainer ref={navigationRef} onReady={handleNavReady}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#0D0D14',
  },
});

export default App;
