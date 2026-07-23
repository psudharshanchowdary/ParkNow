// Built Day 15
/**
 * @file BookingsHistoryScreen.js
 * @description Displays the driver's complete booking history with live updates,
 *              per-status filter tabs, countdown timer for upcoming bookings,
 *              and pull-to-refresh.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import { subscribeUserBookings } from '../../services/bookingService';
import { formatBookingDate, formatCountdown } from '../../utils/formatters';

const FILTER_TABS = ['All', 'Upcoming', 'Active', 'Completed', 'Cancelled'];

/** Returns true if the booking is in "upcoming" state (confirmed, not started yet). */
const isUpcoming = (b) => {
  if (b.status !== 'confirmed') return false;
  const start = getStartDateTime(b);
  return start > Date.now();
};

/** Returns true if the booking is currently "active" (started but not ended). */
const isActive = (b) => {
  if (b.status !== 'confirmed') return false;
  const start = getStartDateTime(b);
  const end = start + (b.duration || 1) * 3600 * 1000;
  const now = Date.now();
  return start <= now && end > now;
};

/**
 * Derives a numeric start timestamp from booking fields.
 * Supports Firestore Timestamp, ISO string date + startHour integer.
 */
const getStartDateTime = (booking) => {
  try {
    if (booking.startDateTime) {
      const d = new Date(booking.startDateTime);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const base = booking.date
      ? new Date(booking.date)
      : new Date();
    base.setHours(booking.startHour ?? 9, 0, 0, 0);
    return base.getTime();
  } catch (_e) {
    return Date.now();
  }
};

/** Status badge configuration per booking status string. */
const BADGE_CONFIG = {
  confirmed_upcoming: { label: 'Upcoming', bg: '#F59E0B22', text: COLORS.gold },
  confirmed_active: { label: 'Active', bg: '#10B98122', text: COLORS.available },
  completed: { label: 'Completed', bg: '#25254088', text: COLORS.textSecondary },
  cancelled: { label: 'Cancelled', bg: '#FF3B5C22', text: COLORS.occupied },
  confirmed: { label: 'Confirmed', bg: '#7C3AED22', text: COLORS.primary },
};

/** Resolves the display badge for a booking. */
const getBadge = (booking) => {
  if (booking.status === 'completed') return BADGE_CONFIG.completed;
  if (booking.status === 'cancelled') return BADGE_CONFIG.cancelled;
  if (isUpcoming(booking)) return BADGE_CONFIG.confirmed_upcoming;
  if (isActive(booking)) return BADGE_CONFIG.confirmed_active;
  return BADGE_CONFIG.confirmed;
};

/** BookingsHistoryScreen functional component. */
const BookingsHistoryScreen = ({ navigation }) => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_user_id';

  // ── State ─────────────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Countdown ticker — updates every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to live booking updates
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeUserBookings(uid, (data) => {
      setBookings(data);
      setLoading(false);
      setRefreshing(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [uid]);

  /** Handles pull-to-refresh by re-triggering the subscription. */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The onSnapshot subscription auto-updates; just show indicator briefly
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    switch (activeFilter) {
      case 'Upcoming': return bookings.filter(isUpcoming);
      case 'Active': return bookings.filter(isActive);
      case 'Completed': return bookings.filter((b) => b.status === 'completed');
      case 'Cancelled': return bookings.filter((b) => b.status === 'cancelled');
      default: return bookings;
    }
  }, [bookings, activeFilter, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total: bookings.length,
    upcoming: bookings.filter(isUpcoming).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  }), [bookings, now]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Renderers ─────────────────────────────────────────────────────────────────

  /** Shows a native Alert with full booking details. */
  const handleCardPress = useCallback((booking) => {
    Alert.alert(
      booking.lotName || 'Booking Details',
      `Spot: ${booking.spotLabel}\nDate: ${booking.date ? formatBookingDate(booking.date) : '—'}\nTime: ${booking.startTime || '—'}\nDuration: ${booking.duration || 1} hrs\nAmount: ₹${booking.totalAmount || 0}\nStatus: ${booking.status}`,
      [{ text: 'Close' }]
    );
  }, []);

  /** Renders a single booking card. */
  const renderBooking = useCallback(({ item }) => {
    const badge = getBadge(item);
    const canViewQR = isUpcoming(item) || isActive(item);
    const countdown = isUpcoming(item)
      ? formatCountdown(getStartDateTime(item))
      : null;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.85}
      >
        {/* TOP ROW */}
        <View style={styles.cardTopRow}>
          <Text style={styles.lotName} numberOfLines={1}>{item.lotName || 'Parking Lot'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* MIDDLE ROW */}
        <View style={styles.cardMidRow}>
          <Text style={styles.midText}>🅿️</Text>
          <Text style={styles.midText}> Spot {item.spotLabel}</Text>
          <Text style={styles.midDot}> · </Text>
          <Text style={styles.midText}>{item.date ? formatBookingDate(item.date) : '—'}</Text>
          <Text style={styles.midDot}> · </Text>
          <Text style={styles.midText}>{item.startTime || '—'}</Text>
          <Text style={styles.midDot}> · </Text>
          <Text style={styles.midText}>{item.duration || 1} hrs</Text>
        </View>

        {/* BOTTOM ROW */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.amountText}>₹{item.totalAmount || 0} paid</Text>
          {canViewQR && (
            <TouchableOpacity
              onPress={() => navigation.navigate('QRTicketScreen', { bookingId: item.id })}
            >
              <Text style={styles.viewQRText}>View QR →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* COUNTDOWN (upcoming only) */}
        {countdown && (
          <Text style={styles.countdownText}>{countdown}</Text>
        )}
      </TouchableOpacity>
    );
  }, [handleCardPress, navigation]);

  /** Empty state for the current filter. */
  const renderEmpty = useCallback(() => {
    if (loading) return null;
    const filterLabel = activeFilter === 'All' ? '' : activeFilter.toLowerCase() + ' ';
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIconText}>🅿️</Text>
        </View>
        <Text style={styles.emptyTitle}>No {filterLabel}bookings</Text>
        <Text style={styles.emptySubtitle}>Book your first spot to get started</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('HomeMapScreen')}
        >
          <Text style={styles.emptyBtnText}>Find parking</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, activeFilter, navigation]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Icon name="filter-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id?.toString() || `booking-${Math.random()}`}
        renderItem={renderBooking}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <>
            {/* ── Stats Row ─────────────────────────────────── */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statCount}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statCount, styles.statGold]}>{stats.upcoming}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statCount, styles.statGreen]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>

            {/* ── Filter Tabs ────────────────────────────────── */}
            <FlatList
              horizontal
              data={FILTER_TABS}
              keyExtractor={(tab) => tab}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              renderItem={({ item: tab }) => (
                <TouchableOpacity
                  style={[styles.filterTab, activeFilter === tab ? styles.filterTabActive : null]}
                  onPress={() => setActiveFilter(tab)}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      activeFilter === tab ? styles.filterTabTextActive : null,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.filterList}
            />
          </>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  headerIcon: { padding: 4 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCount: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  statGold: { color: COLORS.gold },
  statGreen: { color: COLORS.available },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  // Filter tabs
  filterList: { marginBottom: 16 },
  filterRow: { gap: 8, paddingRight: 4 },
  filterTab: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.textPrimary,
  },
  // Booking card
  bookingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardMidRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
  },
  midText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  midDot: {
    color: COLORS.border,
    fontSize: 13,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  viewQRText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  countdownText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: { fontSize: 36 },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BookingsHistoryScreen;
