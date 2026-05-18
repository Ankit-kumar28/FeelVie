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
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isIOS = Platform.OS === 'ios';

// Responsive scaling utility
const scale = (size: number, baseWidth: number = 375) => {
  const { width } = Dimensions.get('window');
  return (width / baseWidth) * size;
};

type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const imageHeightAnim = useRef(new Animated.Value(scale(280))).current;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const validateEmail = (): boolean => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Please enter your email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('That email doesn\'t look right');
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
        'https://api.feelvie.com/api/auth/forgot-password/',
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

  const SvgIllustration = () => null; // Removed - using image header instead

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
            source={require('../assets/images/login.png')}
            style={styles.headerImage}
            resizeMode="contain"
          />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Forgot Your</Text>
            <Text style={styles.titleHighlight}>Password?</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Enter your email and we will send you a reset link.</Text>

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
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <View style={styles.backToLoginContainer}>
              <Text style={styles.backToLoginText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.backToLoginHighlight}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: scale(40) }} />
        </ScrollView>
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
  errorText: {
    color: '#111111',
    fontSize: scale(13),
    marginTop: scale(6),
    marginLeft: scale(4),
    fontFamily: 'Poppins-Regular',
  },
  submitButton: {
    backgroundColor: '#111111',
    height: scale(48),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
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
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: '6.4%',
  },
  backToLoginText: {
    fontSize: scale(14),
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  backToLoginHighlight: {
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scale(14),
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
  emailHighlight: {
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
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
