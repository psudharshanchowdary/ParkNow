# ParkNow — Test Checklist
## Day 20 QA Pass

### DRIVER FLOW 1: New user registration
- [ ] App opens, splash animation plays
- [ ] Onboarding slides swipe correctly
- [ ] Phone number input accepts only numbers
- [ ] +91 prefix shows correctly
- [ ] Send OTP button disabled under 10 digits
- [ ] Send OTP button enables at 10 digits
- [ ] OTP sent (Firebase console confirms)
- [ ] 6 OTP boxes appear after send
- [ ] Wrong OTP shows shake animation
- [ ] Wrong OTP shows error message
- [ ] Correct OTP navigates to HomeMap
- [ ] New user doc created in Firestore
- [ ] Welcome 50 ParkCoins added to wallet

### DRIVER FLOW 2: Find and book parking
- [ ] Home map loads with dark style
- [ ] User location blue dot shows
- [ ] Parking lot markers show on map
- [ ] Lot markers show correct counts
- [ ] Search bar filters lots by name
- [ ] Bottom sheet shows nearby lots
- [ ] Tapping lot card opens LotDetail
- [ ] LotDetail shows correct spot grid
- [ ] Available spots show green
- [ ] Occupied spots show red
- [ ] Tapping occupied spot does nothing
- [ ] "Book a Spot" navigates to SpotPicker
- [ ] SpotPicker shows interactive grid
- [ ] Tapping available spot selects it
- [ ] Tapping occupied spot is disabled
- [ ] Selected spot shows violet + scale
- [ ] Info card slides up on selection
- [ ] Continue button disabled until selected
- [ ] Continue navigates to BookingForm
- [ ] Today is pre-selected in date picker
- [ ] Past time slots are disabled
- [ ] Duration stepper min 1 max 8
- [ ] Price updates when duration changes
- [ ] GST calculated correctly (18%)
- [ ] Proceed to Payment navigates correctly
- [ ] Payment screen shows correct total
- [ ] ParkCoins toggle shows coin balance
- [ ] Coin discount applies correctly (max 30%)
- [ ] UPI selected by default
- [ ] Razorpay opens on Pay tap
- [ ] Payment success → QR ticket screen
- [ ] QR code renders with booking ID
- [ ] Pulse animation plays on QR
- [ ] Booking details show correctly
- [ ] +5 ParkCoins added after booking
- [ ] Navigate button opens Google Maps
- [ ] Share ticket uses Share API

### DRIVER FLOW 3: Community features
- [ ] Community report screen detects location
- [ ] Spot label input accepts text
- [ ] Quick select pills fill input
- [ ] Lot selection works
- [ ] Submit button disabled until both filled
- [ ] Report saved to Firestore
- [ ] +10 coins added on report
- [ ] Success animation plays
- [ ] Recent reports list updates
- [ ] ParkCoins wallet shows balance
- [ ] Coin count-up animation plays
- [ ] Transaction history shows correctly
- [ ] Filter tabs (All/Earned/Spent) work
- [ ] Referral code generates correctly
- [ ] Share referral uses Share API

### DRIVER FLOW 4: Bookings history
- [ ] All bookings load correctly
- [ ] Filter tabs work (All/Upcoming/Active/Completed/Cancelled)
- [ ] Stats row shows correct counts
- [ ] Upcoming booking shows countdown
- [ ] Active booking shows "View QR" link
- [ ] View QR navigates to QR screen
- [ ] Pull to refresh works
- [ ] Empty state shows when no bookings

### ADMIN FLOW 1: Dashboard
- [ ] Admin login routes to AdminDashboard
- [ ] Greeting changes by time of day
- [ ] Revenue shows today's total
- [ ] Occupancy ring shows correct %
- [ ] Active bookings count is correct
- [ ] Free spots count is correct
- [ ] "Scan QR" navigates to scanner
- [ ] "View lots" navigates to live view
- [ ] Recent bookings list shows correctly
- [ ] New booking banner appears live

### ADMIN FLOW 2: Lot management
- [ ] Live lot view shows all spots
- [ ] Spot colors match status correctly
- [ ] Tapping occupied spot opens sheet
- [ ] Bottom sheet shows booking details
- [ ] "Mark as available" updates Firestore
- [ ] Spot turns green after marking
- [ ] FAB scan button navigates to scanner
- [ ] QR scanner opens camera
- [ ] Camera permission request shows
- [ ] Scan line animation plays
- [ ] Valid QR shows success state
- [ ] Invalid QR shows error state
- [ ] Manual booking ID verify works
- [ ] Booking entry confirmed in Firestore

### ADMIN FLOW 3: Revenue and settings
- [ ] Revenue report loads correctly
- [ ] Period tabs switch correctly
- [ ] Bar chart animates on period change
- [ ] Tapping bar shows tooltip
- [ ] Summary metrics calculate correctly
- [ ] Payment breakdown adds to 100%
- [ ] Recent transactions list shows
- [ ] Lot settings loads current values
- [ ] Price stepper updates correctly
- [ ] Time picker modal opens and confirms
- [ ] Save button grayed until changes
- [ ] Save writes to Firestore
- [ ] Unsaved changes warning on back
- [ ] Delete lot shows confirm alert

### SYSTEM CHECKS
- [ ] App works with slow internet
- [ ] App shows offline banner when no internet
- [ ] App recovers when internet returns
- [ ] Push notification received (real device)
- [ ] Notification tap navigates correctly
- [ ] Haptic feedback on spot selection
- [ ] Haptic feedback on booking confirmed
- [ ] Toast messages show and auto-dismiss
- [ ] Loading skeletons show while fetching
- [ ] Empty states show when no data
- [ ] Error states show on fetch failure
- [ ] All animations are smooth (60fps)
- [ ] No crashes on any screen
- [ ] Memory usage stable over time
