// Built Day 15
/**
 * @file AdminDashboardScreen.js
 * @description Admin dashboard showing real-time occupancy, revenue,
 *              active bookings, quick actions, recent bookings list,
 *              and a live notification banner for new bookings.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import {
  subscribeLotBookingsToday,
  getRecentLotBookings,
} from '../../services/bookingService';
import { getGreeting, percentageChange, formatTimeAgo } from '../../utils/formatters';

/** AdminDashboardScreen functional component. */
const AdminDashboardScreen = ({ navigation }) => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_admin_id';
  const adminName = currentUser?.displayName || 'Admin';

  // ── State ─────────────────────────────────────────────────────────────────────
  const [lotId, setLotId] = useState(null);
  const [lotName, setLotName] = useState('');
  const [lotData, setLotData] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [recentBookings, setRecentBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(3);
  const [bannerBooking, setBannerBooking] = useState(null);
  const [noLotAssigned, setNoLotAssigned] = useState(false);

  // ── Animation refs ────────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bannerY = useRef(new Animated.Value(-60)).current;
  const pulseLoop = useRef(null);
  const bannerTimer = useRef(null);

  /** Starts the infinite opacity pulse on the "Live" indicator. */
  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  /** Slides the banner in then auto-dismisses after 3 seconds. */
  const showBanner = useCallback((booking) => {
    setBannerBooking(booking);
    bannerY.setValue(-60);
    Animated.timing(bannerY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => {
      Animated.timing(bannerY, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setBannerBooking(null));
    }, 3000);
  }, [bannerY]);

  // Start pulse on mount, stop on unmount
  useEffect(() => {
    startPulse();
    return () => {
      if (pulseLoop.current) pulseLoop.current.stop();
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [startPulse]);

  // Fetch admin's lot from Firestore user document
  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      try {
        const doc = await firestore().collection('users').doc(uid).get();
        if (!isMounted) return;
        if (doc.exists && doc.data()?.lotId) {
          setLotId(doc.data().lotId);
          setLotName(doc.data().lotName || 'My Lot');
        } else {
          // Mock fallback for dev — use lot_001
          setLotId('lot_001');
          setLotName('City Centre Mall');
        }
      } catch (_e) {
        if (!isMounted) return;
        setLotId('lot_001');
        setLotName('City Centre Mall');
      }
    };
    fetchAdminData();
    return () => { isMounted = false; };
  }, [uid]);

  // Subscribe to lot occupancy data
  useEffect(() => {
    if (!lotId) return;
    let unsubscribe = () => {};
    try {
      unsubscribe = firestore()
        .collection('lots')
        .doc(lotId)
        .onSnapshot(
          (snap) => {
            if (snap && snap.exists) {
              setLotData(snap.data());
            } else {
              setLotData({
                totalSpots: 20,
                spots: Array.from({ length: 20 }, (_, i) => ({
                  status: i < 14 ? 'available' : 'occupied',
                })),
              });
            }
          },
          (_e) => {
            setLotData({
              totalSpots: 20,
              spots: Array.from({ length: 20 }, (_, i) => ({
                status: i < 14 ? 'available' : 'occupied',
              })),
            });
          }
        );
    } catch (_e) {}
    return () => unsubscribe();
  }, [lotId]);

  // Subscribe to today's bookings
  useEffect(() => {
    if (!lotId) return;
    let previousCount = 0;
    const unsubscribe = subscribeLotBookingsToday(lotId, (bookings) => {
      setTodayBookings(bookings);
      if (bookings.length > previousCount && previousCount > 0) {
        showBanner(bookings[0]);
      }
      previousCount = bookings.length;
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [lotId, showBanner]);

  // Fetch yesterday's revenue for % change
  useEffect(() => {
    if (!lotId) return;
    let isMounted = true;
    const fetchYesterday = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        const snap = await firestore()
          .collection('bookings')
          .where('lotId', '==', lotId)
          .where('createdAt', '>=', yesterday)
          .where('createdAt', '<=', yesterdayEnd)
          .get();
        if (!isMounted) return;
        if (!snap.empty) {
          const rev = snap.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);
          setYesterdayRevenue(rev);
        }
      } catch (_e) {}
    };
    fetchYesterday();
    return () => { isMounted = false; };
  }, [lotId]);

  // Fetch recent 5 bookings
  useEffect(() => {
    if (!lotId) return;
    let isMounted = true;
    const fetchRecent = async () => {
      try {
        const data = await getRecentLotBookings(lotId, 5);
        if (isMounted) setRecentBookings(data);
      } catch (_e) {}
    };
    fetchRecent();
    return () => { isMounted = false; };
  }, [lotId]);

  // ── Derived metrics ───────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = Date.now();
    const spots = lotData?.spots || [];
    const total = lotData?.totalSpots || spots.length || 20;
    const occupied = spots.filter((s) => s.status === 'occupied').length;
    const free = total - occupied;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const activeNow = todayBookings.filter((b) => {
      if (b.status !== 'confirmed') return false;
      const start = b.startDateTime ? new Date(b.startDateTime).getTime() : now - 3600000;
      const end = start + (b.duration || 1) * 3600000;
      return start <= now && end > now;
    }).length;
    return { todayRevenue, activeNow, occupancyPct, occupied, free, total };
  }, [lotData, todayBookings]);

  const revChange = percentageChange(metrics.todayRevenue, yesterdayRevenue);
  const revIsPositive = revChange.startsWith('+');

  /** Renders a pure-RN occupancy ring using rotated half-circle views. */
  const renderRing = useCallback((pct) => {
    const filled = Math.min(Math.max(pct, 0), 100);
    const leftDeg = Math.min(filled * 3.6, 180);
    const rightDeg = Math.max((filled - 50) * 3.6, 0);
    return (
      <View style={styles.ringWrapper}>
        <View style={styles.ringBase} />
        <View style={[styles.ringHalf, styles.ringHalfLeft]}>
          <View style={[styles.ringHalfInner, { transform: [{ rotate: `${leftDeg}deg` }] }]}>
            <View style={styles.ringHalfFill} />
          </View>
        </View>
        {filled > 50 && (
          <View style={[styles.ringHalf, styles.ringHalfRight]}>
            <View style={[styles.ringHalfInner, { transform: [{ rotate: `${rightDeg}deg` }] }]}>
              <View style={styles.ringHalfFill} />
            </View>
          </View>
        )}
        <View style={styles.ringMask} />
        <View style={styles.ringCenter}>
          <Text style={styles.ringPct}>{filled}%</Text>
        </View>
      </View>
    );
  }, []);

  /** Returns 2-character initials from a driver name. */
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  if (noLotAssigned) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.noLotContainer}>
          <Icon name="business-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.noLotTitle}>No lot assigned</Text>
          <Text style={styles.noLotSubtitle}>
            Contact ParkNow support to link your parking lot to this account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* ── Live update banner ───────────────────────────────── */}
      {bannerBooking && (
        <Animated.View style={[styles.liveBanner, { transform: [{ translateY: bannerY }] }]}>
          <Icon name="checkmark-circle" size={16} color={COLORS.available} />
          <Text style={styles.liveBannerText}>
            {' '}New booking! Spot {bannerBooking.spotLabel || '—'} reserved
          </Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => Alert.alert('Notifications', 'No new notifications.')}
          >
            <Icon name="notifications-outline" size={24} color={COLORS.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Greeting card ───────────────────────────────────── */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingLine}>{getGreeting()},</Text>
          <Text style={styles.greetingName}>{adminName} 👋</Text>
          <Text style={styles.greetingLot}>{lotName}</Text>
        </View>

        {/* ── 2×2 Metrics grid ────────────────────────────────── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Today's revenue</Text>
            <Text style={styles.metricValue}>₹{metrics.todayRevenue.toLocaleString('en-IN')}</Text>
            <View style={styles.metricChangeRow}>
              <Icon
                name={revIsPositive ? 'arrow-up' : 'arrow-down'}
                size={11}
                color={revIsPositive ? COLORS.available : COLORS.occupied}
              />
              <Text style={[styles.metricChange, { color: revIsPositive ? COLORS.available : COLORS.occupied }]}>
                {' '}{revChange} vs yesterday
              </Text>
            </View>
          </View>

          <View style={[styles.metricCard, styles.metricCardCenter]}>
            <Text style={styles.metricLabel}>Occupancy</Text>
            {renderRing(metrics.occupancyPct)}
            <Text style={styles.metricLabelSmall}>of spots taken</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active now</Text>
            <Text style={[styles.metricValue, styles.metricGold]}>{metrics.activeNow}</Text>
            <Text style={styles.metricLabelSmall}>bookings</Text>
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Free spots</Text>
            <Text style={[styles.metricValue, styles.metricGreen]}>{metrics.free}</Text>
            <Text style={styles.metricLabelSmall}>available now</Text>
            <Text style={styles.metricLabelXS}>of {metrics.total} total</Text>
          </View>
        </View>

        {/* ── Quick actions ────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionPrimary}
            onPress={() => navigation.navigate('QRScannerScreen')}
          >
            <Icon name="qr-code-outline" size={18} color={COLORS.textPrimary} />
            <Text style={styles.actionPrimaryText}> Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionSecondary}
            onPress={() => navigation.navigate('LiveLotViewScreen')}
          >
            <Icon name="grid-outline" size={18} color={COLORS.textPrimary} />
            <Text style={styles.actionSecondaryText}> View lots</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent bookings ──────────────────────────────────── */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent bookings</Text>
            <TouchableOpacity onPress={() => Alert.alert('All Bookings', 'Coming soon!')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentBookings.length === 0 ? (
            <View style={styles.noRecentCard}>
              <Text style={styles.noRecentText}>No bookings today yet</Text>
            </View>
          ) : (
            recentBookings.map((b) => (
              <View key={b.id} style={styles.recentRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {getInitials(b.driverName || b.userName || '')}
                  </Text>
                </View>
                <View style={styles.recentCenter}>
                  <Text style={styles.recentDriverName}>
                    {b.driverName || b.userName || 'Driver'}
                  </Text>
                  <Text style={styles.recentMeta}>
                    Spot {b.spotLabel || '—'} · {formatTimeAgo(b.createdAt)}
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentAmount}>₹{b.totalAmount || 0}</Text>
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>{b.status || 'confirmed'}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  liveBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#10B98122',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.available,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  liveBannerText: { color: COLORS.available, fontSize: 13, fontWeight: '500' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  bellBtn: { padding: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.occupied,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: COLORS.textPrimary, fontSize: 9, fontWeight: '700' },
  greetingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  greetingLine: { color: COLORS.textSecondary, fontSize: 14 },
  greetingName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '600', marginTop: 2 },
  greetingLot: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metricCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricCardCenter: { alignItems: 'center' },
  metricLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 },
  metricLabelSmall: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  metricLabelXS: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  metricValue: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700' },
  metricGold: { color: COLORS.gold },
  metricGreen: { color: COLORS.available },
  metricChangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metricChange: { fontSize: 11 },
  ringWrapper: {
    width: 80,
    height: 80,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  ringBase: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: COLORS.border,
  },
  ringHalf: { position: 'absolute', width: 80, height: 80, overflow: 'hidden' },
  ringHalfLeft: { left: 0, width: 40 },
  ringHalfRight: { right: 0, width: 40 },
  ringHalfInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  ringHalfFill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: COLORS.primary,
  },
  ringMask: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.card,
  },
  ringCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  ringPct: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.available,
    marginRight: 4,
  },
  liveText: { color: COLORS.available, fontSize: 11, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionPrimary: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPrimaryText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  actionSecondary: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSecondaryText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },
  recentSection: { marginBottom: 8 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  seeAll: { color: COLORS.primary, fontSize: 13 },
  noRecentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noRecentText: { color: COLORS.textSecondary, fontSize: 13 },
  recentRow: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  recentCenter: { flex: 1 },
  recentDriverName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  recentMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  recentRight: { alignItems: 'flex-end' },
  recentAmount: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  recentBadge: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 2,
    backgroundColor: '#10B98122',
  },
  recentBadgeText: { fontSize: 10, fontWeight: '500', color: COLORS.available },
  noLotContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  noLotTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' },
  noLotSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default AdminDashboardScreen;
