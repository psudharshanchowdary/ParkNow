// Built Day 14
/**
 * @file ParkCoinsWalletScreen.js
 * @description ParkCoins wallet tab screen showing balance, earn methods,
 *              referral code sharing, and full transaction history with filters.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  Share,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import * as coinsService from '../../services/coinsService';
import { formatTimeAgo, formatCoinReason } from '../../utils/formatters';

const FILTER_TABS = ['All', 'Earned', 'Spent'];

/** Maps a transaction reason to an emoji icon. */
const reasonIcon = (reason) => {
  const map = {
    community_report: '🗺️',
    'Community Report Reward': '🗺️',
    booking_reward: '🅿️',
    'Booking Reward': '🅿️',
    referral: '👥',
    payment_discount: '💳',
  };
  return map[reason] || '🪙';
};

/** ParkCoinsWalletScreen functional component (tab screen — no back arrow). */
const ParkCoinsWalletScreen = () => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_user_id';

  // ── State ────────────────────────────────────────────────────────────────────
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // ── Animation ref (useNativeDriver: false for text interpolation) ────────────
  const animatedBalance = useRef(new Animated.Value(0)).current;

  /** Starts balance count-up animation from 0 to actual balance. */
  const startCountUp = useCallback((toValue) => {
    animatedBalance.setValue(0);
    Animated.timing(animatedBalance, {
      toValue,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [animatedBalance]);

  // Fetch stats on mount
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const stats = await coinsService.getCoinStats(uid);
        if (!isMounted) return;
        setBalance(stats.balance);
        setTotalEarned(stats.totalEarned);
        setTotalSpent(stats.totalSpent);
        setLoading(false);
        startCountUp(stats.balance);
      } catch (_e) {
        if (!isMounted) return;
        setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [uid, startCountUp]);

  // Subscribe to transaction history
  useEffect(() => {
    const unsubscribe = coinsService.subscribeCoinHistory(uid, (txns) => {
      setTransactions(txns);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [uid]);

  /** Returns filtered transaction list based on the active tab. */
  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'Earned') return transactions.filter((t) => t.type === 'earn');
    if (activeFilter === 'Spent') return transactions.filter((t) => t.type === 'spend');
    return transactions;
  }, [transactions, activeFilter]);

  /** Generates and shares the user's referral code. */
  const handleShareReferral = useCallback(async () => {
    const code = `PARK${uid.slice(0, 4).toUpperCase()}`;
    try {
      await Share.share({
        message: `Use my ParkNow referral code ${code} to get 50 ParkCoins on your first booking! 🚗🪙`,
      });
    } catch (_e) {}
  }, [uid]);

  /** Renders a single transaction row. */
  const renderTransaction = useCallback(({ item }) => {
    const isEarn = item.type === 'earn';
    const icon = reasonIcon(item.reason);
    const label = formatCoinReason(item.reason);
    const timeStr = formatTimeAgo(item.createdAt);
    const amountStr = isEarn ? `+${item.amount}` : `-${Math.abs(item.amount)}`;
    const amountColor = isEarn ? COLORS.coins : COLORS.occupied;
    const iconBg = isEarn ? '#10B98122' : '#FF3B5C22';

    return (
      <View style={styles.txnCard}>
        <View style={[styles.txnIconCircle, { backgroundColor: iconBg }]}>
          <Text style={styles.txnIconEmoji}>{icon}</Text>
        </View>
        <View style={styles.txnCenter}>
          <Text style={styles.txnLabel}>{label}</Text>
          <Text style={styles.txnDate}>{timeStr}</Text>
        </View>
        <Text style={[styles.txnAmount, { color: amountColor }]}>{amountStr}</Text>
      </View>
    );
  }, []);

  /** Rendered when no transactions match the current filter. */
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🪙</Text>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>Start earning by reporting free spots</Text>
    </View>
  ), []);

  // Interpolated display string for the animated balance number
  const displayBalance = animatedBalance.interpolate({
    inputRange: [0, Math.max(balance, 1)],
    outputRange: ['0', balance.toString()],
    extrapolate: 'clamp',
  });

  const referralCode = `PARK${uid.slice(0, 4).toUpperCase()}`;

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ParkCoins</Text>
        <TouchableOpacity onPress={() => setShowTooltip(true)} style={styles.infoBtn}>
          <Icon name="information-circle-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id?.toString() || item.reason + item.amount}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Balance Hero Card ─────────────────────────── */}
            <View style={styles.heroCard}>
              {/* Subtle dot pattern */}
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dotDecor,
                    {
                      top: (i % 3) * 40 + 10,
                      left: i < 3 ? 20 + i * 50 : 120 + (i - 3) * 50,
                    },
                  ]}
                />
              ))}

              <View style={styles.heroIconCircle}>
                <Text style={styles.heroEmoji}>🪙</Text>
              </View>

              {loading ? (
                <ActivityIndicator color={COLORS.coins} size="large" style={styles.balanceLoader} />
              ) : (
                <Animated.Text style={styles.balanceText}>{displayBalance}</Animated.Text>
              )}

              <Text style={styles.balanceLabel}>ParkCoins</Text>
              <Text style={styles.balanceValue}>= ₹{Math.floor(balance / 10)} discount value</Text>

              <View style={styles.heroDivider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total earned</Text>
                  <Text style={styles.statValue}>{totalEarned}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total spent</Text>
                  <Text style={styles.statValue}>{totalSpent}</Text>
                </View>
              </View>
            </View>

            {/* ── Ways to earn ─────────────────────────────── */}
            <Text style={styles.sectionTitle}>WAYS TO EARN</Text>

            {[
              {
                emoji: '🗺️',
                iconBg: COLORS.coins,
                title: 'Report a free spot',
                sub: 'Help the community',
                reward: '+10 coins',
              },
              {
                emoji: '🅿️',
                iconBg: COLORS.primary,
                title: 'Complete a booking',
                sub: 'Park with ParkNow',
                reward: '+5 coins',
              },
              {
                emoji: '👥',
                iconBg: COLORS.gold,
                title: 'Refer a friend',
                sub: 'Share your code',
                reward: '+50 coins',
                rewardColor: COLORS.gold,
              },
            ].map((item) => (
              <View key={item.title} style={styles.earnCard}>
                <View style={[styles.earnIconCircle, { backgroundColor: item.iconBg + '33' }]}>
                  <Text style={styles.earnEmoji}>{item.emoji}</Text>
                </View>
                <View style={styles.earnInfo}>
                  <Text style={styles.earnTitle}>{item.title}</Text>
                  <Text style={styles.earnSub}>{item.sub}</Text>
                </View>
                <Text style={[styles.earnReward, { color: item.rewardColor || COLORS.coins }]}>
                  {item.reward}
                </Text>
              </View>
            ))}

            {/* Referral share button */}
            <TouchableOpacity style={styles.referralBtn} onPress={handleShareReferral}>
              <Text style={styles.referralBtnText}>Share code: {referralCode}</Text>
            </TouchableOpacity>

            {/* ── Filter tabs ──────────────────────────────── */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>HISTORY</Text>
            <View style={styles.filterRow}>
              {FILTER_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
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
              ))}
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View style={styles.txnSeparator} />}
      />

      {/* ── Tooltip Modal ─────────────────────────────────── */}
      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipTitle}>About ParkCoins</Text>
            <Text style={styles.tooltipItem}>🪙  10 ParkCoins = ₹1 discount on bookings</Text>
            <Text style={styles.tooltipItem}>🔒  Maximum 30% discount per booking</Text>
            <Text style={styles.tooltipItem}>♾️  Coins never expire</Text>
            <TouchableOpacity
              style={styles.tooltipCloseBtn}
              onPress={() => setShowTooltip(false)}
            >
              <Text style={styles.tooltipCloseTxt}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  infoBtn: { padding: 4 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Hero card
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dotDecor: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED15',
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B3522',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroEmoji: { fontSize: 30 },
  balanceLoader: { marginVertical: 12 },
  balanceText: {
    color: COLORS.coins,
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 60,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  balanceValue: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  heroDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: { alignItems: 'center' },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Section title
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Earn cards
  earnCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  earnIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earnEmoji: { fontSize: 20 },
  earnInfo: { flex: 1 },
  earnTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  earnSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  earnReward: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Referral button
  referralBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  referralBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.textPrimary,
  },
  // Transaction card
  txnCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnIconEmoji: { fontSize: 18 },
  txnCenter: { flex: 1 },
  txnLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  txnDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  txnSeparator: { height: 8 },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  // Tooltip modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tooltipCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tooltipTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  tooltipItem: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  tooltipCloseBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipCloseTxt: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ParkCoinsWalletScreen;
