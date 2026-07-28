// Polished Day 19
/**
 * @file AdminNavigator.js
 * @description Bottom tab navigator for admin flow.
 *              Same dark tab bar and animated button as DriverNavigator.
 */

import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import LiveLotViewScreen from '../screens/admin/LiveLotViewScreen';
import BookingsHistoryScreen from '../screens/driver/BookingsHistoryScreen';
import RevenueReportScreen from '../screens/admin/RevenueReportScreen';

const Tab = createBottomTabNavigator();

const ADMIN_TABS = [
  { name: 'Dashboard', component: AdminDashboardScreen, icon: 'grid-outline', activeIcon: 'grid', label: 'Dashboard' },
  { name: 'Lots', component: LiveLotViewScreen, icon: 'map-outline', activeIcon: 'map', label: 'Lots' },
  { name: 'Bookings', component: BookingsHistoryScreen, icon: 'list-outline', activeIcon: 'list', label: 'Bookings' },
  { name: 'Revenue', component: RevenueReportScreen, icon: 'bar-chart-outline', activeIcon: 'bar-chart', label: 'Revenue' },
];

/**
 * AnimatedTabButton — spring bounce on icon tap (shared pattern with DriverNavigator).
 */
const AnimatedTabButton = ({ onPress, onLongPress, accessibilityState, children }) => {
  const scale = useRef(new Animated.Value(1)).current;

  /** Springs icon scale up then back on press. */
  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 8 }),
      Animated.spring(scale, { toValue: 1.0, useNativeDriver: true, speed: 20, bounciness: 6 }),
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

/** AdminNavigator bottom tabs. */
const AdminNavigator = () => (
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
      tabBarIcon: ({ focused, color }) => {
        const tab = ADMIN_TABS.find((t) => t.name === route.name);
        const iconName = focused ? tab?.activeIcon : tab?.icon;
        return <Icon name={iconName || 'grid'} size={24} color={color} />;
      },
    })}
  >
    {ADMIN_TABS.map((tab) => (
      <Tab.Screen
        key={tab.name}
        name={tab.name}
        component={tab.component}
        options={{ tabBarLabel: tab.label }}
      />
    ))}
  </Tab.Navigator>
);

export default AdminNavigator;
