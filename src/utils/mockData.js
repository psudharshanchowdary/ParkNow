/**
 * @file mockData.js
 * @description 5 realistic mock parking lots and their corresponding parking spots in Bengaluru.
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
  const occupiedIndexes = [2, 5, 8, 11, 14, 17]; // 6 indexes occupied

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

export const BOOKINGS = [];

export const USERS = [];
