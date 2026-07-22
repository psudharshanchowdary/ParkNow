/**
 * @file mockData.js
 * @description 5 realistic mock parking lots, their spots, and coin transaction history in Bengaluru.
 */

export const LOTS = [
  {
    id: 'lot_001',
    name: 'City Centre Mall',
    latitude: 12.9725,
    longitude: 77.5930,
    availableSpots: 14,
    totalSpots: 20,
    pricePerHour: 20,
  },
  {
    id: 'lot_002',
    name: 'Express Market',
    latitude: 12.9680,
    longitude: 77.5980,
    availableSpots: 14,
    totalSpots: 20,
    pricePerHour: 20,
  },
  {
    id: 'lot_003',
    name: 'Brigade Plaza Lot',
    latitude: 12.9800,
    longitude: 77.5850,
    availableSpots: 14,
    totalSpots: 20,
    pricePerHour: 20,
  },
  {
    id: 'lot_004',
    name: 'Commercial Street Parking',
    latitude: 12.9820,
    longitude: 77.6080,
    availableSpots: 14,
    totalSpots: 20,
    pricePerHour: 20,
  },
  {
    id: 'lot_005',
    name: 'SRM Tech Park Complex',
    latitude: 12.8231,
    longitude: 80.0442,
    availableSpots: 28,
    totalSpots: 40,
    pricePerHour: 15,
  },
  {
    id: 'lot_006',
    name: 'Forum Vijaya Mall Hub',
    latitude: 13.0500,
    longitude: 80.2121,
    availableSpots: 32,
    totalSpots: 50,
    pricePerHour: 25,
  },
  {
    id: 'lot_007',
    name: 'Phoenix Market Lot C',
    latitude: 12.9960,
    longitude: 77.6960,
    availableSpots: 14,
    totalSpots: 20,
    pricePerHour: 20,
  },
];

/** Generates 20 mock spots for a given lot with 14 available and 6 occupied. */
const generateMockSpots = (lotId) => {
  const spots = [];
  const rows = ['A', 'B', 'C', 'D'];
  const occupiedIndexes = [2, 5, 8, 11, 14, 17];

  let index = 0;
  for (const row of rows) {
    for (let col = 1; col <= 5; col++) {
      const label = `${row}${col}`;
      spots.push({
        spotId: `spot_${lotId}_${label}`,
        label,
        status: occupiedIndexes.includes(index) ? 'occupied' : 'available',
        floor: 'Ground',
        type: 'Standard',
      });
      index++;
    }
  }
  return spots;
};

export const MOCK_SPOTS = {
  lot_001: generateMockSpots('lot_001'),
  lot_002: generateMockSpots('lot_002'),
  lot_003: generateMockSpots('lot_003'),
  lot_004: generateMockSpots('lot_004'),
  lot_005: generateMockSpots('lot_005'),
};

/** Mock coin transactions for offline fallback and local testing. */
const NOW = Date.now();
const mins = (n) => new Date(NOW - n * 60 * 1000);

export const COIN_TRANSACTIONS = [
  {
    id: 'txn_001',
    userId: 'temp_user_id',
    amount: 10,
    type: 'earn',
    reason: 'community_report',
    createdAt: mins(5),
  },
  {
    id: 'txn_002',
    userId: 'temp_user_id',
    amount: 5,
    type: 'earn',
    reason: 'booking_reward',
    createdAt: mins(65),
  },
  {
    id: 'txn_003',
    userId: 'temp_user_id',
    amount: 20,
    type: 'spend',
    reason: 'payment_discount',
    createdAt: mins(130),
  },
  {
    id: 'txn_004',
    userId: 'temp_user_id',
    amount: 50,
    type: 'earn',
    reason: 'referral',
    createdAt: mins(1440),
  },
  {
    id: 'txn_005',
    userId: 'temp_user_id',
    amount: 10,
    type: 'earn',
    reason: 'community_report',
    createdAt: mins(2880),
  },
  {
    id: 'txn_006',
    userId: 'temp_user_id',
    amount: 30,
    type: 'spend',
    reason: 'payment_discount',
    createdAt: mins(4320),
  },
];

export const BOOKINGS = [];

export const USERS = [];
