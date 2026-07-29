# 🅿️ ParkNow

> Real-time parking discovery and booking app for busy markets and malls.

## Problem
Shoppers and visitors driving to popular commercial areas waste significant time circling streets looking for parking — because there is no system to view real-time availability or reserve in advance.

**Itch Score: 81 | Frequency: 8/10 | Category: Consumer Services**

## Solution
ParkNow is a full-stack React Native app (iOS + Android) that solves this with:
- Live parking map with real-time spot counts
- Advance spot reservation and in-app payment
- QR code entry/exit verification
- Community spot reporting with rewards
- ParkCoins gamification system
- Complete admin dashboard for lot owners

## Built in 4 weeks — daily GitHub commits

| Week | Focus | Screens |
|------|-------|---------|
| Week 1 | UX/UI Design (Figma) | 18 screens |
| Week 2 | Core driver app | Login → QR Ticket |
| Week 3 | Advanced features | Coins, Admin |
| Week 4 | Polish + publish | Animations, Store |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.73 |
| Auth | Firebase Phone OTP |
| Database | Firestore real-time |
| Maps | Google Maps SDK |
| Payments | Razorpay |
| Notifications | Firebase Cloud Messaging |
| Animations | React Native Reanimated |
| State | Zustand |

## Features
- ✅ Real-time spot availability map
- ✅ Advance booking and reservation
- ✅ In-app payment (UPI/Card/Wallet)
- ✅ QR code entry/exit system
- ✅ Navigation to parking spot
- ✅ Community spot reporting
- ✅ ParkCoins rewards system
- ✅ Admin dashboard for lot owners
- ✅ Push notifications
- ✅ Offline support

## Screenshots
[Add screenshots from App Store assets]

## Setup
1. Clone: git clone [repo url]
2. Install: npm install
3. Add .env file with API keys (see .env.example)
4. Add google-services.json from Firebase
5. Run: npx react-native run-android

## Architecture
- Role-based navigation (Driver / Admin)
- Firestore real-time listeners with cleanup
- Service layer pattern (auth/booking/parking)
- Custom hooks for reusable logic
- Atomic design component structure

## Built by
Sudharshan Chowdary
Daily commits: Day 01 → Day 28
Problem validated with 81 itch score
