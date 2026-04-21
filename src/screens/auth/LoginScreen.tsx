// src/screens/auth/LoginScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
  Image,
  KeyboardEventListener,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { loginUser, saveAuthData } from '../../api/authApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../../config/env';

const isIOS = Platform.OS === 'ios';

// Responsive scaling utility
const scale = (size: number, baseWidth: number = 375) => {
  const { width } = Dimensions.get('window');
  return (width / baseWidth) * size;
};

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { login: authLogin } = useAuth();
  const imageHeightAnim = useRef(new Animated.Value(scale(280))).current;

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

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(imageHeightAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(imageHeightAnim, {
        toValue: scale(280),
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [imageHeightAnim]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6ecef" />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={isIOS ? 'padding' : 'height'}
        keyboardVerticalOffset={isIOS ? 0 : 0}
      >
        {/* Image Header - Animated Height */}
        <Animated.View style={[styles.imageContainer, { height: imageHeightAnim }]}>
          <Image
            source={require('../../assets/images/login.png')}
            style={styles.headerImage}
            resizeMode="contain"
          />
        </Animated.View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Ready to try new</Text>
            <Text style={styles.titleHighlight}>dresses?</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Login into your account</Text>

          {/* Email Input Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputCard, emailError && styles.inputErrorBorder]}>
                <Icon name="email" size={18} color="#AAAAAA" style={styles.leftIcon} />
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
                <Icon name="lock" size={18} color="#AAAAAA" style={styles.leftIcon} />
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
                    size={18}
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
                <Text style={styles.buttonText}>Continue with Email</Text>
              )}
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.guestButton}
              activeOpacity={0.85}
              onPress={() => navigation.replace('MainTabs')}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity> */}
          </View>

          {/* Already Have Account */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>Don't Have an Account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.loginHighlight}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Conditions */}
          <TouchableOpacity>
            <Text style={styles.termsText}>Terms and Conditions</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
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
  keyboardAvoid: { 
    flex: 1 
  },
  scrollContent: {
    paddingBottom: scale(40),
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: scale(280),
    backgroundColor: '#f6ecef',
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
  },
  headerImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
  },
  titleSection: {
    paddingHorizontal: '6.4%',
    paddingTop: scale(24),
    marginBottom: scale(12),
  },
  title: {
    fontFamily: 'serif',
    fontSize: scale(24),
    fontWeight: '800',
    color: '#111111',
    lineHeight: scale(36),
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },
  titleHighlight: {
    fontFamily: 'serif',
    fontSize: scale(24),
    fontWeight: '800',
    color: '#f8ac1b',
    lineHeight: scale(36),
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: 'serif',
    fontSize: scale(15),
    color: '#666666',
    lineHeight: scale(22),
    paddingHorizontal: '6.4%',
    marginBottom: scale(14),
  },
  formContainer: {
    paddingHorizontal: '6.4%',
  },
  inputWrapper: {
    marginBottom: scale(24),
  },
  inputLabel: {
    fontSize: scale(14),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: scale(6),
    letterSpacing: 0.5,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: scale(8),
    height: scale(48),
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputErrorBorder: {
    borderColor: '#111111',
  },
  leftIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: scale(16),
    color: '#111111',
    fontFamily: 'Poppins-Regular',
  },
  eyeButton: {
    padding: scale(8),
  },
  errorText: {
    color: '#111111',
    fontSize: scale(13),
    marginTop: scale(6),
    marginLeft: scale(4),
    fontFamily: 'Poppins-Regular',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: scale(25),
  },
  forgotText: {
    color: '#111111',
    fontSize: scale(15),
    fontFamily: 'Poppins-Regular',
  },
  loginButton: {
    backgroundColor: '#111111',
    height: scale(48),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(28),
  },
  guestButton: {
    backgroundColor: '#FFFFFF',
    height: scale(48),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: scale(28),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: scale(16),
    fontFamily: 'Poppins-SemiBold',
  },
  guestButtonText: {
    color: '#111111',
    fontSize: scale(16),
    fontFamily: 'Poppins-SemiBold',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: '6.4%',
    marginBottom: scale(16),
  },
  loginText: {
    fontSize: scale(14),
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  loginHighlight: {
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scale(14),
  },
  termsText: {
    fontSize: scale(13),
    color: '#999999',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    textDecorationLine: 'underline',
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
    borderRadius: scale(12),
    padding: scale(32),
    width: '84%',
    maxWidth: scale(360),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aeaeae',
  },
  title: {
    fontSize: scale(22),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  message: {
    fontSize: scale(15),
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: scale(24),
    lineHeight: scale(22),
    fontFamily: 'Poppins-Regular',
  },
  closeButton: {
    backgroundColor: '#111111',
    paddingVertical: scale(14),
    paddingHorizontal: scale(40),
    borderRadius: scale(8),
    marginTop: scale(8),
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: scale(16),
    fontFamily: 'Poppins-SemiBold',
  },
});