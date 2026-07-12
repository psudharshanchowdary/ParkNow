// Built Day 11
/**
 * @file SpotPickerScreen.js
 * @description Screen for selecting a parking spot with interactive grid and animated selection cards.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import * as parkingService from '../../services/parkingService';
import { formatSpotLabel } from '../../utils/formatters';

/** SpotPickerScreen functional component. */
const SpotPickerScreen = ({ route, navigation }) => {
  const { lotId, lotName, pricePerHour } = route.params || {};

  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Animated values for spring scale and slide-up timing animations
  const scaleValue = useRef(new Animated.Value(1.0)).current;
  const slideValue = useRef(new Animated.Value(250)).current;

  // Subscribe to spots in real-time
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = parkingService.subscribeToSpots(lotId, (updatedSpots) => {
        setSpots(updatedSpots);
        setLoading(false);

        // Auto-deselect if the selected spot is booked by someone else
        if (selectedSpot) {
          const currentMatch = updatedSpots.find((s) => s.spotId === selectedSpot.spotId);
          if (currentMatch && currentMatch.status !== 'available') {
            setSelectedSpot(null);
            Animated.parallel([
              Animated.spring(scaleValue, { toValue: 1.0, useNativeDriver: true }),
              Animated.timing(slideValue, { toValue: 250, duration: 200, useNativeDriver: true }),
            ]).start();
          }
        }
      });
    } catch (err) {
      setError('Failed to connect to real-time spot tracker.');
      setLoading(false);
    }

    return () => unsubscribe();
  }, [lotId, selectedSpot, scaleValue, slideValue]);

  /** Handles spot tap. Performs spring and slide-up animations. */
  const handleSpotPress = useCallback((spot) => {
    if (spot.status !== 'available') return;

    if (selectedSpot && selectedSpot.spotId === spot.spotId) {
      // Deselect spot
      setSelectedSpot(null);
      Animated.parallel([
        Animated.spring(scaleValue, { toValue: 1.0, useNativeDriver: true }),
        Animated.timing(slideValue, { toValue: 250, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      // Select new spot
      setSelectedSpot(spot);
      scaleValue.setValue(1.0);
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1.1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedSpot, scaleValue, slideValue]);

  /** Navigates to BookingFormScreen with selection parameters. */
  const handleContinue = useCallback(() => {
    if (!selectedSpot) return;
    navigation.navigate('BookingFormScreen', {
      lotId,
      lotName,
      pricePerHour,
      spotId: selectedSpot.spotId,
      spotLabel: selectedSpot.label,
    });
  }, [selectedSpot, lotId, lotName, pricePerHour, navigation]);

  /** Navigates back to the LotDetailScreen. */
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={48} style={styles.errorIcon} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-back" size={24} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick your spot</Text>
        <Text style={styles.headerRight}>Step 1 of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Lot Name & Floor Subtitle */}
        <Text style={styles.subtitle}>
          {lotName} · Ground floor
        </Text>

        {/* Entry Indicator Row */}
        <View style={styles.entryRow}>
          <Text style={styles.entryText}>ENTRY ▶</Text>
          <View style={styles.dashedLine} />
        </View>

        {/* Spot Grid */}
        <View style={styles.grid}>
          {spots.map((item) => {
            const isSelected = selectedSpot && selectedSpot.spotId === item.spotId;
            const isOccupied = item.status === 'occupied';

            const spotScale = isSelected ? scaleValue : 1.0;

            return (
              <Animated.View
                key={item.spotId}
                style={{ transform: [{ scale: spotScale }] }}
              >
                <TouchableOpacity
                  style={[
                    styles.spotBox,
                    isOccupied ? styles.spotOccupied : styles.spotAvailable,
                    isSelected ? styles.spotSelected : null,
                  ]}
                  disabled={isOccupied}
                  onPress={() => handleSpotPress(item)}
                >
                  <Text style={styles.spotLabel}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Slide-Up Detail Card */}
      {selectedSpot ? (
        <Animated.View
          style={[
            styles.animatedCard,
            { transform: [{ translateY: slideValue }] },
          ]}
        >
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Selected spot</Text>
            <Text style={styles.detailValue}>{formatSpotLabel(selectedSpot.label)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Floor</Text>
            <Text style={styles.detailValue}>Ground floor</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>Standard · Covered</Text>
          </View>
          <View style={[styles.detailRow, styles.lastRow]}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.priceText}>₹{pricePerHour} / hr</Text>
          </View>
        </Animated.View>
      ) : null}

      {/* Footer Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedSpot ? styles.continueButtonDisabled : null,
          ]}
          disabled={!selectedSpot}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue →</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIcon: {
    color: COLORS.occupied,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  backIcon: {
    color: '#FFFFFF',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 260,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  entryText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '400',
    marginRight: 8,
  },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderStyle: 'dashed',
    height: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  spotBox: {
    width: 64,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotAvailable: {
    backgroundColor: COLORS.available,
  },
  spotOccupied: {
    backgroundColor: COLORS.occupied,
    opacity: 0.7,
  },
  spotSelected: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  spotLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  animatedCard: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lastRow: {
    marginBottom: 0,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  priceText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
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
  continueButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.card,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SpotPickerScreen;
