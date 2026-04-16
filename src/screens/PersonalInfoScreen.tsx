// src/features/auth/screens/PersonalInfoScreen.tsx
// Redesigned for clean black & white modern e-commerce UI

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
  Image,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/env';

const { height } = Dimensions.get('window');

// ─── API helpers ──────────────────────────────────────────────────────────────

async function uploadProfilePicture(token: string, uri: string, type: string, name: string) {
  const formData = new FormData();
  formData.append('profile_picture', {
    uri,
    type,
    name,
  } as any);

  const response = await fetch(`${BASE_URL}/api/auth/me/profile-picture/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const rawText = await response.text();

  if (!response.ok) {
    let parsed: any = {};
    try { parsed = JSON.parse(rawText); } catch {}
    const error: any = new Error(`Upload failed with status ${response.status}`);
    error.response = { status: response.status, data: parsed };
    throw error;
  }

  let data: any = {};
  try { data = JSON.parse(rawText); } catch {}
  return data;
}

async function deleteProfilePicture(token: string) {
  const res = await axios.delete(`${BASE_URL}/api/auth/me/profile-picture`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Photo Action Sheet ───────────────────────────────────────────────────────

interface PhotoSheetProps {
  visible: boolean;
  hasPhoto: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const PhotoActionSheet: React.FC<PhotoSheetProps> = ({
  visible,
  hasPhoto,
  onCamera,
  onGallery,
  onRemove,
  onClose,
}) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={sheetStyles.container}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>Change Profile Photo</Text>

        <TouchableOpacity style={sheetStyles.option} onPress={onGallery}>
          <Icon name="image-outline" size={24} color="#111111" />
          <Text style={sheetStyles.optionText}>Choose from Gallery</Text>
        </TouchableOpacity>

        {hasPhoto && (
          <TouchableOpacity 
            style={[sheetStyles.option, { borderBottomWidth: 0 }]} 
            onPress={onRemove}
          >
            <Icon name="trash-can-outline" size={24} color="#ef4444" />
            <Text style={[sheetStyles.optionText, { color: '#ef4444' }]}>Remove Photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
          <Text style={sheetStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    color: '#111111',
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  optionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#111111',
    marginLeft: 16,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
  },
  cancelText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#AAAAAA',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PersonalInfoScreen({ navigation }: any) {
  const { token, user, setUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'incomplete'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const slideAnim = useRef(new Animated.Value(height)).current;

  // Fetch profile
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
        setAvatarUrl(data.profile_picture || data.avatar || null);
      } catch (err) {
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
      setTimeout(() => hideModal(() => navigation.goBack()), 1600);
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
      await axios.put(
        `${BASE_URL}/api/auth/profile/`,
        { first_name: firstName.trim(), last_name: lastName.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (setUser && user) {
        setUser({ ...user, first_name: firstName.trim(), last_name: lastName.trim() });
      }
      showModal('success', 'Profile updated successfully!');
    } catch (err: any) {
      const errorText =
        err?.response?.data?.detail ||
        err?.response?.data?.first_name?.[0] ||
        err?.response?.data?.last_name?.[0] ||
        'Failed to update profile. Please try again.';
      showModal('error', errorText);
    } finally {
      setSaving(false);
    }
  };

  const handleGallery = () => {
    setPhotoSheetVisible(false);
    setTimeout(() => {
      launchImageLibrary({ mediaType: 'photo', quality: 0.85, selectionLimit: 1 }, (res) => {
        if (res.didCancel || res.errorCode || !res.assets?.[0]?.uri) return;
        const asset = res.assets[0];
        processUpload(asset.uri, asset.type ?? 'image/jpeg', asset.fileName ?? 'photo.jpg');
      });
    }, 300);
  };

  const handleCamera = () => {
    // Camera option is commented out in original – keeping consistent
    setPhotoSheetVisible(false);
  };

  const processUpload = async (uri: string, type: string, name: string) => {
    if (!token) {
      Alert.alert('Error', 'Authentication token missing. Please login again.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const updated = await uploadProfilePicture(token, uri, type, name);
      const newUrl = updated?.profile_picture || updated?.avatar || uri;
      setAvatarUrl(newUrl);
      if (setUser && user) setUser({ ...user, profile_picture: newUrl });
      Alert.alert('Success', 'Profile photo updated!');
    } catch (err: any) {
      const friendlyMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.profile_picture?.[0] ||
        err?.message ||
        'Failed to upload photo. Please try again.';
      Alert.alert('Upload Failed', friendlyMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoSheetVisible(false);
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!token) {
            Alert.alert('Error', 'Authentication token missing.');
            return;
          }
          setUploadingPhoto(true);
          try {
            await deleteProfilePicture(token);
            setAvatarUrl(null);
            if (setUser && user) setUser({ ...user, profile_picture: null, avatar: null });
          } catch (err: any) {
            const friendlyMsg = err?.response?.data?.detail || err?.message || 'Failed to remove photo.';
            Alert.alert('Remove Failed', friendlyMsg);
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setPhotoSheetVisible(true)}
            activeOpacity={0.9}
            disabled={uploadingPhoto}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="account-outline" size={52} color="#AAAAAA" />
              </View>
            )}

            <View style={styles.cameraBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="camera-outline" size={18} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.avatarHint}>
            {avatarUrl ? 'Tap to change photo' : 'Tap to add profile photo'}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <Text style={styles.label}>First Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={22} color="#AAAAAA" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Last Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={22} color="#AAAAAA" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputContainer, styles.disabledInput]}>
            <Icon name="email-outline" size={22} color="#AAAAAA" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: '#AAAAAA' }]}
              value={email}
              editable={false}
            />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputContainer, styles.disabledInput]}>
            <Icon name="phone-outline" size={22} color="#AAAAAA" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: '#AAAAAA' }]}
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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PhotoActionSheet
        visible={photoSheetVisible}
        hasPhoto={!!avatarUrl}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onRemove={handleRemovePhoto}
        onClose={() => setPhotoSheetVisible(false)}
      />

      {/* Status Modal */}
      <Modal transparent visible={modalVisible} animationType="none">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => hideModal()}
        >
          <Animated.View
            style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}
          >
            {modalType === 'success' && (
              <Icon name="check-circle-outline" size={68} color="#111111" style={styles.modalIcon} />
            )}
            {modalType === 'error' && (
              <Icon name="alert-circle-outline" size={68} color="#ef4444" style={styles.modalIcon} />
            )}
            {modalType === 'incomplete' && (
              <Icon name="alert-circle-outline" size={68} color="#f59e0b" style={styles.modalIcon} />
            )}

            <Text style={styles.modalTitle}>
              {modalType === 'success' ? 'Success' : modalType === 'error' ? 'Error' : 'Required'}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <TouchableOpacity
              style={styles.modalButton}
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111111',
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 16, 
    fontFamily: 'Poppins-Regular',
    fontSize: 16, 
    color: '#AAAAAA' 
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 60 
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    position: 'relative',
    marginBottom: 12,
    backgroundColor: '#F7F7F7',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#111111',
    borderRadius: 14,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13.5,
    color: '#AAAAAA',
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#111111',
    marginBottom: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    color: '#111111',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 18,
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, 
    fontFamily: 'Poppins-Regular',
    fontSize: 16, 
    color: '#111111' 
  },
  disabledInput: { 
    backgroundColor: '#F7F7F7', 
    borderColor: '#E8E8E8' 
  },
  saveButton: {
    backgroundColor: '#111111',
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '86%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalIcon: { marginBottom: 20 },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 22,
    color: '#111111',
    marginBottom: 12,
  },
  modalMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15.5,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 8,
    minWidth: '70%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});