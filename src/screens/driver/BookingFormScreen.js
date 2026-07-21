// Built Day 12
/**
 * @file BookingFormScreen.js
 * @description Screen for customizing parking booking date, start time, duration, and reviewing price breakdown.
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import {
  formatSpotLabel,
  calculateGST,
  formatBookingDate,
  formatTime,
} from '../../utils/formatters';

/** Available hours slots array (8 AM to 9 PM). */
const TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

/** Calculates parking fee based on hourly rate and duration. */
export const calculateParkingFee = (pricePerHour, duration) => {
  return pricePerHour * duration;
};

/** Calculates total booking amount including platform fee and GST. */
export const calculateBookingTotal = (pricePerHour, duration) => {
  const parkingFee = calculateParkingFee(pricePerHour, duration);
  const platformFee = 5;
  const gst = calculateGST(parkingFee + platformFee);
  return Math.round(parkingFee + platformFee + gst);
};

/** BookingFormScreen functional component. */
const BookingFormScreen = ({ route, navigation }) => {
  const { lotId, lotName, pricePerHour, spotId, spotLabel } = route.params || {};

  // Generates next 7 days for the date picker
  const datesList = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(datesList[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Animated value for button shake effect when validation fails
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  /** Checks if a date is today. */
  const isDateToday = useCallback((d) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }, []);

  /** Auto-selects the earliest non-past time slot. */
  const autoSelectEarliestTime = useCallback((date) => {
    const currentHour = new Date().getHours();
    const today = isDateToday(date);

    const firstAvailable = TIME_SLOTS.find((hour) => {
      if (!today) return true;
      return hour > currentHour;
    });

    setSelectedTime(firstAvailable !== undefined ? firstAvailable : null);
  }, [isDateToday]);

  // Select earliest time slot on initial load or date change
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      autoSelectEarliestTime(selectedDate);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedDate, autoSelectEarliestTime]);

  /** Performs horizontal shake animation on validation error. */
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnimation]);

  /** Decrements duration down to minimum 1 hour. */
  const handleDecrementDuration = useCallback(() => {
    setDuration((prev) => Math.max(1, prev - 1));
  }, []);

  /** Increments duration up to maximum 8 hours. */
  const handleIncrementDuration = useCallback(() => {
    setDuration((prev) => Math.min(8, prev + 1));
  }, []);

  /** Navigates to PaymentScreen after validating time selection. */
  const handleProceedToPayment = useCallback(() => {
    if (selectedTime === null) {
      setErrorMsg('Please select a start time for your booking.');
      triggerShake();
      return;
    }

    setErrorMsg('');
    const totalAmount = calculateBookingTotal(pricePerHour, duration);
    const timeFormatted = formatTime(selectedTime);

    navigation.navigate('PaymentScreen', {
      lotId,
      lotName,
      pricePerHour,
      spotId,
      spotLabel,
      date: selectedDate.toISOString(),
      startTime: timeFormatted,
      startHour: selectedTime,
      duration,
      totalAmount,
    });
  }, [
    selectedTime,
    triggerShake,
    pricePerHour,
    duration,
    navigation,
    lotId,
    lotName,
    spotId,
    spotLabel,
    selectedDate,
  ]);

  /** Navigates back to SpotPickerScreen. */
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Derived price calculation values
  const parkingFee = calculateParkingFee(pricePerHour, duration);
  const platformFee = 5;
  const gstAmount = calculateGST(parkingFee + platformFee);
  const totalAmount = calculateBookingTotal(pricePerHour, duration);

  // Calculated end time string
  const endTimeStr = useMemo(() => {
    if (selectedTime === null) return 'Select time';
    const endHour = (selectedTime + duration) % 24;
    return formatTime(endHour);
  }, [selectedTime, duration]);

  const currentHour = new Date().getHours();
  const isToday = isDateToday(selectedDate);

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-back" size={24} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking details</Text>
        <Text style={styles.headerStep}>Step 2 of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Spot Summary Card */}
        <View style={styles.spotSummaryCard}>
          <View style={styles.spotSummaryLeft}>
            <View style={styles.parkingIconCircle}>
              <Icon name="car" size={24} style={styles.parkingIcon} />
            </View>
            <View style={styles.spotSummaryDetails}>
              <Text style={styles.spotSummaryTitle}>{formatSpotLabel(spotLabel)}</Text>
              <Text style={styles.spotSummarySubtitle}>{lotName}</Text>
            </View>
          </View>
          <Text style={styles.spotSummaryPrice}>₹{pricePerHour}/hr</Text>
        </View>

        {/* Date Selector */}
        <Text style={styles.sectionTitle}>Select date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateListContainer}
          contentContainerStyle={styles.dateListScroll}
        >
          {datesList.map((d, index) => {
            const isSelected =
              selectedDate.getDate() === d.getDate() &&
              selectedDate.getMonth() === d.getMonth();
            const isT = isDateToday(d);
            const dayName = isT ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
            const dateNum = d.getDate();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.datePill,
                  isSelected ? styles.datePillSelected : null,
                ]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[styles.dateDayName, isSelected ? styles.textWhite : null]}>
                  {dayName}
                </Text>
                <Text style={[styles.dateNum, isSelected ? styles.textWhite : null]}>
                  {dateNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Selector */}
        <Text style={styles.sectionTitle}>Select time</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((hour) => {
            const isPast = isToday && hour <= currentHour;
            const isSelected = selectedTime === hour;

            return (
              <TouchableOpacity
                key={hour}
                style={[
                  styles.timeSlot,
                  isSelected ? styles.timeSlotSelected : null,
                  isPast ? styles.timeSlotDisabled : null,
                ]}
                disabled={isPast}
                onPress={() => {
                  setSelectedTime(hour);
                  setErrorMsg('');
                }}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    isSelected ? styles.textWhite : null,
                    isPast ? styles.timeSlotTextDisabled : null,
                  ]}
                >
                  {formatTime(hour)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration Stepper */}
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.durationCard}>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperMinusBtn}
              onPress={handleDecrementDuration}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.durationValue}>
              {duration} {duration === 1 ? 'hour' : 'hours'}
            </Text>

            <TouchableOpacity
              style={styles.stepperPlusBtn}
              onPress={handleIncrementDuration}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.endTimeText}>Ends at {endTimeStr}</Text>
        </View>

        {/* Price Summary Card */}
        <View style={styles.priceSummaryCard}>
          <Text style={styles.priceSummaryTitle}>Price summary</Text>
          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>Parking fee</Text>
            <Text style={styles.priceRowValue}>₹{pricePerHour} x {duration}hrs</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>Platform fee</Text>
            <Text style={styles.priceRowValue}>₹{platformFee}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>GST (18%)</Text>
            <Text style={styles.priceRowValue}>₹{gstAmount}</Text>
          </View>

          <View style={styles.thickDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Error message */}
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </ScrollView>

      {/* Bottom Footer Button */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceedToPayment}
          >
            <Text style={styles.proceedButtonText}>Proceed to payment</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
  headerIcon: {
    color: COLORS.textPrimary,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  headerStep: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  spotSummaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  spotSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parkingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  parkingIcon: {
    color: COLORS.primary,
  },
  spotSummaryDetails: {
    justifyContent: 'center',
  },
  spotSummaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  spotSummarySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  spotSummaryPrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  dateListContainer: {
    marginBottom: 20,
  },
  dateListScroll: {
    gap: 8,
  },
  datePill: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateDayName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  dateNum: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  textWhite: {
    color: COLORS.textPrimary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  timeSlot: {
    width: '31%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotDisabled: {
    opacity: 0.3,
  },
  timeSlotText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  timeSlotTextDisabled: {
    color: COLORS.textSecondary,
  },
  durationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  stepperMinusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperPlusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  durationValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  endTimeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  priceSummaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  priceSummaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  thickDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceRowLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  priceRowValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.occupied,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  proceedButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default BookingFormScreen;
