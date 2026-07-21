# 🚗 ParkNow — Real-Time Smart Parking Mobile App

![ParkNow Banner](https://raw.githubusercontent.com/psudharshanchowdary/psudharshanchowdary/main/github_readme_banner.svg)

**ParkNow** is a modern, cross-platform React Native mobile application designed to solve urban parking congestion. Drivers can search nearby parking lots, check live spot availability via IoT sensors/Firebase, reserve spots in advance, and pay seamlessly using Razorpay and ParkCoins.

---

## 🌟 Key Features

- 📍 **Real-Time GPS Spot Finder**: Locate nearest available parking lots within customizable radius (km).
- 🅿️ **Live Spot Availability Grid**: Color-coded visual grid showing available, reserved, and EV charging spots.
- 💳 **Razorpay & ParkCoins Payments**: Instant checkout with automated 10% coin cashback rewards.
- 🔔 **FCM Push Reminders**: Automated notifications before booking expiry and renewal prompts.
- 🌙 **Modern Glassmorphic Dark UI**: Custom tailored dark theme with smooth micro-animations.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Mobile Frontend** | React Native, React Navigation v6, Lucide React Native |
| **State Management** | Zustand, React Query |
| **Backend & Database** | Firebase Cloud Firestore, Node.js API Routes |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Payment Gateway** | Razorpay React Native SDK |

---

## 🚀 Quick Start & Installation

```bash
# Clone repository
git clone https://github.com/psudharshanchowdary/ParkNow.git
cd ParkNow

# Install dependencies
npm install

# Run on Android / iOS
npm run android
# or
npm run ios
```

---

## 📄 License
Distributed under the MIT License.
