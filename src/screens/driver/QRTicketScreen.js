// Built Day 13
/**
 * @file QRTicketScreen.js
 * @description Booking confirmation screen showing a QR code ticket, booking
 *              details, ParkCoins earned, share, and navigation actions.
 *              Uses navigation.replace — no back navigation to Payment screen.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Animated,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { getBookingWithLotDetails } from '../../services/bookingService';
import { formatBookingDate, shortBookingId } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** QRTicketScreen functional component — replaces Payment in the stack. */
const QRTicketScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Animated values (all useRef per code quality rules) ---
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring1Loop = useRef(null);
  const ring2Loop = useRef(null);

  /** Starts the success checkmark spring-in animation. */
  const startCheckmarkAnimation = useCallback(() => {
    Animated.spring(checkmarkScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [checkmarkScale]);

  /** Starts the two pulsing ring loop animations with staggered delays. */
  const startRingAnimations = useCallback(() => {
    ring1Loop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1Scale, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(ring1Scale, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    ring1Loop.current.start();

    setTimeout(() => {
      ring2Loop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(ring2Scale, {
            toValue: 1.12,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(ring2Scale, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      ring2Loop.current.start();
    }, 400);
  }, [ring1Scale, ring2Scale]);

  // Fetch booking on mount and kick off animations
  useEffect(() => {
    let isMounted = true;

    const fetchBooking = async () => {
      try {
        const data = await getBookingWithLotDetails(bookingId);
        if (!isMounted) return;
        if (data) {
          setBooking(data);
          setLoading(false);
          startCheckmarkAnimation();
          startRingAnimations();
        } else {
          setError('Booking not found. Please contact support.');
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load booking details.');
        setLoading(false);
      }
    };

    fetchBooking();

    // Cleanup: stop all loop animations on unmount
    return () => {
      isMounted = false;
      if (ring1Loop.current) ring1Loop.current.stop();
      if (ring2Loop.current) ring2Loop.current.stop();
    };
  }, [bookingId, startCheckmarkAnimation, startRingAnimations]);

  /** Navigates to NavigationScreen with lot coordinates. */
  const handleNavigateToLot = useCallback(() => {
    if (!booking) return;
    navigation.navigate('NavigationScreen', {
      lotId: booking.lotId,
      lotName: booking.lotName,
      lotLat: booking.lotLat,
      lotLng: booking.lotLng,
      spotLabel: booking.spotLabel,
    });
  }, [booking, navigation]);

  /** Navigates to the user's bookings list. */
  const handleViewAllBookings = useCallback(() => {
    navigation.navigate('MyBookingsScreen');
  }, [navigation]);

  /** Opens the native share sheet with booking summary text. */
  const handleShareTicket = useCallback(async () => {
    if (!booking) return;
    try {
      await Share.share({
        message:
          `ParkNow Booking\n` +
          `Spot: ${booking.spotLabel}\n` +
          `Lot: ${booking.lotName}\n` +
          `Date: ${formatBookingDate(booking.date)}\n` +
          `Time: ${booking.startTime}\n` +
          `Booking ID: ${booking.id}`,
      });
    } catch (err) {
      // Silent catch — share cancelled by user
    }
  }, [booking]);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading your ticket…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={COLORS.occupied} />
          <Text style={styles.errorText}>{error || 'Booking not found.'}</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('HomeMapScreen')}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = formatBookingDate(booking.date);
  const shortId = shortBookingId(booking.id);

  // ─── Main ticket UI ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Success Hero ─────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Animated.View
            style={[styles.checkmarkCircle, { transform: [{ scale: checkmarkScale }] }]}
          >
            <Text style={styles.checkmarkText}>✓</Text>
          </Animated.View>
          <Text style={styles.confirmedTitle}>Booking confirmed!</Text>
          <Text style={styles.confirmedSubtitle}>Your spot is reserved</Text>
        </View>

        {/* ── QR Code Card with pulsing rings ──────────────── */}
        <View style={styles.qrSection}>
          {/* Ring 2 (outer, more transparent) */}
          <Animated.View
            style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: ring2Scale }] }]}
          />
          {/* Ring 1 (inner) */}
          <Animated.View
            style={[styles.pulseRing, styles.pulseRing1, { transform: [{ scale: ring1Scale }] }]}
          />

          {/* White QR card */}
          <View style={styles.qrCard}>
            <QRCode
              value={booking.id || 'ParkNow-Booking'}
              size={200}
              backgroundColor="#FFFFFF"
              color="#0D0D14"
            />
          </View>
        </View>

        <Text style={styles.qrScanHint}>Scan at entry gate</Text>
        <Text style={styles.qrValidHint}>Valid for 24 hours</Text>

        {/* ── Booking Details Card ──────────────────────────── */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Booking details</Text>
          <View style={styles.divider} />

          {[
            { label: 'Spot', value: `Spot ${booking.spotLabel}`, valueStyle: null },
            { label: 'Lot', value: booking.lotName, valueStyle: null },
            { label: 'Date', value: formattedDate, valueStyle: null },
            { label: 'Time', value: booking.startTime, valueStyle: null },
            {
              label: 'Duration',
              value: `${booking.duration} ${booking.duration === 1 ? 'hour' : 'hours'}`,
              valueStyle: null,
            },
            {
              label: 'Amount paid',
              value: `₹${booking.totalAmount}`,
              valueStyle: styles.valueViolet,
            },
            {
              label: 'Booking ID',
              value: shortId,
              valueStyle: styles.valueSmall,
            },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.detailRow, i < arr.length - 1 ? styles.detailRowBorder : null]}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={[styles.detailValue, row.valueStyle]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── ParkCoins Earned Banner ───────────────────────── */}
        <View style={styles.coinsBanner}>
          <Icon name="disc" size={20} color={COLORS.coins} style={styles.coinsIcon} />
          <View>
            <Text style={styles.coinsEarnedText}>+5 ParkCoins earned!</Text>
            <Text style={styles.coinsSubtext}>for completing this booking</Text>
          </View>
        </View>

        {/* ── Action Buttons ────────────────────────────────── */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleNavigateToLot}>
          <Icon name="navigate" size={18} color={COLORS.textPrimary} style={styles.btnIcon} />
          <Text style={styles.primaryButtonText}>Navigate to lot</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleViewAllBookings}>
          <Text style={styles.secondaryButtonText}>View all bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShareTicket}>
          <Text style={styles.shareButtonText}>Share ticket</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  homeButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmarkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B98122',
    borderWidth: 2,
    borderColor: COLORS.available,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: COLORS.available,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  confirmedTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  confirmedSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  // QR
  qrSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 20,
  },
  pulseRing1: {
    width: 260,
    height: 260,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    opacity: 0.5,
  },
  pulseRing2: {
    width: 290,
    height: 290,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    opacity: 0.3,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  qrScanHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  qrValidHint: {
    color: COLORS.border,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  // Details Card
  detailsCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  detailsTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  valueViolet: {
    color: COLORS.primary,
  },
  valueSmall: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '400',
  },
  // Coins banner
  coinsBanner: {
    width: '100%',
    backgroundColor: COLORS.coinsAlpha,
    borderWidth: 1,
    borderColor: COLORS.coinsBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  coinsIcon: {
    marginRight: 10,
  },
  coinsEarnedText: {
    color: COLORS.coins,
    fontSize: 14,
    fontWeight: '600',
  },
  coinsSubtext: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  // Buttons
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  btnIcon: {
    marginRight: 4,
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  shareButton: {
    paddingVertical: 8,
  },
  shareButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default QRTicketScreen;
