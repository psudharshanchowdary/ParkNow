// Built Day 17
/**
 * @file LotSettingsScreen.js
 * @description Admin screen for managing all lot configuration including
 *              pricing, timing, capacity, booking rules, status, and
 *              danger-zone delete. Includes unsaved-changes guard.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TextInput,
  Modal,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import { updateLotSettings, deleteLot } from '../../services/parkingService';
import { clamp, format24to12 } from '../../utils/formatters';

/** Default settings applied when no Firestore data is present. */
const DEFAULT_SETTINGS = {
  lotName: 'My Parking Lot',
  floorLabel: 'Ground floor',
  totalSpots: 20,
  pricePerHour: 30,
  weekendPricing: false,
  weekendPrice: 50,
  openingTime: '06:00',
  closingTime: '23:00',
  open24Hours: false,
  reservedSpots: 0,
  acceptBookings: true,
  advanceBookingDays: 7,
  minBookingDuration: 1,
  isOpen: true,
};

// ── Stepper component ────────────────────────────────────────────────────────

/**
 * A stepper control with debounce to prevent rapid-tap issues.
 * @param {{ value: any, onDecrease: Function, onIncrease: Function }} props
 */
const Stepper = ({ value, onDecrease, onIncrease }) => {
  const tapRef = useRef(false);

  /** Debounced tap handler. */
  const handleTap = useCallback((fn) => {
    if (tapRef.current) return;
    tapRef.current = true;
    fn();
    setTimeout(() => { tapRef.current = false; }, 150);
  }, []);

  return (
    <View style={stepStyles.row}>
      <TouchableOpacity
        style={stepStyles.minusBtn}
        onPress={() => handleTap(onDecrease)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={stepStyles.btnTxt}>−</Text>
      </TouchableOpacity>
      <Text style={stepStyles.valueText}>{value}</Text>
      <TouchableOpacity
        style={stepStyles.plusBtn}
        onPress={() => handleTap(onIncrease)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={stepStyles.btnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  minusBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
  },
  plusBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  btnTxt: { color: COLORS.textPrimary, fontSize: 20, lineHeight: 22 },
  valueText: {
    color: COLORS.textPrimary, fontSize: 16, fontWeight: '600',
    minWidth: 56, textAlign: 'center',
  },
});

// ── Time picker modal ────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5;
  return { h, label: format24to12(`${h.toString().padStart(2, '0')}:00`) };
});
const MINUTES = [{ m: 0, label: '00' }, { m: 30, label: '30' }];

/**
 * Bottom-sheet time picker modal with scrollable hour + minute FlatLists.
 * @param {{ visible, currentTime, onConfirm, onCancel, title }} props
 */
const TimePickerModal = ({ visible, currentTime, onConfirm, onCancel, title }) => {
  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible && currentTime) {
      const parts = currentTime.split(':');
      setHour(parseInt(parts[0], 10) || 6);
      setMinute(parseInt(parts[1], 10) || 0);
    }
  }, [visible, currentTime]);

  /** Confirms selected time and calls callback. */
  const handleConfirm = () => {
    const hStr = hour.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    onConfirm(`${hStr}:${mStr}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={tpStyles.overlay} activeOpacity={1} onPress={onCancel} />
      <View style={tpStyles.sheet}>
        <Text style={tpStyles.title}>{title || 'Select time'}</Text>
        <View style={tpStyles.pickersRow}>
          <View style={tpStyles.pickerCol}>
            <Text style={tpStyles.pickerColLabel}>Hour</Text>
            <FlatList
              data={HOURS}
              keyExtractor={(item) => String(item.h)}
              style={tpStyles.pickerList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setHour(item.h)}
                  style={[tpStyles.pickerItem, hour === item.h ? tpStyles.pickerItemActive : null]}
                >
                  <Text style={[tpStyles.pickerItemTxt, hour === item.h ? tpStyles.pickerItemTxtActive : null]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
          <View style={tpStyles.pickerCol}>
            <Text style={tpStyles.pickerColLabel}>Min</Text>
            <FlatList
              data={MINUTES}
              keyExtractor={(item) => String(item.m)}
              style={tpStyles.pickerList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setMinute(item.m)}
                  style={[tpStyles.pickerItem, minute === item.m ? tpStyles.pickerItemActive : null]}
                >
                  <Text style={[tpStyles.pickerItemTxt, minute === item.m ? tpStyles.pickerItemTxtActive : null]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
        <TouchableOpacity style={tpStyles.confirmBtn} onPress={handleConfirm}>
          <Text style={tpStyles.confirmTxt}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel}>
          <Text style={tpStyles.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const tpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, alignItems: 'center',
  },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  pickersRow: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  pickerCol: { alignItems: 'center', width: 120 },
  pickerColLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  pickerList: { height: 160 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginBottom: 4 },
  pickerItemActive: { backgroundColor: '#7C3AED22' },
  pickerItemTxt: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  pickerItemTxtActive: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  confirmBtn: {
    width: '100%', height: 48, borderRadius: 10,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  confirmTxt: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  cancelTxt: { color: COLORS.textSecondary, fontSize: 14 },
});

// ── Main screen ──────────────────────────────────────────────────────────────

/** LotSettingsScreen functional component. */
const LotSettingsScreen = ({ navigation }) => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_admin_id';

  const [lotId, setLotId] = useState(null);
  const [localSettings, setLocalSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [timePicker, setTimePicker] = useState(null);

  // Fetch lot settings on mount
  useEffect(() => {
    let isMounted = true;
    const fetchLot = async () => {
      try {
        const userDoc = await firestore().collection('users').doc(uid).get();
        const fetchedLotId = userDoc.exists && userDoc.data()?.lotId
          ? userDoc.data().lotId : 'lot_001';
        if (!isMounted) return;
        setLotId(fetchedLotId);

        const lotDoc = await firestore().collection('lots').doc(fetchedLotId).get();
        if (!isMounted) return;
        if (lotDoc.exists) {
          const d = lotDoc.data();
          setLocalSettings({
            lotName: d.name || DEFAULT_SETTINGS.lotName,
            floorLabel: d.floorLabel || DEFAULT_SETTINGS.floorLabel,
            totalSpots: d.totalSpots || DEFAULT_SETTINGS.totalSpots,
            pricePerHour: d.pricePerHour || DEFAULT_SETTINGS.pricePerHour,
            weekendPricing: d.weekendPricing || false,
            weekendPrice: d.weekendPrice || DEFAULT_SETTINGS.weekendPrice,
            openingTime: d.openingTime || DEFAULT_SETTINGS.openingTime,
            closingTime: d.closingTime || DEFAULT_SETTINGS.closingTime,
            open24Hours: d.open24Hours || false,
            reservedSpots: d.reservedSpots || 0,
            acceptBookings: d.acceptBookings !== false,
            advanceBookingDays: d.advanceBookingDays || DEFAULT_SETTINGS.advanceBookingDays,
            minBookingDuration: d.minBookingDuration || 1,
            isOpen: d.isOpen !== false,
          });
        }
      } catch (_e) {}
      if (isMounted) setLoading(false);
    };
    fetchLot();
    return () => { isMounted = false; };
  }, [uid]);

  // Unsaved changes guard
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) return;
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'Your changes will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasChanges]);

  /** Updates a single setting key and marks unsaved changes. */
  const updateSetting = useCallback((key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  /** Saves all settings to Firestore after validation. */
  const handleSave = useCallback(async () => {
    if (!hasChanges || !lotId) return;
    if (!localSettings.open24Hours) {
      const [openH, openM] = localSettings.openingTime.split(':').map(Number);
      const [closeH, closeM] = localSettings.closingTime.split(':').map(Number);
      if (closeH * 60 + closeM <= openH * 60 + openM + 60) {
        Alert.alert('Invalid timing', 'Closing time must be at least 1 hour after opening time.');
        return;
      }
    }
    setSaving(true);
    try {
      await updateLotSettings(lotId, {
        name: localSettings.lotName,
        floorLabel: localSettings.floorLabel,
        totalSpots: localSettings.totalSpots,
        pricePerHour: localSettings.pricePerHour,
        weekendPricing: localSettings.weekendPricing,
        weekendPrice: localSettings.weekendPrice,
        openingTime: localSettings.openingTime,
        closingTime: localSettings.closingTime,
        open24Hours: localSettings.open24Hours,
        reservedSpots: localSettings.reservedSpots,
        acceptBookings: localSettings.acceptBookings,
        advanceBookingDays: localSettings.advanceBookingDays,
        minBookingDuration: localSettings.minBookingDuration,
        isOpen: localSettings.isOpen,
      });
      setHasChanges(false);
      Alert.alert('Saved', 'Settings saved successfully.');
    } catch (_e) {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    }
    setSaving(false);
  }, [hasChanges, lotId, localSettings]);

  /** Two-step confirm and delete lot. */
  const handleDeleteLot = useCallback(() => {
    Alert.alert(
      'Delete lot',
      'This will permanently delete this lot and all its spots. Active bookings will be cancelled. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLot(lotId, uid);
              navigation.replace('AdminOnboarding');
            } catch (_e) {
              Alert.alert('Error', 'Could not delete lot. Please try again.');
            }
          },
        },
      ]
    );
  }, [lotId, uid, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const s = localSettings;

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lot settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.primary} size="small" />
            : <Text style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Lot info card */}
        <View style={styles.lotInfoCard}>
          <View style={styles.lotNameRow}>
            {editingName ? (
              <TextInput
                style={styles.lotNameInput}
                value={s.lotName}
                onChangeText={(v) => updateSetting('lotName', v)}
                onBlur={() => setEditingName(false)}
                autoFocus
                selectionColor={COLORS.primary}
              />
            ) : (
              <Text style={styles.lotName}>{s.lotName}</Text>
            )}
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Icon name="pencil-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lotSub}>{s.floorLabel} · {s.totalSpots} spots</Text>
        </View>

        {/* PRICING */}
        <Text style={styles.sectionLabel}>PRICING</Text>
        <View style={[styles.settingCard, styles.settingRow]}>
          <Text style={styles.settingTitle}>Price per hour</Text>
          <Stepper
            value={`₹${s.pricePerHour}`}
            onDecrease={() => updateSetting('pricePerHour', clamp(Math.round((s.pricePerHour - 5) / 5) * 5, 10, 200))}
            onIncrease={() => updateSetting('pricePerHour', clamp(Math.round((s.pricePerHour + 5) / 5) * 5, 10, 200))}
          />
        </View>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Weekend pricing</Text>
              <Text style={styles.settingSubtitle}>Different rate on Sat & Sun</Text>
            </View>
            <Switch
              value={s.weekendPricing}
              onValueChange={(v) => updateSetting('weekendPricing', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
          {s.weekendPricing && (
            <View style={[styles.settingRow, { marginTop: 14 }]}>
              <Text style={styles.settingTitle}>Weekend price</Text>
              <Stepper
                value={`₹${s.weekendPrice}`}
                onDecrease={() => updateSetting('weekendPrice', clamp(Math.round((s.weekendPrice - 5) / 5) * 5, 10, 200))}
                onIncrease={() => updateSetting('weekendPrice', clamp(Math.round((s.weekendPrice + 5) / 5) * 5, 10, 200))}
              />
            </View>
          )}
        </View>

        {/* TIMING */}
        <Text style={styles.sectionLabel}>TIMING</Text>
        <TouchableOpacity
          style={[styles.settingCard, styles.settingRow, s.open24Hours ? styles.dimmed : null]}
          onPress={() => !s.open24Hours && setTimePicker('opening')}
          disabled={s.open24Hours}
        >
          <Text style={styles.settingTitle}>Opens at</Text>
          <Text style={styles.settingValue}>{format24to12(s.openingTime)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingCard, styles.settingRow, s.open24Hours ? styles.dimmed : null]}
          onPress={() => !s.open24Hours && setTimePicker('closing')}
          disabled={s.open24Hours}
        >
          <Text style={styles.settingTitle}>Closes at</Text>
          <Text style={styles.settingValue}>{format24to12(s.closingTime)}</Text>
        </TouchableOpacity>
        <View style={[styles.settingCard, styles.settingRow]}>
          <Text style={styles.settingTitle}>Open 24 hours</Text>
          <Switch
            value={s.open24Hours}
            onValueChange={(v) => updateSetting('open24Hours', v)}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.textPrimary}
          />
        </View>

        {/* CAPACITY */}
        <Text style={styles.sectionLabel}>CAPACITY</Text>
        <View style={[styles.settingCard, styles.settingRow]}>
          <Text style={styles.settingTitle}>Total spots</Text>
          <Stepper
            value={s.totalSpots}
            onDecrease={() => updateSetting('totalSpots', clamp(s.totalSpots - 1, 1, 500))}
            onIncrease={() => updateSetting('totalSpots', clamp(s.totalSpots + 1, 1, 500))}
          />
        </View>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Reserved spots</Text>
              <Text style={styles.settingSubtitle}>Excluded from public booking</Text>
            </View>
            <Stepper
              value={s.reservedSpots}
              onDecrease={() => updateSetting('reservedSpots', clamp(s.reservedSpots - 1, 0, s.totalSpots - 1))}
              onIncrease={() => updateSetting('reservedSpots', clamp(s.reservedSpots + 1, 0, s.totalSpots - 1))}
            />
          </View>
        </View>

        {/* BOOKING */}
        <Text style={styles.sectionLabel}>BOOKING</Text>
        <View style={[styles.settingCard, styles.settingRow]}>
          <View>
            <Text style={styles.settingTitle}>Accept bookings</Text>
            <Text style={styles.settingSubtitle}>Allow new reservations</Text>
          </View>
          <Switch
            value={s.acceptBookings}
            onValueChange={(v) => updateSetting('acceptBookings', v)}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.textPrimary}
          />
        </View>
        <View style={[styles.settingCard, styles.settingRow]}>
          <Text style={styles.settingTitle}>Book up to {s.advanceBookingDays} days ahead</Text>
          <Stepper
            value={s.advanceBookingDays}
            onDecrease={() => updateSetting('advanceBookingDays', clamp(s.advanceBookingDays - 1, 1, 30))}
            onIncrease={() => updateSetting('advanceBookingDays', clamp(s.advanceBookingDays + 1, 1, 30))}
          />
        </View>
        <View style={[styles.settingCard, styles.settingRow]}>
          <Text style={styles.settingTitle}>Minimum booking</Text>
          <Stepper
            value={`${s.minBookingDuration} hr`}
            onDecrease={() => updateSetting('minBookingDuration', clamp(s.minBookingDuration - 1, 1, 4))}
            onIncrease={() => updateSetting('minBookingDuration', clamp(s.minBookingDuration + 1, 1, 4))}
          />
        </View>

        {/* STATUS */}
        <Text style={styles.sectionLabel}>STATUS</Text>
        <View style={[styles.settingCard, styles.settingRow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.statusDot, { backgroundColor: s.isOpen ? COLORS.available : COLORS.occupied }]} />
            <View>
              <Text style={styles.settingTitle}>Lot status</Text>
              <Text style={[styles.settingSubtitle, { color: s.isOpen ? COLORS.available : COLORS.occupied }]}>
                {s.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
          <Switch
            value={s.isOpen}
            onValueChange={(v) => updateSetting('isOpen', v)}
            trackColor={{ false: COLORS.occupied, true: COLORS.available }}
            thumbColor={COLORS.textPrimary}
          />
        </View>

        {/* DANGER ZONE */}
        <Text style={styles.dangerLabel}>DANGER ZONE</Text>
        <View style={styles.dangerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Delete this lot</Text>
            <Text style={styles.dangerSubtitle}>This action cannot be undone</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteLot}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time picker modals */}
      <TimePickerModal
        visible={timePicker === 'opening'}
        currentTime={s.openingTime}
        title="Opening time"
        onConfirm={(time) => { updateSetting('openingTime', time); setTimePicker(null); }}
        onCancel={() => setTimePicker(null)}
      />
      <TimePickerModal
        visible={timePicker === 'closing'}
        currentTime={s.closingTime}
        title="Closing time"
        onConfirm={(time) => { updateSetting('closingTime', time); setTimePicker(null); }}
        onCancel={() => setTimePicker(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '600' },
  saveBtn: { color: COLORS.primary, fontSize: 15, fontWeight: '500' },
  saveBtnDisabled: { color: COLORS.textSecondary },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  lotInfoCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  lotNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  lotName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600', flex: 1 },
  lotNameInput: {
    flex: 1, color: COLORS.textPrimary, fontSize: 18, fontWeight: '600',
    borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingBottom: 2,
  },
  lotSub: { color: COLORS.textSecondary, fontSize: 13 },
  sectionLabel: {
    color: COLORS.textSecondary, fontSize: 12, fontWeight: '500',
    marginBottom: 8, letterSpacing: 0.6, marginTop: 8,
  },
  dangerLabel: {
    color: COLORS.occupied, fontSize: 12, fontWeight: '500',
    marginBottom: 8, letterSpacing: 0.6, marginTop: 20,
  },
  settingCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  settingTitle: { color: COLORS.textPrimary, fontSize: 14 },
  settingSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  settingValue: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  dimmed: { opacity: 0.4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dangerCard: {
    backgroundColor: 'rgba(255,59,92,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,59,92,0.27)',
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dangerTitle: { color: COLORS.occupied, fontSize: 14 },
  dangerSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  deleteBtn: {
    backgroundColor: 'rgba(255,59,92,0.13)',
    borderWidth: 1, borderColor: COLORS.occupied,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16,
  },
  deleteBtnText: { color: COLORS.occupied, fontSize: 13, fontWeight: '500' },
});

export default LotSettingsScreen;
