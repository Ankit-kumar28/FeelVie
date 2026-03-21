import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { height } = Dimensions.get('window');
const BASE_URL = 'https://mktp-backend.onrender.com';

export default function PersonalInfoScreen({ navigation }) {
  const { token } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'incomplete'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        showModal('error', 'Please login again');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await axios.get(`${BASE_URL}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;

        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');

      } catch (err) {
        console.error('Failed to fetch profile:', err?.response?.data || err?.message);
        showModal('error', 'Could not load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const showModal = (type: 'success' | 'error' | 'incomplete', message: string) => {
    setModalType(type);
    setModalMessage(message);
    setModalVisible(true);

    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    if (type === 'success') {
      setTimeout(() => {
        hideModal(() => navigation.goBack());
      }, 1600);
    }
  };

  const hideModal = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      callback?.();
    });
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showModal('incomplete', 'First name and last name are required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };

      await axios.put(`${BASE_URL}/api/auth/profile/`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      showModal('success', 'Profile updated successfully!');
    } catch (err: any) {
      let errorText =
        err?.response?.data?.detail ||
        err?.response?.data?.first_name?.[0] ||
        err?.response?.data?.last_name?.[0] ||
        'Failed to update profile. Please try again.';

      console.error('Profile update failed:', err?.response?.data || err);
      showModal('error', errorText);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B03385" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Personal Info</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Only helpful guidance message */}
        {/* {(!firstName.trim() || !lastName.trim()) && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Please add your full name to continue
            </Text>
          </View>
        )} */}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.label}>First Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={20} color="#555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#aaa"
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Last Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={20} color="#555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#aaa"
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputContainer, styles.disabledInput]}>
            <Icon name="email-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: '#9ca3af' }]}
              value={email}
              editable={false}
            />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputContainer, styles.disabledInput]}>
            <Icon name="phone-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: '#9ca3af' }]}
              value={phone}
              editable={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {firstName.trim() && lastName.trim() ? 'Save Changes' : 'Save Changes'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal – now the only place errors are shown */}
      <Modal transparent visible={modalVisible} animationType="none">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => hideModal()}
        >
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {modalType === 'success' && (
              <>
                <Icon name="check-circle" size={64} color="#16a34a" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>Success</Text>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
              </>
            )}

            {modalType === 'error' && (
              <>
                <Icon name="alert-circle" size={64} color="#ef4444" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>Error</Text>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
              </>
            )}

            {modalType === 'incomplete' && (
              <>
                <Icon name="alert-circle-outline" size={64} color="#f59e0b" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>Required</Text>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.modalButton,
                modalType === 'success' && styles.modalButtonSuccess,
                modalType === 'error' && styles.modalButtonError,
                modalType === 'incomplete' && styles.modalButtonWarning,
              ]}
              onPress={() => hideModal()}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Styles remain almost same – only removed errorBanner & errorText
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 12,
    // paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#555' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Only this banner remains
  infoBanner: {
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    color: '#92400e',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderColor: '#e8e8e8',
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // elevation: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 6,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },

  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },

  disabledInput: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },

  saveButton: {
    backgroundColor: '#B03385',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.6 },

  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal styles (unchanged)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '84%',
    alignItems: 'center',
  },
  modalIcon: { marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  modalMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 16,
    minWidth: '70%',
    alignItems: 'center',
  },
  modalButtonSuccess: { backgroundColor: '#16a34a' },
  modalButtonError: { backgroundColor: '#ef4444' },
  modalButtonWarning: { backgroundColor: '#f59e0b' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});