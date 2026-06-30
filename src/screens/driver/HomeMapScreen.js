// Built Day 10
/**
 * @file HomeMapScreen.js
 * @description Driver Map Home screen featuring real-time parking lots map display and location integration.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import BottomSheet from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import * as parkingService from '../../services/parkingService';
import { calculateDistance, formatDistance } from '../../utils/formatters';

// Dark map style JSON configuration
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7c7c9c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d14' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2d2d4a' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#131322' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1e36' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2d2d4a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#05050a' }] },
];

// Default coordinates centered on Bengaluru
const DEFAULT_COORDS = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/** HomeMapScreen component containing MapView, bottom sheet, floating search, and location hooks. */
const HomeMapScreen = ({ navigation }) => {
  const [lots, setLots] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionMsg, setPermissionMsg] = useState('');
  const [mapRegion, setMapRegion] = useState(DEFAULT_COORDS);

  const bottomSheetRef = useRef(null);
  const mapRef = useRef(null);

  const snapPoints = useMemo(() => ['18%', '48%'], []);

  // Request location permissions and fetch coordinate on mount
  useEffect(() => {
    const handlePermissions = async () => {
      try {
        const permission = Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

        const checkResult = await request(permission);
        if (checkResult === RESULTS.GRANTED) {
          setPermissionGranted(true);
          getCurrentUserLocation();
        } else {
          setPermissionGranted(false);
          setPermissionMsg('Please enable location services in device settings to view distance.');
          setLoading(false);
        }
      } catch (err) {
        setPermissionGranted(false);
        setPermissionMsg('Error requesting location permission.');
        setLoading(false);
      }
    };

    handlePermissions();
  }, []);

  // Listen to Firestore real-time parking lots database updates
  useEffect(() => {
    const unsubscribe = parkingService.subscribeToLots((updatedLots) => {
      setLots(updatedLots);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  /** Fetches the driver's current coordinates using geolocation services. */
  const getCurrentUserLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { latitude, longitude };
        setUserLocation(coords);
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }, 1000);
        }
      },
      () => {
        // Default to central location if fetch fails
        setUserLocation({ latitude: DEFAULT_COORDS.latitude, longitude: DEFAULT_COORDS.longitude });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  /** Animates map region to a selected parking lot. */
  const focusOnLot = (lot) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lot.latitude,
        longitude: lot.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
    }
  };

  // Calculates and sorts nearby parking lots by distance
  const processedLots = useMemo(() => {
    const originLat = userLocation?.latitude || DEFAULT_COORDS.latitude;
    const originLon = userLocation?.longitude || DEFAULT_COORDS.longitude;

    const listWithDistance = lots.map((lot) => {
      const distance = calculateDistance(originLat, originLon, lot.latitude, lot.longitude);
      return { ...lot, distance };
    });

    // Sort by distance (nearest first)
    listWithDistance.sort((a, b) => a.distance - b.distance);

    // Apply search filter if query exists
    if (searchQuery.trim().length > 0) {
      return listWithDistance.filter((lot) =>
        lot.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return listWithDistance;
  }, [lots, userLocation, searchQuery]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        {/* Full-Screen Map */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          customMapStyle={DARK_MAP_STYLE}
          showsUserLocation={permissionGranted}
          showsMyLocationButton={false}
        >
          {processedLots.map((lot) => (
            <Marker
              key={lot.id}
              coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
              onPress={() => focusOnLot(lot)}
            >
              <View
                style={[
                  styles.markerPill,
                  lot.availableSpots === 0 ? styles.markerFull : styles.markerAvailable,
                ]}
              >
                <Text style={styles.markerText}>
                  {lot.availableSpots > 0 ? `${lot.availableSpots} free` : 'FULL'}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Floating Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search markets, malls..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Floating Location Button */}
        {permissionGranted ? (
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentUserLocation}>
            <Icon name="my-location" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        {/* Location Permission Warn Header */}
        {!permissionGranted && permissionMsg ? (
          <View style={styles.warnBanner}>
            <Icon name="warning-outline" size={16} color={COLORS.occupied} />
            <Text style={styles.warnText} numberOfLines={1}>
              {permissionMsg}
            </Text>
          </View>
        ) : null}

        {/* Live Lots List Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: COLORS.surface }}
          handleIndicatorStyle={{ backgroundColor: COLORS.border }}
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Nearby lots</Text>
            {loading ? (
              <View style={styles.skeletonContainer}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            ) : processedLots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No parking lots found nearby</Text>
              </View>
            ) : (
              <FlatList
                data={processedLots}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.cardsScroll}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.lotCard}
                    onPress={() => navigation.navigate('LotDetailScreen', { lotId: item.id })}
                  >
                    <Text style={styles.lotName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.lotMetaRow}>
                      <Text style={styles.lotMetaText}>
                        {formatDistance(item.distance)}
                      </Text>
                      <Text style={styles.lotDot}>•</Text>
                      <Text
                        style={[
                          styles.lotStatus,
                          item.availableSpots === 0 ? styles.lotStatusFull : styles.lotStatusFree,
                        ]}
                      >
                        {item.availableSpots > 0 ? `${item.availableSpots} spots` : 'Full'}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceValue}>₹{item.pricePerHour}</Text>
                      <Text style={styles.priceLabel}>/hr</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </BottomSheet>

        {/* Mock Bottom Navigation Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.tab}>
            <Icon name="map" size={22} color={COLORS.primary} />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => navigation.navigate('BookingsHistoryScreen')}
          >
            <Icon name="calendar-outline" size={22} color={COLORS.textSecondary} />
            <Text style={styles.tabLabel}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => navigation.navigate('ParkCoinsWalletScreen')}
          >
            <Icon name="wallet-outline" size={22} color={COLORS.textSecondary} />
            <Text style={styles.tabLabel}>Coins</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="person-outline" size={22} color={COLORS.textSecondary} />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerAvailable: {
    backgroundColor: COLORS.primary,
  },
  markerFull: {
    backgroundColor: COLORS.occupied,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '400',
  },
  locationButton: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  warnBanner: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 76,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 8,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  cardsScroll: {
    paddingRight: 20,
  },
  lotCard: {
    width: 200,
    height: 110,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  lotName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  lotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotMetaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  lotDot: {
    color: COLORS.textSecondary,
    marginHorizontal: 4,
    fontSize: 10,
  },
  lotStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  lotStatusFree: {
    color: COLORS.available,
  },
  lotStatusFull: {
    color: COLORS.occupied,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    color: COLORS.coins,
    fontSize: 16,
    fontWeight: '700',
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '400',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
});

export default HomeMapScreen;
