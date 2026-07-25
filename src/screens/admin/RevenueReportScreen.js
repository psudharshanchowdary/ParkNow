// Built Day 17
/**
 * @file RevenueReportScreen.js
 * @description Admin revenue analytics screen with animated pure-RN bar chart,
 *              period selector, summary metrics, payment breakdown, and
 *              recent transactions list.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import { getRevenueForPeriod, getBookingsByPeriod } from '../../services/bookingService';
import {
  formatChartRevenue,
  formatTimeAgo,
  percentageChange,
} from '../../utils/formatters';

const CHART_HEIGHT = 150;
const MAX_BARS = 7;
const PERIODS = ['Today', '7 days', '30 days', '3 months'];

/** Returns start/end Date objects for a period label. */
const getPeriodDates = (period) => {
  const now = new Date();
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  switch (period) {
    case 'Today': break;
    case '7 days': start.setDate(now.getDate() - 7); break;
    case '30 days': start.setDate(now.getDate() - 30); break;
    case '3 months': start.setDate(now.getDate() - 90); break;
    default: start.setDate(now.getDate() - 7);
  }
  return { start, end };
};

/** Returns previous period dates for comparison. */
const getPreviousPeriodDates = (period) => {
  const { start, end } = getPeriodDates(period);
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: new Date(start.getTime()),
  };
};

/** Builds bar chart data array for the given period and revenue data. */
const buildChartData = (period, byDay, byHour) => {
  if (period === 'Today') {
    const hours = [8, 10, 12, 14, 16, 18, 20];
    return hours.map((h) => {
      const found = (byHour || []).find((x) => x.hour === h);
      const label = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
      return { label, revenue: found?.revenue || 0 };
    });
  }
  if (period === '30 days') {
    const weeks = ['W1', 'W2', 'W3', 'W4'];
    return weeks.map((w, i) => {
      const daySlice = (byDay || []).slice(i * 2, i * 2 + 2);
      return { label: w, revenue: daySlice.reduce((s, d) => s + d.revenue, 0) };
    });
  }
  if (period === '3 months') {
    const months = ['M1', 'M2', 'M3'];
    return months.map((m, i) => {
      const daySlice = (byDay || []).slice(i * 2, i * 2 + 2);
      return { label: m, revenue: daySlice.reduce((s, d) => s + d.revenue, 0) };
    });
  }
  return byDay || [];
};

/** RevenueReportScreen functional component. */
const RevenueReportScreen = () => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_admin_id';

  const [activePeriod, setActivePeriod] = useState('7 days');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState({
    total: 0, bookingsCount: 0, byDay: [], byHour: [], bookings: [],
  });
  const [prevRevenue, setPrevRevenue] = useState(0);
  const [selectedBar, setSelectedBar] = useState(null);
  const [adminLotId, setAdminLotId] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);

  const barAnims = useRef(
    Array.from({ length: MAX_BARS }, () => new Animated.Value(0))
  ).current;

  // Fetch admin's lot ID
  useEffect(() => {
    let isMounted = true;
    const fetchLot = async () => {
      try {
        const doc = await firestore().collection('users').doc(uid).get();
        if (!isMounted) return;
        setAdminLotId(doc.exists && doc.data()?.lotId ? doc.data().lotId : 'lot_001');
      } catch (_e) {
        if (isMounted) setAdminLotId('lot_001');
      }
    };
    fetchLot();
    return () => { isMounted = false; };
  }, [uid]);

  /** Animates bar heights from 0 to their target values using stagger. */
  const animateBars = useCallback((chartData) => {
    const maxRev = Math.max(...chartData.map((d) => d.revenue), 1);
    const animations = barAnims.slice(0, chartData.length).map((anim, i) => {
      const targetH = Math.max(
        (chartData[i].revenue / maxRev) * CHART_HEIGHT,
        chartData[i].revenue > 0 ? 4 : 0
      );
      anim.setValue(0);
      return Animated.timing(anim, {
        toValue: targetH,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    });
    Animated.stagger(50, animations).start();
  }, [barAnims]);

  // Fetch revenue data when period or lot changes
  useEffect(() => {
    if (!adminLotId) return;
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setSelectedBar(null);
      try {
        const { start, end } = getPeriodDates(activePeriod);
        const { start: prevStart, end: prevEnd } = getPreviousPeriodDates(activePeriod);

        const [data, prevBookings] = await Promise.all([
          getRevenueForPeriod(adminLotId, start, end),
          getBookingsByPeriod(adminLotId, prevStart, prevEnd),
        ]);

        if (!isMounted) return;
        const prevTotal = prevBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
        setRevenueData(data);
        setPrevRevenue(prevTotal);
        setRecentTxns((data.bookings || []).slice(0, 8));

        const chartData = buildChartData(activePeriod, data.byDay, data.byHour);
        animateBars(chartData);
      } catch (_e) {}
      if (isMounted) setLoading(false);
    };
    fetchData();
    return () => { isMounted = false; };
  }, [activePeriod, adminLotId, animateBars]);

  const chartData = useMemo(
    () => buildChartData(activePeriod, revenueData.byDay, revenueData.byHour),
    [activePeriod, revenueData]
  );

  const summary = useMemo(() => {
    const avg = revenueData.bookingsCount > 0
      ? Math.round(revenueData.total / revenueData.bookingsCount)
      : 0;
    const bestBar = chartData.reduce(
      (best, cur) => (cur.revenue > best.revenue ? cur : best),
      { label: '—', revenue: 0 }
    );
    const peakHour = (revenueData.byHour || []).reduce(
      (best, cur) => (cur.revenue > best.revenue ? cur : best),
      { label: '—', revenue: 0 }
    );
    return { avg, bestDay: bestBar.label, peakHour: peakHour.label };
  }, [chartData, revenueData]);

  const pctChange = percentageChange(revenueData.total, prevRevenue);
  const pctIsPositive = pctChange.startsWith('+');

  const maxRevenue = useMemo(
    () => Math.max(...chartData.map((d) => d.revenue), 1),
    [chartData]
  );

  const yLabels = useMemo(() => {
    const step = Math.ceil(maxRevenue / 4 / 100) * 100 || 250;
    return [step * 4, step * 3, step * 2, step, 0];
  }, [maxRevenue]);

  const paymentBreakdown = useMemo(() => {
    const bookings = revenueData.bookings || [];
    let upi = 0, card = 0, wallet = 0;
    bookings.forEach((b) => {
      const m = (b.paymentMethod || 'upi').toLowerCase();
      if (m === 'card') card += b.totalAmount || 0;
      else if (m === 'wallet') wallet += b.totalAmount || 0;
      else upi += b.totalAmount || 0;
    });
    const total = upi + card + wallet || 1;
    return [
      { label: 'UPI', pct: Math.round((upi / total) * 100), color: COLORS.primary },
      { label: 'Card', pct: Math.round((card / total) * 100), color: '#38BDF8' },
      { label: 'Wallet', pct: Math.round((wallet / total) * 100), color: COLORS.gold },
    ];
  }, [revenueData.bookings]);

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  /** Renders a single recent transaction row. */
  const renderTxn = useCallback(({ item }) => (
    <View style={styles.txnRow}>
      <View style={styles.txnAvatar}>
        <Text style={styles.txnInitials}>
          {getInitials(item.driverName || item.userName || '')}
        </Text>
      </View>
      <View style={styles.txnCenter}>
        <Text style={styles.txnName}>{item.driverName || item.userName || 'Driver'}</Text>
        <Text style={styles.txnMeta}>Spot {item.spotLabel || '—'} · {formatTimeAgo(item.createdAt)}</Text>
      </View>
      <View style={styles.txnRight}>
        <Text style={styles.txnAmount}>₹{item.totalAmount || 0}</Text>
        <Text style={styles.txnMethod}>{item.paymentMethod || 'UPI'}</Text>
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Revenue</Text>
        <TouchableOpacity onPress={() => Alert.alert('Export', 'Exporting report...')}>
          <Icon name="download-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recentTxns}
        keyExtractor={(item) => item.id?.toString() || String(Math.random())}
        renderItem={renderTxn}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <>
            {/* Period tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.periodRow}
              contentContainerStyle={styles.periodContent}
            >
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, activePeriod === p ? styles.periodTabActive : null]}
                  onPress={() => setActivePeriod(p)}
                >
                  <Text style={[styles.periodTabText, activePeriod === p ? styles.periodTabTextActive : null]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Hero revenue card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Total revenue</Text>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 12 }} />
              ) : (
                <>
                  <Text style={styles.heroAmount}>₹{revenueData.total.toLocaleString('en-IN')}</Text>
                  <View style={styles.heroMeta}>
                    <Text style={styles.heroMetaLeft}>{revenueData.bookingsCount} bookings</Text>
                    <View style={styles.heroMetaRight}>
                      <Icon
                        name={pctIsPositive ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={pctIsPositive ? COLORS.available : COLORS.occupied}
                      />
                      <Text style={[styles.heroPct, { color: pctIsPositive ? COLORS.available : COLORS.occupied }]}>
                        {' '}{pctChange} vs last period
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Bar chart */}
            <View style={styles.chartContainer}>
              <View style={styles.yAxis}>
                {yLabels.map((val) => (
                  <Text key={val} style={styles.yLabel}>{formatChartRevenue(val)}</Text>
                ))}
              </View>
              <View style={styles.barsArea}>
                {chartData.map((item, index) => {
                  const isSelected = selectedBar === index;
                  const barH = barAnims[index] || new Animated.Value(0);
                  return (
                    <TouchableOpacity
                      key={`${item.label}-${index}`}
                      style={styles.barWrapper}
                      onPress={() => setSelectedBar(isSelected ? null : index)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <View style={styles.tooltip}>
                          <Text style={styles.tooltipAmount}>{formatChartRevenue(item.revenue)}</Text>
                          <Text style={styles.tooltipLabel}>{item.label}</Text>
                          <View style={styles.tooltipArrow} />
                        </View>
                      )}
                      <View style={styles.barTrack}>
                        <Animated.View
                          style={[
                            styles.bar,
                            { height: barH, backgroundColor: isSelected ? COLORS.primaryLight : COLORS.primary },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Summary metrics */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>₹{summary.avg}</Text>
                <Text style={styles.summaryLabel}>Avg per booking</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: COLORS.gold }]}>{summary.bestDay}</Text>
                <Text style={styles.summaryLabel}>Best day</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{summary.peakHour}</Text>
                <Text style={styles.summaryLabel}>Peak hour</Text>
              </View>
            </View>

            {/* Payment breakdown */}
            <Text style={styles.sectionTitle}>Bookings breakdown</Text>
            <View style={styles.breakdownCard}>
              {paymentBreakdown.map((item) => (
                <View key={item.label} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <View style={styles.breakdownTrack}>
                    <View style={[styles.breakdownFill, { width: `${item.pct}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.breakdownPct}>{item.pct}%</Text>
                </View>
              ))}
            </View>

            {/* Recent transactions header */}
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent transactions</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {!loading && recentTxns.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No bookings in this period</Text>
                <Text style={styles.emptySubtitle}>Revenue will appear here once bookings are made</Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  periodRow: { marginBottom: 12 },
  periodContent: { gap: 8, paddingRight: 4 },
  periodTab: {
    backgroundColor: COLORS.card, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  periodTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodTabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  periodTabTextActive: { color: COLORS.textPrimary },
  heroCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  heroLabel: { color: COLORS.textSecondary, fontSize: 13 },
  heroAmount: { color: COLORS.textPrimary, fontSize: 36, fontWeight: '800', marginTop: 8 },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  heroMetaLeft: { color: COLORS.textSecondary, fontSize: 13 },
  heroMetaRight: { flexDirection: 'row', alignItems: 'center' },
  heroPct: { fontSize: 13 },
  chartContainer: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, flexDirection: 'row', height: 220,
    borderWidth: 1, borderColor: COLORS.border,
  },
  yAxis: { width: 36, justifyContent: 'space-between', paddingBottom: 20 },
  yLabel: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'right' },
  barsArea: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-around', paddingBottom: 20, paddingLeft: 4,
  },
  barWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
  barTrack: { width: '70%', height: CHART_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
  tooltip: {
    position: 'absolute', top: -52, backgroundColor: COLORS.card,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    zIndex: 10, minWidth: 48,
  },
  tooltipAmount: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  tooltipLabel: { color: COLORS.textSecondary, fontSize: 10 },
  tooltipArrow: {
    position: 'absolute', bottom: -5, width: 8, height: 8,
    backgroundColor: COLORS.card, borderRightWidth: 1,
    borderBottomWidth: 1, borderColor: COLORS.border,
    transform: [{ rotate: '45deg' }],
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  summaryValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'center' },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  breakdownCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    marginBottom: 16, gap: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownLabel: { color: COLORS.textPrimary, fontSize: 13, width: 44 },
  breakdownTrack: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 4 },
  breakdownPct: { color: COLORS.textSecondary, fontSize: 13, width: 32, textAlign: 'right' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { color: COLORS.primary, fontSize: 13 },
  txnRow: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  txnAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C3AED22',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  txnInitials: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  txnCenter: { flex: 1 },
  txnName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  txnMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  txnMethod: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});

export default RevenueReportScreen;
