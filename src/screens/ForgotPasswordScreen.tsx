// src/features/auth/screens/ForgotPasswordScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard,
  Animated,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

// Responsive scaling helpers (same as LoginScreen)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Oops!');
  const [errorMessage, setErrorMessage] = useState('');

  // Animations
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardShow = Keyboard.addListener(
      isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const formShift = isIOS
          ? -(e.endCoordinates.height * 0.45)
          : -(e.endCoordinates.height * 0.55);

        Animated.parallel([
          Animated.timing(headerOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(headerTranslateY, {
            toValue: -140,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(formTranslateY, {
            toValue: formShift,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    const keyboardHide = Keyboard.addListener(
      isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.parallel([
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(formTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  const validateEmail = (): boolean => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Please enter your email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('That email does not look right');
      return false;
    }
    return true;
  };

  const getFriendlyErrorMessage = (err: any): { title: string; message: string } => {
    let title = 'Something went wrong';
    let message = 'Please try again later.';

    if (err?.response) {
      const { status } = err.response;
      if (status === 400) {
        title = 'Invalid Email';
        message = 'No account found with that email address.';
      } else if (status === 404) {
        title = 'Account Not Found';
        message = 'We could not find an account with that email.';
      } else if (status === 429) {
        title = 'Too Many Attempts';
        message = 'Please wait a few minutes and try again.';
      } else if (status >= 500) {
        title = 'Server Issue';
        message = 'We are having some trouble. Please try again soon.';
      }
    } else if (err?.message?.toLowerCase().includes('network')) {
      title = 'No Internet Connection';
      message = 'Please check your internet and try again.';
    }

    return { title, message };
  };

  const handleForgotPassword = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        'https://feelvie.yaytech.in/api/auth/forgot-password/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      // Treat any 2xx as success
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const simulatedError = { response: { status: response.status }, ...errorData };
        throw simulatedError;
      }

      setSuccessModalVisible(true);
    } catch (err: any) {
      const { title, message } = getFriendlyErrorMessage(err);
      setErrorTitle(title);
      setErrorMessage(message);
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const SvgIllustration = () => (
    <Svg width={width * 0.55} height={width * 0.45} viewBox="0 0 300 220">
      {/* Background glow */}
      <Circle cx="150" cy="110" r="90" fill="#F3E8FF" opacity="0.4" />

      {/* Envelope body */}
      <Rect x="55" y="75" width="190" height="130" rx="18" fill="#FFFFFF" stroke="#E0BBFF" strokeWidth="5" />

      {/* Envelope flap */}
      <Path
        d="M55 93 L150 155 L245 93"
        fill="none"
        stroke="#D8BFD8"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Lock icon on envelope */}
      <Circle cx="150" cy="140" r="22" fill="#F3E8FF" />
      <Path
        d="M141 138 L141 132 C141 127 159 127 159 132 L159 138"
        fill="none"
        stroke="#bf5299"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Rect x="138" y="137" width="24" height="17" rx="5" fill="#bf5299" />
      <Circle cx="150" cy="146" r="3" fill="#FFFFFF" />

      {/* Sparkles */}
      <Line x1="65" y1="55" x2="65" y2="65" stroke="#E0BBFF" strokeWidth="3" strokeLinecap="round" />
      <Line x1="60" y1="60" x2="70" y2="60" stroke="#E0BBFF" strokeWidth="3" strokeLinecap="round" />
      <Line x1="235" y1="48" x2="235" y2="56" stroke="#D8BFD8" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="231" y1="52" x2="239" y2="52" stroke="#D8BFD8" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F5FF" />

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + verticalScale(12) }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back-ios" size={20} color="#374151" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={isIOS ? 'padding' : undefined}
        keyboardVerticalOffset={isIOS ? 20 : 0}
        enabled={isIOS}
      >
        <View style={styles.innerContent}>
          {/* Animated Header */}
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <View style={styles.illustrationContainer}>
              <SvgIllustration />
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your email and we will send you a reset link.
              </Text>
            </View>
          </Animated.View>

          {/* Animated Form */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputCard, emailError ? styles.inputErrorBorder : null]}>
                  <Icon name="email" size={22} color="#777" style={styles.leftIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="hello@example.com"
                    placeholderTextColor="#A0A0C0"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleForgotPassword}
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                activeOpacity={0.85}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <View style={styles.backToLoginRow}>
                <Icon name="arrow-back" size={16} color="#B03385" style={{ marginRight: 4 }} />
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: isIOS ? 100 : 80 }} />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Icon name="mark-email-read" size={64} color="#4CAF50" />
            <Text style={modalStyles.title}>Check Your Inbox!</Text>
            <Text style={modalStyles.message}>
              We have sent a password reset link to{'\n'}
              <Text style={modalStyles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            </Text>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={modalStyles.closeButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={errorModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Icon name="error-outline" size={64} color="#F44336" />
            <Text style={[modalStyles.title, { color: '#D32F2F' }]}>{errorTitle}</Text>
            <Text style={modalStyles.message}>{errorMessage}</Text>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={modalStyles.closeButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5FF',
    paddingTop: 80,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0D4FF',
    shadowColor: '#993c89',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  keyboardAvoid: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: Platform.select({ ios: 60, android: 50 }),
    marginBottom: 28,
  },
  welcomeText: {
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(34),
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  formContainer: {
    width: '100%',
  },
  form: {},
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 58,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E0D4FF',
    shadowColor: '#993c89',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#b03384de',
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B03385',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backToLoginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  backToLoginText: {
    color: '#B03385',
    fontWeight: '700',
    fontSize: 15,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '84%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#B03385',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#b03384de',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginTop: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});