// Built Day 9
/**
 * @file LoginScreen.js
 * @description Driver authentication screen featuring Phone OTP login with Firebase.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import * as authService from '../../services/authService';

/** LoginScreen component containing phone entry, OTP inputs, validation, and redirection. */
const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef([]);

  // Handle OTP countdown timer ticks
  useEffect(() => {
    let interval;
    if (confirmResult && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (confirmResult && timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [confirmResult, timer]);

  /** Translates Firebase auth errors into user-friendly messages. */
  const handleAuthError = (err) => {
    const errCode = err.code || '';
    const errMsg = err.message || '';
    if (errCode.includes('auth/invalid-phone-number') || errMsg.includes('invalid phone')) {
      setError('Invalid phone number format. Please enter a valid 10-digit number.');
    } else if (errCode.includes('auth/session-expired') || errMsg.includes('session-expired')) {
      setError('OTP session has expired. Please request a new OTP.');
    } else if (errCode.includes('auth/invalid-verification-code') || errMsg.includes('invalid-verification-code')) {
      setError('Incorrect OTP. Please enter the correct 6-digit code.');
    } else if (errCode.includes('auth/network-request-failed')) {
      setError('Network connection failed. Please check your internet connection.');
    } else if (errCode.includes('auth/too-many-requests')) {
      setError('Too many attempts. Please try again later.');
    } else {
      setError('Authentication failed. Please verify your connection and try again.');
    }
  };

  /** Initiates Phone Authentication and sends OTP. */
  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) return;
    setError('');
    setLoading(true);
    try {
      const fullPhone = `+91${phoneNumber}`;
      const confirmation = await authService.sendOTP(fullPhone);
      setConfirmResult(confirmation);
      setTimer(30);
      setCanResend(false);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  /** Verifies the entered OTP and routes the user. */
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6 || !confirmResult) return;
    setError('');
    setLoading(true);
    try {
      const userCredential = await authService.verifyOTP(confirmResult, code);
      if (userCredential && userCredential.user) {
        const { uid, phoneNumber: phone } = userCredential.user;
        await authService.createUserIfNotExists(uid, phone || `+91${phoneNumber}`);
        navigation.replace('HomeMap');
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  /** Handles OTP input changes and controls focus. */
  const handleOtpChange = (text, index) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanedText;
    setOtp(newOtp);

    if (cleanedText.length > 0 && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  /** Handles backspace keys to reverse focus. */
  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /** Resends the verification code to the phone number. */
  const handleResendOTP = async () => {
    if (!canResend) return;
    setError('');
    setLoading(true);
    try {
      setOtp(['', '', '', '', '', '']);
      const fullPhone = `+91${phoneNumber}`;
      const confirmation = await authService.sendOTP(fullPhone);
      setConfirmResult(confirmation);
      setTimer(30);
      setCanResend(false);
      otpRefs.current[0]?.focus();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.container}>
          {/* Header & Logo */}
          <View style={styles.headerContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to find parking near you</Text>
          </View>

          {/* Form */}
          {!confirmResult ? (
            <View style={styles.formContainer}>
              <View style={styles.inputLabelContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
              </View>
              <View style={styles.phoneInputRow}>
                <View style={styles.prefixContainer}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                  editable={!loading}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  phoneNumber.length !== 10 || loading ? styles.buttonDisabled : null,
                ]}
                onPress={handleSendOTP}
                disabled={phoneNumber.length !== 10 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputLabelContainer}>
                <Text style={styles.inputLabel}>Enter 6-Digit OTP</Text>
              </View>
              <View style={styles.otpInputRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    style={styles.otpBox}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    editable={!loading}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  otp.join('').length !== 6 || loading ? styles.buttonDisabled : null,
                ]}
                onPress={handleVerifyOTP}
                disabled={otp.join('').length !== 6 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOTP}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendTimer}>Resend OTP in {timer}s</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLabelContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    marginBottom: 16,
  },
  prefixContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  prefixText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.occupied,
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '400',
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendLink: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  resendTimer: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
});

export default LoginScreen;
