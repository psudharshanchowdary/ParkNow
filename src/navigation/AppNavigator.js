// Polished Day 19
/**
 * @file AppNavigator.js
 * @description Root navigation stack for ParkNow.
 *              Applies custom slide/fade card-style interpolators per screen.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// Driver screens
import DriverNavigator from './DriverNavigator';
import LotDetailScreen from '../screens/driver/LotDetailScreen';
import SpotPickerScreen from '../screens/driver/SpotPickerScreen';
import BookingFormScreen from '../screens/driver/BookingFormScreen';
import PaymentScreen from '../screens/driver/PaymentScreen';
import QRTicketScreen from '../screens/driver/QRTicketScreen';
import NavigationScreen from '../screens/driver/NavigationScreen';
import CommunityReportScreen from '../screens/driver/CommunityReportScreen';
import ParkCoinsWalletScreen from '../screens/driver/ParkCoinsWalletScreen';
import BookingsHistoryScreen from '../screens/driver/BookingsHistoryScreen';

// Admin screens
import AdminNavigator from './AdminNavigator';
import LiveLotViewScreen from '../screens/admin/LiveLotViewScreen';
import QRScannerScreen from '../screens/admin/QRScannerScreen';
import LotSettingsScreen from '../screens/admin/LotSettingsScreen';

const Stack = createNativeStackNavigator();

// ── Transition configs ────────────────────────────────────────────────────────

/** Slides new screen in from the right with a soft opacity fade. */
const slideFromRight = {
  animation: 'none',
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
      opacity: current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.8, 1],
      }),
    },
  }),
};

/** Slides new screen up from the bottom — used for modals / QR ticket. */
const slideFromBottom = {
  animation: 'none',
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.height, 0],
          }),
        },
      ],
    },
  }),
};

/** Simple cross-fade — used for top-level tab-to-tab transitions. */
const fadeIn = {
  animation: 'none',
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    },
  }),
};

/** AppNavigator — root stack covering auth, driver, and admin flows. */
const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{ headerShown: false, gestureEnabled: true }}
  >
    {/* Auth */}
    <Stack.Screen name="Splash" component={SplashScreen} options={fadeIn} />
    <Stack.Screen name="Login" component={LoginScreen} options={fadeIn} />

    {/* Driver tab root */}
    <Stack.Screen name="DriverApp" component={DriverNavigator} options={fadeIn} />

    {/* Driver detail stack */}
    <Stack.Screen name="LotDetailScreen" component={LotDetailScreen} options={slideFromRight} />
    <Stack.Screen name="SpotPickerScreen" component={SpotPickerScreen} options={slideFromRight} />
    <Stack.Screen name="BookingFormScreen" component={BookingFormScreen} options={slideFromRight} />
    <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={slideFromRight} />
    <Stack.Screen name="QRTicketScreen" component={QRTicketScreen} options={slideFromBottom} />
    <Stack.Screen name="NavigationScreen" component={NavigationScreen} options={slideFromRight} />
    <Stack.Screen name="CommunityReport" component={CommunityReportScreen} options={slideFromRight} />
    <Stack.Screen name="ParkCoinsWallet" component={ParkCoinsWalletScreen} options={slideFromRight} />
    <Stack.Screen name="BookingsHistory" component={BookingsHistoryScreen} options={slideFromRight} />

    {/* Admin tab root */}
    <Stack.Screen name="AdminApp" component={AdminNavigator} options={fadeIn} />

    {/* Admin detail stack */}
    <Stack.Screen name="LiveLotView" component={LiveLotViewScreen} options={slideFromRight} />
    <Stack.Screen name="QRScanner" component={QRScannerScreen} options={slideFromBottom} />
    <Stack.Screen name="LotSettings" component={LotSettingsScreen} options={slideFromRight} />
  </Stack.Navigator>
);

export default AppNavigator;
