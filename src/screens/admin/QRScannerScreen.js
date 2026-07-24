// Built Day 16
/**
 * @file QRScannerScreen.js
 * @description Admin QR scanner screen for verifying and confirming
 *              driver parking entries. Supports camera barcode scan and
 *              manual booking ID entry with full validation flow.
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
  TextInput,
  Animated,
  Easing,
  Dimensions,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';
import { verifyBookingQR, confirmBookingEntry } from '../../services/bookingService';
import { formatEndTime, formatScanError } from '../../utils/formatters';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SIZE = 240;
const FRAME_TOP = (SCREEN_HEIGHT - FRAME_SIZE) / 2 - 60;

/** QRScannerScreen functional component. */
const QRScannerScreen = ({ navigation }) => {
  const currentUser = authService.getCurrentUser();
  const uid = currentUser?.uid || 'temp_admin_id';

  const [cameraPermission, setCameraPermission] = useState('checking');
  const [scanState, setScanState] = useState('idle');
  const [manualInput, setManualInput] = useState('');
  const [scannedBooking, setScannedBooking] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [adminLotId, setAdminLotId] = useState(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);

  const isScanning = useRef(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef(null);

  // Lazy-load react-native-camera
  let RNCamera = null;
  try {
    RNCamera = require('react-native-camera').RNCamera;
  } catch (_e) {
    // Camera module unavailable — manual only mode
  }

  // Fetch admin's lot ID
  useEffect(() => {
    let isMounted = true;
    const fetchLot = async () => {
      try {
        const doc = await firestore().collection('users').doc(uid).get();
        if (!isMounted) return;
        setAdminLotId(doc.exists && doc.data()?.lotId ? doc.data().lotId : 'lot_001');
      } catch (_e) {
        if (isMounted) setAdminLotId('lot_001');
      }
    };
    fetchLot();
    return () => { isMounted = false; };
  }, [uid]);

  // Request camera permission + start scan line animation
  useEffect(() => {
    let isMounted = true;

    const requestCamera = async () => {
      if (!RNCamera) {
        setCameraAvailable(false);
        setCameraPermission('denied');
        return;
      }
      try {
        const { check, request, PERMISSIONS, RESULTS } = require('react-native-permissions');
        const perm = Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;
        let status = await check(perm);
        if (status === RESULTS.DENIED) status = await request(perm);
        if (!isMounted) return;
        setCameraPermission(status === RESULTS.GRANTED ? 'granted' : 'denied');
      } catch (_e) {
        if (!isMounted) return;
        setCameraPermission('denied');
        setCameraAvailable(false);
      }
    };

    requestCamera();

    scanLineLoop.current = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: FRAME_SIZE - 2,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    scanLineLoop.current.start();

    return () => {
      isMounted = false;
      if (scanLineLoop.current) scanLineLoop.current.stop();
    };
  }, [scanLineAnim, RNCamera]);

  /**
   * Verifies a booking ID from camera or manual entry.
   * @param {string} bookingId
   */
  const verifyBooking = useCallback(async (bookingId) => {
    if (!bookingId || isScanning.current) return;
    isScanning.current = true;
    setScanState('scanning');
    setErrorMessage('');
    setScannedBooking(null);

    try {
      const { valid, booking, error } = await verifyBookingQR(bookingId.trim(), adminLotId);

      if (!valid) {
        setScanState('error');
        setErrorMessage(formatScanError(error));
        isScanning.current = false;
        return;
      }

      let driverName = booking.driverName || booking.userName || 'Driver';
      try {
        const userDoc = await firestore().collection('users').doc(booking.userId).get();
        if (userDoc.exists && userDoc.data()?.displayName) {
          driverName = userDoc.data().displayName;
        }
      } catch (_e) {}

      await confirmBookingEntry(bookingId.trim(), booking.spotId, booking.lotId || adminLotId);

      setScannedBooking({
        ...booking,
        driverName,
        endTimeLabel: formatEndTime(booking.startHour ?? 9, booking.duration ?? 1),
      });
      setScanState('success');
    } catch (_e) {
      setScanState('error');
      setErrorMessage(formatScanError('invalid_qr'));
    } finally {
      isScanning.current = false;
    }
  }, [adminLotId]);

  /** Handles QR barcode read from camera. */
  const handleBarCodeRead = useCallback(({ data }) => {
    if (scanState !== 'idle' || isScanning.current) return;
    verifyBooking(data);
  }, [scanState, verifyBooking]);

  /** Resets to idle state for next scan attempt. */
  const handleTryAgain = useCallback(() => {
    setScanState('idle');
    setManualInput('');
    setErrorMessage('');
    setScannedBooking(null);
    isScanning.current = false;
  }, []);

  /** Renders the bottom panel content based on current scan state. */
  const renderBottomPanel = () => {
    if (scanState === 'scanning') {
      return (
        <View style={styles.panelCenter}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.panelScanningText}>Verifying booking…</Text>
        </View>
      );
    }

    if (scanState === 'success' && scannedBooking) {
      return (
        <View style={styles.panelCenter}>
          <View style={styles.resultIconCircle}>
            <Text style={styles.resultCheckText}>✓</Text>
          </View>
          <Text style={styles.resultTitle}>Entry confirmed!</Text>
          <Text style={styles.resultSub}>{scannedBooking.driverName}</Text>
          <Text style={styles.resultSub}>
            Spot {scannedBooking.spotLabel || '—'} · {scannedBooking.endTimeLabel}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (scanState === 'error') {
      return (
        <View style={styles.panelCenter}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
          <Text style={styles.errorTitle}>Scan failed</Text>
          <Text style={styles.errorMsg}>{errorMessage}</Text>
          <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain}>
            <Text style={styles.tryAgainText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.manualLabel}>Or enter booking ID manually</Text>
        <TextInput
          style={styles.manualInput}
          placeholder="Enter booking ID..."
          placeholderTextColor={COLORS.textSecondary}
          value={manualInput}
          onChangeText={setManualInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.verifyBtn, !manualInput.trim() ? styles.verifyBtnDisabled : null]}
          disabled={!manualInput.trim()}
          onPress={() => verifyBooking(manualInput)}
        >
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ── Permission denied / no camera ─────────────────────────────────────────────
  if (cameraPermission === 'denied' || !cameraAvailable) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.permissionContainer}>
          <Icon name="camera-outline" size={56} color={COLORS.textSecondary} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>
            Enable camera permission to scan QR codes, or use manual entry below.
          </Text>
          <TouchableOpacity style={styles.enableCameraBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.enableCameraText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomPanelStatic}>
          {renderBottomPanel()}
        </View>
      </SafeAreaView>
    );
  }

  if (cameraPermission === 'checking') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // ── Full camera scanner UI ────────────────────────────────────────────────────
  return (
    <View style={styles.fullContainer}>
      {RNCamera && (
        <RNCamera
          style={StyleSheet.absoluteFill}
          type={RNCamera.Constants.Type.back}
          captureAudio={false}
          onBarCodeRead={scanState === 'idle' ? handleBarCodeRead : undefined}
        />
      )}

      {/* 4-panel dark overlay */}
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: FRAME_TOP }]} />
      <View style={[styles.overlay, { top: FRAME_TOP + FRAME_SIZE, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.overlay, { top: FRAME_TOP, left: 0, width: (SCREEN_WIDTH - FRAME_SIZE) / 2, height: FRAME_SIZE }]} />
      <View style={[styles.overlay, { top: FRAME_TOP, right: 0, width: (SCREEN_WIDTH - FRAME_SIZE) / 2, height: FRAME_SIZE }]} />

      {/* Camera header */}
      <View style={styles.cameraHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Scan frame with L-corner brackets and animated scan line */}
      <View style={[styles.scanFrame, { top: FRAME_TOP, left: (SCREEN_WIDTH - FRAME_SIZE) / 2 }]}>
        {/* Top-left corner */}
        <View style={[styles.cornerH, { top: 0, left: 0 }]} />
        <View style={[styles.cornerV, { top: 0, left: 0 }]} />
        {/* Top-right corner */}
        <View style={[styles.cornerH, { top: 0, right: 0 }]} />
        <View style={[styles.cornerV, { top: 0, right: 0 }]} />
        {/* Bottom-left corner */}
        <View style={[styles.cornerH, { bottom: 0, left: 0 }]} />
        <View style={[styles.cornerV, { bottom: 0, left: 0 }]} />
        {/* Bottom-right corner */}
        <View style={[styles.cornerH, { bottom: 0, right: 0 }]} />
        <View style={[styles.cornerV, { bottom: 0, right: 0 }]} />

        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]} />
      </View>

      <Text style={[styles.scanLabel, { top: FRAME_TOP - 40 }]}>Scan driver's QR code</Text>
      <Text style={[styles.scanHint, { top: FRAME_TOP + FRAME_SIZE + 16 }]}>
        Align the QR code within the frame
      </Text>

      <View style={styles.bottomPanel}>
        {renderBottomPanel()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  fullContainer: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(13,13,20,0.8)',
    zIndex: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center' },
  overlay: { position: 'absolute', backgroundColor: 'rgba(13,13,20,0.6)', zIndex: 5 },
  scanFrame: { position: 'absolute', width: FRAME_SIZE, height: FRAME_SIZE, zIndex: 6 },
  cornerH: { position: 'absolute', width: 30, height: 3, backgroundColor: COLORS.primary },
  cornerV: { position: 'absolute', width: 3, height: 30, backgroundColor: COLORS.primary },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.85,
  },
  scanLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 7,
  },
  scanHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    zIndex: 7,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    zIndex: 10,
  },
  bottomPanelStatic: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    margin: 0,
  },
  panelCenter: { alignItems: 'center', gap: 10 },
  panelScanningText: { color: COLORS.textPrimary, fontSize: 14, marginTop: 8 },
  resultIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#10B98122', borderWidth: 2, borderColor: COLORS.available,
    justifyContent: 'center', alignItems: 'center',
  },
  resultCheckText: { color: COLORS.available, fontSize: 22, fontWeight: '700' },
  resultTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  resultSub: { color: COLORS.textSecondary, fontSize: 13 },
  doneBtn: {
    width: '100%', height: 48, borderRadius: 10,
    backgroundColor: COLORS.available, justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  doneBtnText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  errorIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FF3B5C22', borderWidth: 2, borderColor: COLORS.occupied,
    justifyContent: 'center', alignItems: 'center',
  },
  errorIconText: { color: COLORS.occupied, fontSize: 22, fontWeight: '700' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  errorMsg: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  tryAgainBtn: {
    width: '100%', height: 48, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  tryAgainText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },
  manualLabel: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  manualInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, height: 48, paddingHorizontal: 16,
    color: COLORS.textPrimary, fontSize: 14, marginBottom: 10,
  },
  verifyBtn: { height: 48, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  verifyBtnDisabled: { backgroundColor: COLORS.card },
  verifyBtnText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 12, paddingBottom: 200,
  },
  permissionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' },
  permissionSub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  enableCameraBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8 },
  enableCameraText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
});

export default QRScannerScreen;
