// src/features/auth/screens/LoginScreen.tsx

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
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { loginUser, saveAuthData } from '../../api/authApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../../config/env';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

// Responsive scaling helpers
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Oops!');
  const [errorMessage, setErrorMessage] = useState('');

  const [headerY, setHeaderY] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Animations
  const headerOpacity = useState(new Animated.Value(1))[0];
  const headerTranslateY = useState(new Animated.Value(0))[0];
  const loginTitleOpacity = useState(new Animated.Value(0))[0];
  const formTranslateY = useState(new Animated.Value(0))[0];

  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    const keyboardShow = Keyboard.addListener(
      isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeightRef.current = e.endCoordinates.height;
        const formShift = isIOS ? -(e.endCoordinates.height * 0.55) : -(e.endCoordinates.height * 0.65);

        setIsKeyboardVisible(true);
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(headerTranslateY, { toValue: -140, duration: 260, useNativeDriver: true }),
          Animated.timing(loginTitleOpacity, { toValue: 1, duration: 300, delay: 80, useNativeDriver: true }),
          Animated.timing(formTranslateY, { toValue: formShift, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    );

    const keyboardHide = Keyboard.addListener(
      isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(headerTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(loginTitleOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(formTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    );

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  const validateInputs = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Please enter your email');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('That email doesn\'t look right');
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError('Please enter your password');
      valid = false;
    } else if (password.trim().length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }

    return valid;
  };

  const getFriendlyErrorMessage = (err: any): { title: string; message: string } => {
    let title = 'Something went wrong';
    let message = 'Please try again later.';

    if (err?.response) {
      const { status } = err.response;
      if (status === 401) {
        title = 'Incorrect Email or Password';
        message = 'The email or password you entered is incorrect.';
      } else if (status === 400) {
        title = 'Invalid Input';
        message = 'Please check your details.';
      } else if (status === 403) {
        title = 'Access Denied';
        message = 'You don\'t have permission to sign in at this time.';
      } else if (status === 429) {
        title = 'Too Many Attempts';
        message = 'Please wait a few minutes and try again.';
      } else if (status >= 500) {
        title = 'Server Issue';
        message = 'We are having some trouble. Please try again soon.';
      }
    } else if (err?.message?.includes('Network')) {
      title = 'No Internet Connection';
      message = 'Please check your internet and try again.';
    }

    return { title, message };
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      };

      const loginResponse = await loginUser(payload);
      if (!loginResponse?.access) throw new Error('Invalid credentials');

      const token = loginResponse.access;

      const profileResponse = await fetch(`${BASE_URL}/api/auth/me/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) throw new Error('Failed to fetch profile');

      const fullUser = await profileResponse.json();

      await saveAuthData(token, fullUser);
      await authLogin(token, fullUser);

      setSuccessModalVisible(true);
      setTimeout(() => {
        setSuccessModalVisible(false);
        navigation.replace('MainTabs');
      }, 2200);
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
      <Circle cx="150" cy="100" r="90" fill="#F7F7F7" opacity="0.6" />
      <Rect x="70" y="20" width="160" height="280" rx="32" fill="#FFFFFF" stroke="#E8E8E8" strokeWidth="6" />
      <Rect x="85" y="45" width="130" height="210" rx="12" fill="#F7F7F7" />
      <Circle cx="150" cy="90" r="28" fill="#E8E8E8" />
      <Rect x="110" y="135" width="80" height="12" rx="6" fill="#E8E8E8" />
      <Rect x="95" y="155" width="110" height="12" rx="6" fill="#E8E8E8" opacity="0.7" />
      <Path
        d="M150 190 L150 210 M130 190 C130 175 170 175 170 190 L170 210 L130 210 Z"
        fill="none"
        stroke="#111111"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );

  const loginTitleTop = insets.top + verticalScale(16);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to continue your shopping journey</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              { transform: [{ translateY: formTranslateY }] },
            ]}
          >
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputCard, emailError && styles.inputErrorBorder]}>
                  <Icon name="email" size={22} color="#AAAAAA" style={styles.leftIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="hello@example.com"
                    placeholderTextColor="#AAAAAA"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputCard, passwordError && styles.inputErrorBorder]}>
                  <Icon name="lock" size={22} color="#AAAAAA" style={styles.leftIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#AAAAAA"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={22}
                      color="#AAAAAA"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={styles.signupHighlight}>Register</Text>
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
            <Icon name="check-circle" size={64} color="#111111" />
            <Text style={modalStyles.title}>Welcome back!</Text>
            <Text style={modalStyles.message}>You're all set. Taking you to dashboard...</Text>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={errorModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Icon name="error-outline" size={64} color="#111111" />
            <Text style={modalStyles.title}>{errorTitle}</Text>
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
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: { flex: 1 },
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
    fontSize: moderateScale(36),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: '#6c6c6c',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  formContainer: {
    width: '100%',
  },
  form: {},
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 58,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#6f6f6f',
  },
  inputErrorBorder: {
    borderColor: '#111111',
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
    fontFamily: 'Poppins-Regular',
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: '#111111',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontFamily: 'Poppins-Regular',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotText: {
    color: '#111111',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  loginButton: {
    backgroundColor: '#111111',
    height: 58,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 40,
  },
  signupText: {
    fontSize: 15,
    color: '#AAAAAA',
    fontFamily: 'Poppins-Regular',
  },
  signupHighlight: {
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    width: '84%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aeaeae',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'Poppins-Regular',
  },
  closeButton: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});