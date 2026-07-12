// Built Day 11
/**
 * @file LotDetailScreen.js
 * @description Screen displaying parking lot details, real-time availability stats, spot grid, and reviews.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import * as parkingService from '../../services/parkingService';
import * as authService from '../../services/authService';
import { calculateDistance, formatDistance } from '../../utils/formatters';

/** LotDetailScreen functional component. */
const LotDetailScreen = ({ route, navigation }) => {
  const { lotId, userCoords } = route.params || {};

  const [lot, setLot] = useState(null);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const currentUser = authService.getCurrentUser();
  const uid = currentUser ? currentUser.uid : 'temp_user_id';

  // Fetches initial favorite status
  useEffect(() => {
    let active = true;
    const fetchFavoriteStatus = async () => {
      try {
        const favorited = await parkingService.isFavorited(uid, lotId);
        if (active) {
          setIsFavorite(favorited);
        }
      } catch (err) {
        // Silent catch for favoriting check
      }
    };
    fetchFavoriteStatus();
    return () => {
      active = false;
    };
  }, [uid, lotId]);

  // Subscribes to real-time updates for lot details and spots
  useEffect(() => {
    let unsubscribeLot = () => {};
    let unsubscribeSpots = () => {};

    try {
      unsubscribeLot = parkingService.subscribeLotDetail(lotId, (updatedLot) => {
        if (updatedLot) {
          setLot(updatedLot);
          setError('');
        } else {
          setError('Parking lot details could not be found.');
        }
        setLoading(false);
      });

      unsubscribeSpots = parkingService.subscribeToSpots(lotId, (updatedSpots) => {
        if (updatedSpots) {
          setSpots(updatedSpots);
        }
      });
    } catch (err) {
      setError('An error occurred while loading real-time data.');
      setLoading(false);
    }

    return () => {
      unsubscribeLot();
      unsubscribeSpots();
    };
  }, [lotId]);

  /** Toggles the lot in user's favorites collection. */
  const handleToggleFavorite = useCallback(async () => {
    try {
      const added = await parkingService.toggleFavorite(uid, lotId);
      setIsFavorite(added);
    } catch (err) {
      // Safe catch for favoriting UI
    }
  }, [uid, lotId]);

  /** Directs the driver to Google Maps with lot coordinates. */
  const handleViewInMaps = useCallback(async () => {
    if (!lot) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lot.latitude},${lot.longitude}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      // Safe catch for maps linking
    }
  }, [lot]);

  /** Navigates to SpotPickerScreen passing current lot metrics. */
  const handleBookSpot = useCallback(() => {
    if (!lot) return;
    navigation.navigate('SpotPickerScreen', {
      lotId: lot.id,
      lotName: lot.name,
      pricePerHour: lot.pricePerHour,
    });
  }, [lot, navigation]);

  /** Renders stars for the rating system. */
  const renderStars = useCallback((rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          style={styles.starIcon}
        />
      );
    }
    return <View style={styles.starRow}>{stars}</View>;
  }, []);

  /** Navigates back to the HomeMapScreen. */
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Derived counts from real-time spots subcollection
  const availableCount = spots.filter((s) => s.status === 'available').length;
  const occupiedCount = spots.filter((s) => s.status === 'occupied').length;
  const totalCount = spots.length || 20;

  // Calculates distance using Haversine helper
  const distanceStr = useMemo(() => {
    if (!lot) return '...';
    const lat1 = userCoords?.latitude || 12.9716;
    const lon1 = userCoords?.longitude || 77.5946;
    const dist = calculateDistance(lat1, lon1, lot.latitude, lot.longitude);
    return formatDistance(dist);
  }, [lot, userCoords]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !lot) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={48} style={styles.errorIcon} />
        <Text style={styles.errorText}>{error || 'Lot not found.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header Row */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-back" size={24} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {lot.name}
        </Text>
        <TouchableOpacity onPress={handleToggleFavorite}>
          <Icon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            style={isFavorite ? styles.favIconActive : styles.favIconInactive}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dark Map Preview */}
        <TouchableOpacity style={styles.mapPreview} onPress={handleViewInMaps} activeOpacity={0.9}>
          <View style={styles.mapCenterPin}>
            <Icon name="location" size={32} style={styles.pinIcon} />
            <Text style={styles.pinLabel} numberOfLines={1}>
              {lot.name}
            </Text>
          </View>
          <Text style={styles.mapLinkText}>View in Maps</Text>
        </TouchableOpacity>

        {/* Horizontal Info Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsContainer}
          contentContainerStyle={styles.pillsScroll}
        >
          <View style={styles.pill}>
            <Text style={styles.pillText}>📍 {distanceStr}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>₹ ₹{lot.pricePerHour}/hr</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>🕐 Open 24hrs</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>🅿️ {totalCount} spots total</Text>
          </View>
        </ScrollView>

        {/* Live Availability Section */}
        <Text style={styles.sectionTitle}>Live availability</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCountAvailable}>{availableCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCountOccupied}>{occupiedCount}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCountTotal}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Spot Map Grid Section */}
        <Text style={styles.sectionTitle}>Spot map</Text>
        <View style={styles.gridContainer}>
          {spots.map((spot) => (
            <View
              key={spot.spotId}
              style={[
                styles.gridSpot,
                spot.status === 'available' ? styles.spotAvailable : styles.spotOccupied,
              ]}
            >
              <Text style={styles.spotText}>{spot.label}</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.spotAvailable]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.spotOccupied]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Reviews</Text>
        </View>
        <View style={styles.reviewCard}>
          {renderStars(5)}
          <Text style={styles.reviewText}>
            Very convenient spot. Covered parking helps in the summer. Quick entry via QR code.
          </Text>
          <View style={styles.reviewerRow}>
            <Text style={styles.reviewerName}>Rahul S.</Text>
            <Text style={styles.reviewDate}>10 Jul 2026</Text>
          </View>
        </View>
        <View style={[styles.reviewCard, styles.lastReviewCard]}>
          {renderStars(4)}
          <Text style={styles.reviewText}>
            Finding the spot was easy. High frequency of check-ins but managed to get one reserved.
          </Text>
          <View style={styles.reviewerRow}>
            <Text style={styles.reviewerName}>Priya M.</Text>
            <Text style={styles.reviewDate}>08 Jul 2026</Text>
          </View>
        </View>
      </ScrollView>

      {/* Booking Action Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Starts at ₹{lot.pricePerHour}/hr · Free cancellation</Text>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookSpot}>
          <Text style={styles.bookButtonText}>Book a Spot</Text>
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
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  favIconInactive: {
    color: '#FFFFFF',
  },
  favIconActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  mapPreview: {
    height: 180,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapCenterPin: {
    alignItems: 'center',
  },
  pinIcon: {
    color: COLORS.available,
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    maxWidth: 150,
  },
  mapLinkText: {
    color: COLORS.available,
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  pillsContainer: {
    marginTop: 16,
    flexDirection: 'row',
  },
  pillsScroll: {
    paddingRight: 10,
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCountAvailable: {
    color: COLORS.available,
    fontSize: 24,
    fontWeight: '700',
  },
  statCountOccupied: {
    color: COLORS.occupied,
    fontSize: 24,
    fontWeight: '700',
  },
  statCountTotal: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  gridSpot: {
    width: '18%',
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotAvailable: {
    backgroundColor: COLORS.available,
  },
  spotOccupied: {
    backgroundColor: COLORS.occupied,
  },
  spotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  reviewsHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  reviewsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lastReviewCard: {
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  starIcon: {
    color: '#FBBF24',
  },
  reviewText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 10,
  },
  reviewerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewerName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '400',
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
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  bookButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LotDetailScreen;
