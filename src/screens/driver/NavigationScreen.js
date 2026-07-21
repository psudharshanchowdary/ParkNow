// Built Day 13
/**
 * @file NavigationScreen.js
 * @description Turn-by-turn navigation helper screen showing the parking lot
 *              on a dark map with a dashed polyline route from user location,
 *              journey stats, and deep links to Google Maps / Apple Maps.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { calculateDistance, formatDistance } from '../../utils/formatters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.55;

/** Dark map style matching the rest of the ParkNow design system. */
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1A1A2E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A0A0B8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D0D14' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#252540' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2D2D4A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D0D14' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/** Estimates driving time in minutes given distance in km at 30 km/h average. */
const estimateTravelTime = (distanceKm) => {
  return Math.ceil((distanceKm / 30) * 60);
};

/** NavigationScreen functional component. */
const NavigationScreen = ({ route, navigation }) => {
  const { lotId, lotName, lotLat, lotLng, spotLabel } = route.params || {};

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');

  const mapRef = useRef(null);

  const lotCoords = useMemo(
    () => ({ latitude: Number(lotLat) || 12.9716, longitude: Number(lotLng) || 77.5946 }),
    [lotLat, lotLng]
  );

  // Derived journey metrics
  const distance = useMemo(() => {
    if (!userLocation) return null;
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      lotCoords.latitude,
      lotCoords.longitude
    );
  }, [userLocation, lotCoords]);

  const estimatedMinutes = useMemo(() => {
    if (distance === null) return null;
    return estimateTravelTime(distance);
  }, [distance]);

  /** Fits the map to show both the user and lot markers. */
  const fitMapToMarkers = useCallback(
    (userLoc) => {
      if (!mapRef.current || !userLoc) return;
      mapRef.current.fitToCoordinates(
        [
          { latitude: userLoc.latitude, longitude: userLoc.longitude },
          { latitude: lotCoords.latitude, longitude: lotCoords.longitude },
        ],
        {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        }
      );
    },
    [lotCoords]
  );

  // Request user location on mount
  useEffect(() => {
    let watchId = null;

    const requestLocation = async () => {
      try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          setLocationError('Location permission denied. Showing lot location only.');
          setLocationLoading(false);
          return;
        }

        Geolocation.getCurrentPosition(
          (pos) => {
            const loc = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setUserLocation(loc);
            setLocationLoading(false);
            // Give MapView time to render before fitting
            setTimeout(() => fitMapToMarkers(loc), 500);
          },
          (_err) => {
            setLocationError('Could not get your location.');
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      } catch (err) {
        setLocationError('Location unavailable.');
        setLocationLoading(false);
      }
    };

    requestLocation();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [fitMapToMarkers]);

  /** Opens Google Maps with driving directions to the lot. */
  const handleOpenGoogleMaps = useCallback(async () => {
    const lat = lotCoords.latitude;
    const lng = lotCoords.longitude;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    const fallback = `https://maps.google.com/maps?daddr=${lat},${lng}`;
    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(supported ? url : fallback);
    } catch (_err) {
      try {
        await Linking.openURL(fallback);
      } catch (__err) {
        // Silent catch
      }
    }
  }, [lotCoords]);

  /** Opens Apple Maps with driving directions (iOS only). */
  const handleOpenAppleMaps = useCallback(async () => {
    const lat = lotCoords.latitude;
    const lng = lotCoords.longitude;
    try {
      await Linking.openURL(`maps://app?daddr=${lat},${lng}`);
    } catch (_err) {
      // Silent catch
    }
  }, [lotCoords]);

  /** Navigates back to the QR ticket screen. */
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Initial region centres on lot if user location is not yet known
  const initialRegion = {
    latitude: lotCoords.latitude,
    longitude: lotCoords.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const polylineCoords =
    userLocation
      ? [
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: lotCoords.latitude, longitude: lotCoords.longitude },
        ]
      : [];

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigate to lot</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Map ────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          customMapStyle={DARK_MAP_STYLE}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
        >
          {/* Dashed route polyline */}
          {polylineCoords.length === 2 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={COLORS.primary}
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}

          {/* Destination marker */}
          <Marker coordinate={lotCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerCircle}>
                <Text style={styles.markerText}>P</Text>
              </View>
              <Text style={styles.markerLabel} numberOfLines={1}>
                {lotName}
              </Text>
            </View>
          </Marker>
        </MapView>

        {locationLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color={COLORS.primary} size="small" />
          </View>
        )}
      </View>

      {/* ── Content below map ──────────────────────────────── */}
      <View style={styles.contentArea}>
        {/* Location error message */}
        {locationError ? (
          <Text style={styles.locationErrorText}>{locationError}</Text>
        ) : null}

        {/* Journey Info Card */}
        <View style={styles.journeyCard}>
          <View style={styles.journeyCol}>
            <Text style={styles.journeyValue}>
              {distance !== null ? formatDistance(distance) : '—'}
            </Text>
            <Text style={styles.journeyLabel}>Distance</Text>
          </View>

          <View style={styles.journeyDivider} />

          <View style={styles.journeyCol}>
            <Text style={styles.journeyValue}>
              {estimatedMinutes !== null ? `${estimatedMinutes} min` : '—'}
            </Text>
            <Text style={styles.journeyLabel}>Est. time</Text>
          </View>

          <View style={styles.journeyDivider} />

          <View style={styles.journeyCol}>
            <Text style={[styles.journeyValue, styles.journeyValueViolet]}>
              {spotLabel || '—'}
            </Text>
            <Text style={styles.journeyLabel}>Your spot</Text>
          </View>
        </View>

        {/* Destination Card */}
        <View style={styles.destinationCard}>
          <View style={styles.destinationPBadge}>
            <Text style={styles.destinationPText}>P</Text>
          </View>
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationName}>{lotName}</Text>
            <Text style={styles.destinationSubname}>Parking lot · Ground floor</Text>
          </View>
          <View style={styles.spotBadge}>
            <Text style={styles.spotBadgeText}>Spot {spotLabel}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.googleMapsBtn} onPress={handleOpenGoogleMaps}>
          <Icon name="navigate" size={18} color={COLORS.textPrimary} style={styles.btnIcon} />
          <Text style={styles.googleMapsBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity style={styles.appleMapsBtn} onPress={handleOpenAppleMaps}>
            <Icon name="map-outline" size={18} color={COLORS.textPrimary} style={styles.btnIcon} />
            <Text style={styles.appleMapsBtnText}>Open in Apple Maps</Text>
          </TouchableOpacity>
        )}

        {/* Parking Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Parking tips</Text>
          {[
            '🅿️  Show QR at entry gate',
            '⏱️  Arrive within 15 min of booking',
            '📱  Keep app open for easy exit scan',
          ].map((tip) => (
            <Text key={tip} style={styles.tipText}>
              {tip}
            </Text>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

/** Requests location permission on both platforms. Returns true if granted. */
async function requestLocationPermission() {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }
  // Android
  try {
    const { PermissionsAndroid } = require('react-native');
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_err) {
    return false;
  }
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  mapContainer: {
    height: MAP_HEIGHT,
  },
  map: {
    flex: 1,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13,13,20,0.4)',
  },
  // Marker
  markerContainer: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  markerText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  markerLabel: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '500',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    maxWidth: 120,
    textAlign: 'center',
  },
  // Content
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  locationErrorText: {
    color: COLORS.gold,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Journey card
  journeyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    alignItems: 'center',
  },
  journeyCol: {
    flex: 1,
    alignItems: 'center',
  },
  journeyValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  journeyValueViolet: {
    color: COLORS.primary,
  },
  journeyLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  journeyDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  // Destination card
  destinationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 10,
  },
  destinationPBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destinationPText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  destinationSubname: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  spotBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  spotBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  // Buttons
  googleMapsBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnIcon: {
    marginRight: 6,
  },
  googleMapsBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  appleMapsBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appleMapsBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  // Tips
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 2,
    gap: 8,
  },
  tipsTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default NavigationScreen;
