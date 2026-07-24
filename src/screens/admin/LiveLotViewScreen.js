// Built Day 16
/**
 * @file LiveLotViewScreen.js
 * @description Admin screen showing a real-time grid of all parking spots
 *              with color-coded status, tappable bottom sheet for occupied/reserved
 *              spots, and a FAB to launch the QR scanner.
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
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import { subscribeToSpots, updateSpotStatus } from '../../services/parkingService';
import { shortBookingId, formatEndTime } from '../../utils/formatters';
import { MOCK_SPOTS } from '../../utils/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPOT_SIZE = Math.floor((SCREEN_WIDTH - 32 - 18) / 4);

const FLOOR_TABS = ['Ground'];

/** Returns background color for a spot cell based on its status. */
const spotBg = (status) => {
  if (status === 'available') return COLORS.available;
  if (status === 'occupied') return COLORS.occupied;
  if (status === 'reserved') return COLORS.gold;
  return COLORS.card;
};

/** Returns the indicator shown under the spot label. */
const spotIcon = (status) => {
  if (status === 'available') return '●';
  if (status === 'occupied') return '●';
  if (status === 'reserved') return '⏳';
  return '';
};

/** LiveLotViewScreen functional component. */
const LiveLotViewScreen = ({ navigation }) => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_admin_id';

  const [lotId, setLotId] = useState(null);
  const [lotName, setLotName] = useState('Lot');
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [activeFloor, setActiveFloor] = useState('Ground');
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [spotBooking, setSpotBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const bottomSheetRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  // Pulse animation for live dot
  useEffect(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
    return () => { if (pulseLoop.current) pulseLoop.current.stop(); };
  }, [pulseAnim]);

  // Fetch admin's lot ID
  useEffect(() => {
    let isMounted = true;
    const fetchLot = async () => {
      try {
        const doc = await firestore().collection('users').doc(uid).get();
        if (!isMounted) return;
        if (doc.exists && doc.data()?.lotId) {
          setLotId(doc.data().lotId);
          setLotName(doc.data().lotName || 'Lot');
        } else {
          setLotId('lot_001');
          setLotName('City Centre Mall');
        }
      } catch (_e) {
        if (!isMounted) return;
        setLotId('lot_001');
        setLotName('City Centre Mall');
      }
    };
    fetchLot();
    return () => { isMounted = false; };
  }, [uid]);

  // Subscribe to live spot updates
  useEffect(() => {
    if (!lotId) return;
    const unsubscribe = subscribeToSpots(lotId, (data) => {
      setSpots(data.length > 0 ? data : MOCK_SPOTS[lotId] || []);
      setLastUpdated(Date.now());
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [lotId]);

  /** Fetches the active booking for the selected spot. */
  const fetchSpotBooking = useCallback(async (spot) => {
    setLoadingBooking(true);
    setSpotBooking(null);
    try {
      const snap = await firestore()
        .collection('bookings')
        .where('lotId', '==', lotId)
        .where('spotId', '==', spot.spotId || spot.id)
        .where('status', 'in', ['confirmed', 'active'])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      if (snap && !snap.empty) {
        setSpotBooking({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (_e) {}
    setLoadingBooking(false);
  }, [lotId]);

  /** Handles tapping a spot cell. */
  const handleSpotPress = useCallback((spot) => {
    if (spot.status === 'available') return;
    setSelectedSpot(spot);
    fetchSpotBooking(spot);
    bottomSheetRef.current?.expand();
  }, [fetchSpotBooking]);

  /** Marks a spot as available and completes the linked booking. */
  const handleMarkAvailable = useCallback(async () => {
    if (!selectedSpot || !lotId) return;
    try {
      await updateSpotStatus(lotId, selectedSpot.spotId || selectedSpot.id, 'available');
      if (spotBooking?.id) {
        await firestore().collection('bookings').doc(spotBooking.id).update({
          status: 'completed',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      bottomSheetRef.current?.close();
      setSelectedSpot(null);
    } catch (_e) {
      Alert.alert('Error', 'Could not update spot. Please try again.');
    }
  }, [selectedSpot, lotId, spotBooking]);

  /** Releases a reserved spot and cancels the linked booking. */
  const handleReleaseSpot = useCallback(async () => {
    if (!selectedSpot || !lotId) return;
    try {
      await updateSpotStatus(lotId, selectedSpot.spotId || selectedSpot.id, 'available');
      if (spotBooking?.id) {
        await firestore().collection('bookings').doc(spotBooking.id).update({
          status: 'cancelled',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      bottomSheetRef.current?.close();
      setSelectedSpot(null);
    } catch (_e) {
      Alert.alert('Error', 'Could not release spot. Please try again.');
    }
  }, [selectedSpot, lotId, spotBooking]);

  const stats = useMemo(() => ({
    free: spots.filter((s) => s.status === 'available').length,
    occupied: spots.filter((s) => s.status === 'occupied').length,
    reserved: spots.filter((s) => s.status === 'reserved').length,
    total: spots.length,
  }), [spots]);

  const lastUpdatedLabel = useMemo(() => {
    const diffSec = Math.floor((Date.now() - lastUpdated) / 1000);
    if (diffSec < 5) return 'just now';
    return `${diffSec}s ago`;
  }, [lastUpdated]);

  /** Renders a single spot cell in the 4-column grid. */
  const renderSpot = useCallback(({ item: spot }) => {
    const isSelected = selectedSpot?.id === spot.id;
    const isInteractive = spot.status !== 'available';
    return (
      <TouchableOpacity
        onPress={() => handleSpotPress(spot)}
        disabled={!isInteractive}
        style={[styles.spotCell, { backgroundColor: spotBg(spot.status), width: SPOT_SIZE }]}
        activeOpacity={isInteractive ? 0.8 : 1}
      >
        {isSelected && <View style={styles.spotSelectedBorder} />}
        <Text style={styles.spotLabel}>{spot.label || spot.id}</Text>
        <Text style={styles.spotIconText}>{spotIcon(spot.status)}</Text>
      </TouchableOpacity>
    );
  }, [selectedSpot, handleSpotPress]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.headerTitle}>{lotName} · Live</Text>
        </View>
        <TouchableOpacity onPress={() => setLastUpdated(Date.now())}>
          <Text style={styles.refreshBtn}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Stats pills ─────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
          {[
            { value: stats.free, label: 'free', bg: '#10B98122', border: '#10B98144', color: COLORS.available },
            { value: stats.occupied, label: 'occupied', bg: '#FF3B5C22', border: '#FF3B5C44', color: COLORS.occupied },
            { value: stats.reserved, label: 'reserved', bg: '#F59E0B22', border: '#F59E0B44', color: COLORS.gold },
            { value: stats.total, label: 'total', bg: '#25254088', border: COLORS.border, color: COLORS.textSecondary },
          ].map((p) => (
            <View key={p.label} style={[styles.pill, { backgroundColor: p.bg, borderColor: p.border }]}>
              <Text style={[styles.pillText, { color: p.color }]}>{p.value} {p.label}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.lastUpdated}>Last updated: {lastUpdatedLabel}</Text>

        {/* ── Floor tabs ───────────────────────────────────────── */}
        <View style={styles.floorTabs}>
          {FLOOR_TABS.map((floor) => (
            <TouchableOpacity key={floor} onPress={() => setActiveFloor(floor)} style={styles.floorTab}>
              <Text style={[styles.floorTabText, activeFloor === floor ? styles.floorTabActive : null]}>
                {floor}
              </Text>
              {activeFloor === floor && <View style={styles.floorTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Spot grid ────────────────────────────────────────── */}
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id?.toString() || item.spotId || item.label || String(Math.random())}
          numColumns={4}
          scrollEnabled={false}
          renderItem={renderSpot}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: COLORS.available, label: 'Available' },
            { color: COLORS.occupied, label: 'Occupied' },
            { color: COLORS.gold, label: 'Reserved' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('QRScannerScreen')}>
        <Icon name="qr-code-outline" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      {/* ── Bottom sheet ─────────────────────────────────────── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['45%', '70%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        onClose={() => setSelectedSpot(null)}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {selectedSpot && (
            <>
              <View style={styles.sheetHeader}>
                <View style={styles.spotLabelBadge}>
                  <Text style={styles.spotLabelBadgeText}>{selectedSpot.label || selectedSpot.id}</Text>
                </View>
                <View style={[styles.sheetStatusBadge, { backgroundColor: spotBg(selectedSpot.status) + '33' }]}>
                  <Text style={[styles.sheetStatusText, { color: spotBg(selectedSpot.status) }]}>
                    {selectedSpot.status}
                  </Text>
                </View>
              </View>

              {selectedSpot.status === 'occupied' && (
                <>
                  <Text style={styles.sheetSectionTitle}>Current booking</Text>
                  {loadingBooking ? (
                    <Text style={styles.sheetLoadingText}>Loading details…</Text>
                  ) : spotBooking ? (
                    <>
                      <View style={styles.driverRow}>
                        <View style={styles.driverAvatar}>
                          <Text style={styles.driverInitials}>
                            {getInitials(spotBooking.driverName || spotBooking.userName || '')}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.driverName}>
                            {spotBooking.driverName || spotBooking.userName || 'Driver'}
                          </Text>
                          <Text style={styles.driverSub}>
                            {formatEndTime(spotBooking.startHour ?? 9, spotBooking.duration ?? 1)}
                          </Text>
                          <Text style={styles.driverSub}>Duration: {spotBooking.duration || 1} hrs</Text>
                        </View>
                      </View>
                      <Text style={styles.bookingMetaText}>Paid: ₹{spotBooking.totalAmount || 0}</Text>
                      <Text style={styles.bookingMetaId}>ID: {shortBookingId(spotBooking.id)}</Text>
                    </>
                  ) : (
                    <Text style={styles.sheetLoadingText}>No booking data found</Text>
                  )}
                  <View style={styles.sheetActions}>
                    <TouchableOpacity style={styles.markAvailableBtn} onPress={handleMarkAvailable}>
                      <Text style={styles.markAvailableText}>Mark as available</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contactBtn}>
                      <Text style={styles.contactText}>Contact driver</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {selectedSpot.status === 'reserved' && (
                <>
                  <Text style={styles.sheetSectionTitle}>Reserved spot</Text>
                  {spotBooking ? (
                    <>
                      <Text style={styles.driverName}>
                        Reserved by {spotBooking.driverName || spotBooking.userName || 'Driver'}
                      </Text>
                      <Text style={styles.driverSub}>
                        Arriving by {formatEndTime(spotBooking.startHour ?? 9, 0)}
                      </Text>
                      <Text style={[styles.driverSub, { color: COLORS.gold }]}>
                        Auto-releases in 15 mins
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.sheetLoadingText}>Loading details…</Text>
                  )}
                  <TouchableOpacity style={styles.releaseBtn} onPress={handleReleaseSpot}>
                    <Text style={styles.releaseText}>Release spot</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.available },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' },
  refreshBtn: { color: COLORS.primary, fontSize: 13 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 12 },
  pillsRow: { flexDirection: 'row', marginBottom: 8 },
  pill: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '500' },
  lastUpdated: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center', marginBottom: 12 },
  floorTabs: { flexDirection: 'row', marginBottom: 16 },
  floorTab: { marginRight: 20, paddingBottom: 4 },
  floorTabText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  floorTabActive: { color: COLORS.textPrimary },
  floorTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: COLORS.primary, borderRadius: 1 },
  gridContent: { gap: 6 },
  gridRow: { gap: 6, marginBottom: 6 },
  spotCell: { height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  spotSelectedBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 12, borderWidth: 2, borderColor: COLORS.textPrimary },
  spotLabel: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  spotIconText: { fontSize: 10, marginTop: 2, color: COLORS.textPrimary },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textSecondary, fontSize: 12 },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  sheetBg: { backgroundColor: COLORS.surface },
  sheetHandle: { backgroundColor: COLORS.border },
  sheetContent: { padding: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  spotLabelBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  spotLabelBadgeText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetStatusBadge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14 },
  sheetStatusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sheetSectionTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetLoadingText: { color: COLORS.textSecondary, fontSize: 13 },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED22', justifyContent: 'center', alignItems: 'center' },
  driverInitials: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  driverName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  driverSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  bookingMetaText: { color: COLORS.textPrimary, fontSize: 13, marginBottom: 4 },
  bookingMetaId: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 16 },
  sheetActions: { gap: 10 },
  markAvailableBtn: { height: 48, borderRadius: 12, backgroundColor: '#10B98122', borderWidth: 1, borderColor: COLORS.available, justifyContent: 'center', alignItems: 'center' },
  markAvailableText: { color: COLORS.available, fontSize: 14, fontWeight: '500' },
  contactBtn: { height: 48, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  contactText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },
  releaseBtn: { height: 48, borderRadius: 12, backgroundColor: '#FF3B5C22', borderWidth: 1, borderColor: COLORS.occupied, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  releaseText: { color: COLORS.occupied, fontSize: 14, fontWeight: '500' },
});

export default LiveLotViewScreen;
