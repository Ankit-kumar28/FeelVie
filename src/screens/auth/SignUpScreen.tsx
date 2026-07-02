// src/features/auth/screens/SignUpScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Keyboard,
  Dimensions,
  useWindowDimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { registerUser } from '../../api/authApi';

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
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp>();
  const imageHeightAnim = useRef(new Animated.Value(scale(280))).current;

  const selectedRole = 'customer';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false); // New state for checkbox
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

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

  const showToast = (type: 'success' | 'error', title: string, msg: string) => {
    Toast.show({ type, text1: title, text2: msg, position: 'top', visibilityTime: 3000, topOffset: 60 });
  };

  const validateForm = () => {
    if (!firstName.trim()) return showToast('error', 'Required', 'First name is required'), false;
    if (!lastName.trim()) return showToast('error', 'Required', 'Last name is required'), false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim()))
      return showToast('error', 'Invalid', 'Enter a valid email'), false;
    if (!password.trim()) return showToast('error', 'Required', 'Password is required'), false;
    if (password.length < 6) return showToast('error', 'Weak', 'Password min 6 chars'), false;
    
    // Checkbox validation
    if (!isAccepted) return showToast('error', 'Required', 'Please accept the Privacy Policy and Terms of Use'), false;
    
    return true;
  };

  const handleSignUp = async () => {
    setApiError(null);
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim(),
        role: selectedRole,
      };

      await registerUser(payload);
      setSuccessModalVisible(true);

      setTimeout(() => {
        setSuccessModalVisible(false);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }, 2500);

    } catch (err: any) {
      let msg = 'Something went wrong.';
      const data = err?.response?.data;
      if (data?.email?.[0]) msg = data.email[0];
      else if (data?.phone?.[0]) msg = data.phone[0];
      else if (data?.detail) msg = data.detail;
      else if (data?.message) msg = data.message;

      if (msg.toLowerCase().includes('already') || msg.includes('exists'))
        msg = 'Email already registered. Please login.';

      setApiError(msg);
      showToast('error', 'Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6ecef" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
            <Text style={styles.title}>Create Your</Text>
            <Text style={styles.titleHighlight}>Account</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Start building your personalized virtual wardrobe today.</Text>

          {/* Error Message */}
          {apiError && (
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={styles.inputCard}>
                <Icon name="person-outline" size={18} color="#AAAAAA" />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#AAAAAA"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.inputCard}>
                <Icon name="person-outline" size={18} color="#AAAAAA" />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#AAAAAA"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputCard}>
                <Icon name="email" size={18} color="#AAAAAA" />
                <TextInput
                  style={styles.input}
                  placeholder="hello@example.com"
                  placeholderTextColor="#AAAAAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputCard}>
                <Icon name="lock" size={18} color="#AAAAAA" />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#AAAAAA"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={{ padding: 8 }} onPress={() => setShowPassword(!showPassword)}>
                  <Icon 
                    name={showPassword ? 'visibility' : 'visibility-off'} 
                    size={18} 
                    color="#AAAAAA" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Phone Number 
                <Text style={{ fontSize: scale(12), color: '#AAAAAA' }}> (Optional)</Text>
              </Text>
              <View style={styles.inputCard}>
                <Icon name="phone" size={18} color="#AAAAAA" />
                <TextInput
                  style={styles.input}
                  placeholder="10 digit number"
                  placeholderTextColor="#AAAAAA"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>
          </View>

          {/* Checkbox Section */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={styles.checkbox} 
              onPress={() => setIsAccepted(!isAccepted)}
            >
              <Icon 
                name={isAccepted ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color={isAccepted ? "#111111" : "#AAAAAA"} 
              />
            </TouchableOpacity>
            <Text style={styles.checkboxText}>
              By continuing, I accept the{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Privacy Policy
              </Text>
              {' '}and{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => navigation.navigate('TermsOfUse')}
              >
                Terms and Conditions
              </Text>
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.signupButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Already Have Account */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginHighlight}>Login</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <Icon name="check-circle" size={80} color="#111111" />
            <Text style={modalStyles.modalTitle}>Success!</Text>
            <Text style={modalStyles.modalMessage}>Account created successfully</Text>
            <Text style={modalStyles.modalSubMessage}>Redirecting to login...</Text>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(100),
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
    fontSize: scale(28),
    fontWeight: '800',
    color: '#111111',
    lineHeight: scale(36),
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },
  titleHighlight: {
    fontFamily: 'serif',
    fontSize: scale(28),
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
    marginBottom: scale(28),
  },
  formContainer: {
    paddingHorizontal: '6.4%',
    marginBottom: scale(18),
  },
  inputWrapper: {
    marginBottom: scale(8),
  },
  inputLabel: {
    fontSize: scale(14),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: scale(8),
    letterSpacing: 0.5,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    height: scale(48),
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  input: { 
    flex: 1, 
    fontSize: scale(16), 
    color: '#111111', 
    marginLeft: scale(12),
    fontFamily: 'Poppins-Regular',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: '6.4%',
    marginBottom: scale(24),
  },
  checkbox: {
    marginRight: scale(12),
  },
  checkboxText: {
    flex: 1,
    fontSize: scale(13),
    color: '#666666',
    fontFamily: 'Poppins-Regular',
    lineHeight: scale(18),
  },
  linkText: {
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    paddingHorizontal: '6.4%',
    marginBottom: scale(14),
  },
  signupButton: {
    backgroundColor: '#111111',
    height: scale(48),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(14),
  },
  buttonDisabled: { 
    opacity: 0.7 
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: scale(16), 
    fontFamily: 'Poppins-SemiBold' 
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
  apiErrorContainer: { 
    backgroundColor: '#F7F7F7', 
    padding: scale(14), 
    borderRadius: scale(8), 
    marginBottom: scale(24),
    marginHorizontal: '6.4%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  apiErrorText: { 
    color: '#111111', 
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(32),
    alignItems: 'center',
    width: '80%',
    maxWidth: scale(320),
    borderWidth: 1,
    borderColor: '#969696',
  },
  modalTitle: { 
    fontSize: scale(24), 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginTop: scale(20), 
    marginBottom: scale(8) 
  },
  modalMessage: { 
    fontSize: scale(16), 
    color: '#111111', 
    textAlign: 'center', 
    marginBottom: scale(4),
    fontFamily: 'Poppins-Regular',
  },
  modalSubMessage: { 
    fontSize: scale(14), 
    color: '#AAAAAA', 
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});