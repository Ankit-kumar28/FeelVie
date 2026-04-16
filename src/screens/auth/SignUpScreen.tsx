// src/features/auth/screens/SignUpScreen.tsx

import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { registerUser } from '../../api/authApi';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();

  const selectedRole = 'customer';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

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
    if (!/^\d{10}$/.test(phone.trim()))
      return showToast('error', 'Invalid', 'Phone must be 10 digits'), false;
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>

          {apiError && (
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputCard}>
              <Icon name="person-outline" size={22} color="#AAAAAA" />
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="#AAAAAA"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputCard}>
              <Icon name="person-outline" size={22} color="#AAAAAA" />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#AAAAAA"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputCard}>
              <Icon name="email" size={22} color="#AAAAAA" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#AAAAAA"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputCard}>
              <Icon name="lock" size={22} color="#AAAAAA" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={{ padding: 8 }} onPress={() => setShowPassword(!showPassword)}>
                <Icon 
                  name={showPassword ? 'visibility' : 'visibility-off'} 
                  size={22} 
                  color="#AAAAAA" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputCard}>
              <Icon name="phone" size={22} color="#AAAAAA" />
              <TextInput
                style={styles.input}
                placeholder="Phone Number (10 digits)"
                placeholderTextColor="#AAAAAA"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
  content: { 
    flex: 1, 
    paddingHorizontal: 28, 
    paddingTop: 80, 
    paddingBottom: 40 
  },
  title: { 
    fontSize: 32, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginBottom: 40, 
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  form: { 
    marginBottom: 32 
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 58,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a1a1a1',
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#111111', 
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
  },
  button: {
    backgroundColor: '#111111',
    height: 58,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { 
    opacity: 0.7 
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontFamily: 'Poppins-SemiBold' 
  },
  loginLink: { 
    alignItems: 'center', 
    marginTop: 32 
  },
  loginText: { 
    fontSize: 15, 
    color: '#AAAAAA',
    fontFamily: 'Poppins-Regular',
  },
  loginHighlight: { 
    color: '#111111', 
    fontFamily: 'Poppins-SemiBold' 
  },
  apiErrorContainer: { 
    backgroundColor: '#F7F7F7', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 24,
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
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#969696',
  },
  modalTitle: { 
    fontSize: 24, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginTop: 20, 
    marginBottom: 8 
  },
  modalMessage: { 
    fontSize: 16, 
    color: '#111111', 
    textAlign: 'center', 
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  modalSubMessage: { 
    fontSize: 14, 
    color: '#AAAAAA', 
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});








// // src/features/auth/screens/SignUpScreen.tsx

// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   StatusBar,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   Modal,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import type { RouteProp, NativeStackNavigationProp } from '@react-navigation/native-stack';
// import Toast from 'react-native-toast-message';
// import { registerUser } from '../../api/authApi';

// type RootStackParamList = {
//   Onboarding: undefined;
//   Login: undefined;
//   SignUp: { role: string };
//   MainTabs: undefined;
//   Home: undefined;
// };

// type SignUpRouteProp = RouteProp<RootStackParamList, 'SignUp'>;
// type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// export default function SignUpScreen() {
//   const navigation = useNavigation<NavigationProp>();
//   const route = useRoute<SignUpRouteProp>();

//   const selectedRole = route.params?.role || 'customer';

//   console.log('[SignUpScreen] Selected role from onboarding:', selectedRole);

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [phone, setPhone] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [apiError, setApiError] = useState<string | null>(null);

//   // New: success modal control
//   const [successModalVisible, setSuccessModalVisible] = useState(false);

//   const showToast = (type: 'success' | 'error', title: string, msg: string) => {
//     Toast.show({
//       type,
//       text1: title,
//       text2: msg,
//       position: 'top',
//       visibilityTime: 3000,
//       topOffset: 60,
//     });
//   };

//   const validateForm = () => {
//     if (!firstName.trim()) return showToast('error', 'Required', 'First name is required'), false;
//     if (!lastName.trim()) return showToast('error', 'Required', 'Last name is required'), false;

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!email.trim() || !emailRegex.test(email.trim()))
//       return showToast('error', 'Invalid', 'Enter a valid email'), false;

//     if (!password.trim()) return showToast('error', 'Required', 'Password is required'), false;
//     if (password.length < 6) return showToast('error', 'Weak', 'Password min 6 chars'), false;

//     if (!/^\d{10}$/.test(phone.trim()))
//       return showToast('error', 'Invalid', 'Phone must be 10 digits'), false;

//     return true;
//   };

//   const handleSignUp = async () => {
//     setApiError(null);
//     if (!validateForm()) return;

//     setIsLoading(true);

//     try {
//       const payload = {
//       first_name: firstName.trim() || "TestFirst",     // ← force value for testing
// last_name: lastName.trim() || "TestLast",
//         email: email.trim().toLowerCase(),
//         password: password.trim(),
//         phone: phone.trim(),
//         // role: selectedRole,
//         role: selectedRole.toLowerCase(),
//       };

//       console.log('Signup payload (with role):', payload);

//       const response = await registerUser(payload);

//       console.log('Signup API success:', response);

//       // Show centered success modal instead of toast
//       setSuccessModalVisible(true);

//       // Auto hide after 2.5 seconds + navigate
//       setTimeout(() => {
//         setSuccessModalVisible(false);
//         navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
//       }, 2500);
//     } catch (err: any) {
//       console.log('Signup error:', err?.response?.data || err?.message || err);

//       let msg = 'Something went wrong.';

//       const data = err?.response?.data;
//       if (data?.email?.[0]) msg = data.email[0];
//       else if (data?.phone?.[0]) msg = data.phone[0];
//       else if (data?.role?.[0]) msg = data.role[0];
//       else if (data?.first_name?.[0]) msg = data.first_name[0];
//       else if (data?.last_name?.[0]) msg = data.last_name[0];
//       else if (data?.detail) msg = data.detail;
//       else if (data?.non_field_errors?.[0]) msg = data.non_field_errors[0];
//       else if (data?.message) msg = data.message;

//       if (msg.toLowerCase().includes('already') || msg.includes('exists'))
//         msg = 'Email already registered. Please login.';

//       setApiError(msg);
//       showToast('error', 'Error', msg);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#F4F5F7" />

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={{ flex: 1 }}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
//       >
//         <View style={styles.content}>
//           <Text style={styles.title}>Create Account</Text>

//           <Text style={{ color: '#666', marginBottom: 16, textAlign: 'center' }}>
//             Registering as:{' '}
//             <Text style={{ fontWeight: '600', color: '#B03385' }}>
//               {selectedRole === 'boutique'
//                 ? 'Boutique Owner'
//                 : selectedRole === 'manufacturer'
//                 ? 'Manufacturer'
//                 : 'Customer'}
//             </Text>
//           </Text>

//           {apiError && (
//             <View style={styles.apiErrorContainer}>
//               <Text style={styles.apiErrorText}>{apiError}</Text>
//             </View>
//           )}

//           <View style={styles.form}>
//             {/* ... all your input fields remain the same ... */}
//             <View style={styles.inputCard}>
//               <Icon name="person" size={22} color="#555" />
//               <TextInput
//                 style={styles.input}
//                 placeholder="First Name"
//                 placeholderTextColor="#999"
//                 value={firstName}
//                 onChangeText={setFirstName}
//                 autoCapitalize="words"
//               />
//             </View>

//             <View style={styles.inputCard}>
//               <Icon name="person" size={22} color="#555" />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Last Name"
//                 placeholderTextColor="#999"
//                 value={lastName}
//                 onChangeText={setLastName}
//                 autoCapitalize="words"
//               />
//             </View>

//             <View style={styles.inputCard}>
//               <Icon name="email" size={22} color="#555" />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Email"
//                 placeholderTextColor="#999"
//                 value={email}
//                 onChangeText={setEmail}
//                 keyboardType="email-address"
//                 autoCapitalize="none"
//                 autoCorrect={false}
//               />
//             </View>

              
//             <View style={styles.inputCard}>
//               <Icon name="lock" size={22} color="#555" />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Password"
//                 placeholderTextColor="#999"
//                 secureTextEntry={!showPassword}
//                 value={password}
//                 onChangeText={setPassword}
//                 autoCapitalize="none"
//               />
//               <TouchableOpacity style={{ padding: 8 }} onPress={() => setShowPassword(!showPassword)}>
//                 <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={22} color="#555" />
//               </TouchableOpacity>
//             </View>

//             <View style={styles.inputCard}>
//               <Icon name="phone" size={22} color="#555" />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Phone Number (10 digits)"
//                 placeholderTextColor="#999"
//                 keyboardType="phone-pad"
//                 maxLength={10}
//                 value={phone}
//                 onChangeText={setPhone}
//               />
//             </View>
//           </View>

//           <TouchableOpacity
//             style={[styles.button, isLoading && styles.buttonDisabled]}
//             onPress={handleSignUp}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <ActivityIndicator color="#fff" size="small" />
//             ) : (
//               <Text style={styles.buttonText}>Sign Up</Text>
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.loginLink}
//             onPress={() => navigation.navigate('Login')}
//           >
//             <Text style={styles.loginText}>
//               Already have an account? <Text style={styles.loginHighlight}>Login</Text>
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>

//       {/* Success Modal */}
//       <Modal
//         visible={successModalVisible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setSuccessModalVisible(false)}
//       >
//         <View style={modalStyles.modalOverlay}>
//           <View style={modalStyles.modalContent}>
//             <Icon name="check-circle" size={80} color="#4CAF50" />
//             <Text style={modalStyles.modalTitle}>Success!</Text>
//             <Text style={modalStyles.modalMessage}>
//               Account created successfully
//             </Text>
//             <Text style={modalStyles.modalSubMessage}>
//               Redirecting to login...
//             </Text>
//           </View>
//         </View>
//       </Modal>

//       <Toast />
//     </SafeAreaView>
//   );
// }

// // ────────────────────────────────────────────────
// // Existing styles (unchanged)
// // ────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F4F5F7' },
//   content: { flex: 1, paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40 },
//   title: { fontSize: 36, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 40, textAlign: 'center' },
//   form: { marginBottom: 32 },
//   inputCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     paddingHorizontal: 16,
//     height: 58,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: '#E0E7FF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   input: { flex: 1, fontSize: 16, color: '#333', marginLeft: 12 },
//   button: {
//     backgroundColor: '#B03385',
//     height: 58,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   buttonDisabled: { opacity: 0.6 },
//   buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
//   loginLink: { alignItems: 'center', marginTop: 24 },
//   loginText: { fontSize: 15, color: '#555' },
//   loginHighlight: { color: '#B03385', fontWeight: '600' },
//   apiErrorContainer: {
//     backgroundColor: '#FEE2E2',
//     padding: 12,
//     borderRadius: 12,
//     marginBottom: 20,
//   },
//   apiErrorText: { color: '#B91C1C', textAlign: 'center' },
// });

// // New modal styles
// const modalStyles = StyleSheet.create({
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 32,
//     alignItems: 'center',
//     width: '80%',
//     maxWidth: 320,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 0.25,
//     shadowRadius: 16,
//     elevation: 10,
//   },
//   modalTitle: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     color: '#1A1A1A',
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   modalMessage: {
//     fontSize: 16,
//     color: '#4B5563',
//     textAlign: 'center',
//     marginBottom: 4,
//   },
//   modalSubMessage: {
//     fontSize: 14,
//     color: '#9CA3AF',
//     textAlign: 'center',
//   },
// });