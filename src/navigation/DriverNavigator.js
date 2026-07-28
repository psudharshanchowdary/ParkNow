// Polished Day 19
/**
 * @file DriverNavigator.js
 * @description Bottom tab navigator for driver flow.
 *              Dark tab bar with animated icon bounce and label fade.
 */

import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

import HomeMapScreen from '../screens/driver/HomeMapScreen';
import BookingsHistoryScreen from '../screens/driver/BookingsHistoryScreen';
import ParkCoinsWalletScreen from '../screens/driver/ParkCoinsWalletScreen';
import CommunityReportScreen from '../screens/driver/CommunityReportScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', component: HomeMapScreen, icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  { name: 'Bookings', component: BookingsHistoryScreen, icon: 'calendar-outline', activeIcon: 'calendar', label: 'Bookings' },
  { name: 'Coins', component: ParkCoinsWalletScreen, icon: 'wallet-outline', activeIcon: 'wallet', label: 'Coins' },
  { name: 'Community', component: CommunityReportScreen, icon: 'people-outline', activeIcon: 'people', label: 'Community' },
];

/**
 * AnimatedTabButton — wraps each tab with spring icon bounce and label fade.
 */
const AnimatedTabButton = ({ onPress, onLongPress, accessibilityState, children }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isActive = accessibilityState?.selected;

  /** Springs icon up on press. */
  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
    onPress?.();
  }, [scale, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={1}
      style={tabStyles.tabBtn}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const tabStyles = StyleSheet.create({
  tabBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

/** DriverNavigator bottom tabs. */
const DriverNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        height: 60,
        paddingBottom: 6,
        paddingTop: 6,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      tabBarButton: (props) => <AnimatedTabButton {...props} />,
      tabBarIcon: ({ focused, color, size }) => {
        const tab = TABS.find((t) => t.name === route.name);
        const iconName = focused ? tab?.activeIcon : tab?.icon;
        return <Icon name={iconName || 'home'} size={24} color={color} />;
      },
    })}
  >
    {TABS.map((tab) => (
      <Tab.Screen
        key={tab.name}
        name={tab.name}
        component={tab.component}
        options={{ tabBarLabel: tab.label }}
      />
    ))}
  </Tab.Navigator>
);

export default DriverNavigator;
