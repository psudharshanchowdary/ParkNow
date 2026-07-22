// Built Day 14
/**
 * @file CommunityReportScreen.js
 * @description Community spot reporting screen — lets drivers earn 10 ParkCoins
 *              by reporting when they are about to vacate a parking spot.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Animated,
  FlatList,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import * as coinsService from '../../services/coinsService';
import { subscribeToLots } from '../../services/parkingService';
import {
  calculateDistance,
  formatDistance,
  formatTimeAgo,
} from '../../utils/formatters';
import { LOTS } from '../../utils/mockData';

const QUICK_SPOTS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];

/** Reverse-geocodes coordinates to a readable address using Nominatim. */
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const json = await res.json();
    return json.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (_e) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

/** CommunityReportScreen functional component. */
const CommunityReportScreen = ({ navigation }) => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_user_id';

  // ── State ────────────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState(null);
  const [address, setAddress] = useState('Detecting location…');
  const [locationLoading, setLocationLoading] = useState(true);
  const [spotLabel, setSpotLabel] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [nearbyLots, setNearbyLots] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [coinBalance, setCoinBalance] = useState(0);

  // ── Animation refs ────────────────────────────────────────────────────────────
  const successSlide = useRef(new Animated.Value(60)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const coinCounter = useRef(new Animated.Value(0)).current;

  /** Detects user location and reverse-geocodes the address. */
  const detectLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      Geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserLocation(loc);
          const addr = await reverseGeocode(loc.latitude, loc.longitude);
          setAddress(addr);
          setLocationLoading(false);
        },
        (_err) => {
          setAddress('Location unavailable — tap refresh');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } catch (_e) {
      setAddress('Location unavailable');
      setLocationLoading(false);
    }
  }, []);

  // Fetch location and nearby lots on mount
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // Fetch nearby lots (sorted by distance if location available)
  useEffect(() => {
    const unsubscribe = subscribeToLots((lots) => {
      if (!lots || lots.length === 0) {
        setNearbyLots(LOTS.slice(0, 3));
        return;
      }
      const withDist = lots.map((lot) => {
        const dist = userLocation
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              lot.latitude,
              lot.longitude
            )
          : 99;
        return { ...lot, distance: dist };
      });
      withDist.sort((a, b) => a.distance - b.distance);
      setNearbyLots(withDist.slice(0, 3));
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userLocation]);

  // Subscribe to recent community reports
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = firestore()
        .collection('communityReports')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot(
          (snap) => {
            if (snap && !snap.empty) {
              setRecentReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            }
          },
          (_err) => {}
        );
    } catch (_e) {}

    return () => unsubscribe();
  }, []);

  // Fetch current coin balance for count-up
  useEffect(() => {
    let isMounted = true;
    const fetchBalance = async () => {
      try {
        const bal = await coinsService.getCoinBalance(uid);
        if (isMounted) setCoinBalance(bal);
      } catch (_e) {}
    };
    fetchBalance();
    return () => { isMounted = false; };
  }, [uid]);

  /** Triggers success slide-up + coin count-up animations. */
  const triggerSuccessAnimation = useCallback((prevBalance) => {
    Animated.parallel([
      Animated.timing(successSlide, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    coinCounter.setValue(prevBalance);
    Animated.timing(coinCounter, {
      toValue: prevBalance + 10,
      duration: 1000,
      useNativeDriver: false, // needed for interpolated text
    }).start();
  }, [successSlide, successOpacity, coinCounter]);

  /** Submits the community spot report to Firestore and awards coins. */
  const handleSubmitReport = useCallback(async () => {
    if (!spotLabel.trim() || !selectedLot) return;
    setIsSubmitting(true);
    try {
      await firestore().collection('communityReports').add({
        userId: uid,
        spotLabel: spotLabel.trim(),
        lotId: selectedLot.id,
        lotName: selectedLot.name,
        location: userLocation
          ? new firestore.GeoPoint(userLocation.latitude, userLocation.longitude)
          : null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        status: 'active',
      });

      await coinsService.addCoins(uid, 10, 'community_report');

      const newBalance = await coinsService.getCoinBalance(uid);
      triggerSuccessAnimation(newBalance - 10);
      setCoinBalance(newBalance);
      setIsSubmitted(true);
    } catch (_err) {
      // Silent catch; user already sees submitting indicator
    } finally {
      setIsSubmitting(false);
    }
  }, [spotLabel, selectedLot, uid, userLocation, triggerSuccessAnimation]);

  /** Resets the form for another report submission. */
  const handleReportAnother = useCallback(() => {
    setSpotLabel('');
    setSelectedLot(null);
    setIsSubmitted(false);
    successSlide.setValue(60);
    successOpacity.setValue(0);
    coinCounter.setValue(coinBalance);
  }, [coinBalance, successSlide, successOpacity, coinCounter]);

  const canSubmit = spotLabel.trim().length > 0 && selectedLot !== null;

  // ─── Render helpers ───────────────────────────────────────────────────────────
  /** Renders a single recent report row. */
  const renderReport = useCallback(({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportLeft}>
        <View style={styles.spotBadge}>
          <Text style={styles.spotBadgeText}>{item.spotLabel || '—'}</Text>
        </View>
        <Text style={styles.reportLotName}>{item.lotName || 'Unknown lot'}</Text>
      </View>
      <View style={styles.reportRight}>
        <Text style={styles.reportTimeAgo}>{formatTimeAgo(item.createdAt)}</Text>
        <Text style={styles.reportCoins}>+10 🪙</Text>
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report free spot</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── How it works card ───────────────────────────────── */}
        <View style={styles.howCard}>
          <View style={styles.coinIconCircle}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>
          <Text style={styles.earnTitle}>Earn 10 ParkCoins</Text>
          <Text style={styles.earnDesc}>
            Tell other drivers you're leaving so they can find parking faster
          </Text>
        </View>

        {/* ── Current location card ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.locationRow}>
            <Icon name="location" size={20} color={COLORS.primary} style={styles.locationIcon} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>Your location</Text>
              {locationLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.locationLoader} />
              ) : (
                <Text style={styles.locationAddress} numberOfLines={2}>{address}</Text>
              )}
            </View>
            <TouchableOpacity onPress={detectLocation} style={styles.refreshBtn}>
              <Icon name="refresh" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Spot selection card ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Which spot are you leaving?</Text>
          <TextInput
            style={styles.spotInput}
            placeholder="e.g. A3, B2..."
            placeholderTextColor={COLORS.textSecondary}
            value={spotLabel}
            onChangeText={setSpotLabel}
            autoCapitalize="characters"
            maxLength={6}
          />
          <View style={styles.quickRow}>
            {QUICK_SPOTS.map((qs) => (
              <TouchableOpacity
                key={qs}
                style={[styles.quickPill, spotLabel === qs ? styles.quickPillSelected : null]}
                onPress={() => setSpotLabel(qs)}
              >
                <Text style={[styles.quickPillText, spotLabel === qs ? styles.quickPillTextSelected : null]}>
                  {qs}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Lot selection card ────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Which market / lot?</Text>
          {nearbyLots.map((lot) => {
            const isSelected = selectedLot?.id === lot.id;
            const distKm = lot.distance !== undefined ? lot.distance : null;
            return (
              <TouchableOpacity
                key={lot.id}
                style={[styles.lotOption, isSelected ? styles.lotOptionSelected : null]}
                onPress={() => setSelectedLot(lot)}
              >
                <View style={styles.lotDot}>
                  <View style={[styles.dotInner, isSelected ? styles.dotInnerSelected : null]} />
                </View>
                <Text style={styles.lotName}>{lot.name}</Text>
                {distKm !== null && (
                  <Text style={styles.lotDistance}>{formatDistance(distKm)}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CTA button / Success state ────────────────────── */}
        {isSubmitted ? (
          <Animated.View
            style={[
              styles.successCard,
              {
                transform: [{ translateY: successSlide }],
                opacity: successOpacity,
              },
            ]}
          >
            <View style={styles.successCheck}>
              <Text style={styles.successCheckText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Spot reported!</Text>
            <Text style={styles.successCoins}>You earned 10 ParkCoins 🪙</Text>
            <Animated.Text style={styles.successBalance}>
              {coinCounter.interpolate({
                inputRange: [coinBalance - 10, coinBalance],
                outputRange: [(coinBalance - 10).toString(), coinBalance.toString()],
                extrapolate: 'clamp',
              })}
            </Animated.Text>
            <TouchableOpacity onPress={handleReportAnother} style={styles.reportAnotherBtn}>
              <Text style={styles.reportAnotherText}>Report another spot</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={[styles.ctaButton, !canSubmit ? styles.ctaButtonDisabled : null]}
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmitReport}
          >
            <View style={styles.ctaGradientOverlay} pointerEvents="none" />
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.textPrimary} size="small" />
            ) : (
              <Text style={styles.ctaButtonText}>I'm leaving this spot 🚗</Text>
            )}
          </TouchableOpacity>
        )}

        {/* ── Recent reports ────────────────────────────────── */}
        {recentReports.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>RECENT REPORTS NEARBY</Text>
            <FlatList
              data={recentReports}
              keyExtractor={(item) => item.id}
              renderItem={renderReport}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.reportSeparator} />}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  headerSpacer: { width: 24 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  // How it works
  howCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  coinIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B3522',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinEmoji: { fontSize: 22 },
  earnTitle: {
    color: COLORS.coins,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  earnDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
  },
  // Generic card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: { marginTop: 2, marginRight: 10 },
  locationText: { flex: 1 },
  locationLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  locationAddress: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  locationLoader: { marginTop: 4 },
  refreshBtn: { padding: 4, marginLeft: 8 },
  // Spot input
  spotInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  quickPillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  quickPillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  quickPillTextSelected: {
    color: COLORS.textPrimary,
  },
  // Lot selection
  lotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  lotOptionSelected: {
    borderColor: COLORS.primary,
  },
  lotDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  dotInnerSelected: {
    backgroundColor: COLORS.primary,
  },
  lotName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  lotDistance: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  // CTA button
  ctaButton: {
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    backgroundColor: COLORS.card,
  },
  ctaGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.25,
    height: '50%',
    top: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  ctaButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  // Success state
  successCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B98122',
    borderWidth: 2,
    borderColor: COLORS.available,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successCheckText: {
    color: COLORS.available,
    fontSize: 26,
    fontWeight: '700',
  },
  successTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  successCoins: {
    color: COLORS.coins,
    fontSize: 14,
    marginBottom: 8,
  },
  successBalance: {
    color: COLORS.coins,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
  },
  reportAnotherBtn: { paddingVertical: 4 },
  reportAnotherText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  // Recent reports
  recentSection: { marginTop: 8 },
  recentTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  reportCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spotBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 10,
  },
  spotBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  reportLotName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  reportRight: { alignItems: 'flex-end' },
  reportTimeAgo: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  reportCoins: {
    color: COLORS.coins,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  reportSeparator: { height: 8 },
});

export default CommunityReportScreen;
