// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
  useWindowDimensions,
  Modal,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../config/env';
import DeviceInfo from 'react-native-device-info';
import Share from 'react-native-share';
import ViewShot, { captureRef } from 'react-native-view-shot';

// Responsive scaling utility
const scale = (size: number, baseWidth: number = 375) => {
  const { width } = Dimensions.get('window');
  return (width / baseWidth) * size;
};

// ─── MenuItem ─────────────────────────────────────────────────────────────────

const MenuItem = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuLeft}>
      <View style={styles.menuIconBox}>
        <Icon name={icon} size={scale(20)} color="#111111" />
      </View>
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Icon name="chevron-right" size={scale(20)} color="#AAAAAA" />
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { user, logout, token, isLoading: authLoading, setUser } = useAuth();
  const navigation = useNavigation<any>();
  const [loggingOut, setLoggingOut] = useState(false);
  const qrShotRef = useRef<ViewShot | null>(null);

  // ── Fresh profile data fetched from API (not stale context) ──
  const [profileData, setProfileData] = useState<any>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('Share App QR Code');
  const [qrLoading, setQrLoading] = useState(false);

  // ── Fetch on mount AND every time the screen comes back into focus ──
  useFocusEffect(
    React.useCallback(() => {
      if (!token) {
        setFetchingProfile(false);
        return;
      }

      let cancelled = false;

      const fetchProfile = async () => {
        try {
          setFetchingProfile(true);
          const response = await axios.get(`${BASE_URL}/api/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!cancelled) {
            const data = response.data;
            setProfileData(data);
            // Keep auth context in sync so other screens stay fresh too
            if (setUser && user) {
              setUser({
                ...user,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                profile_picture: data.profile_picture || data.avatar || null,
                avatar: data.profile_picture || data.avatar || null,
              });
            }
          }
        } catch (err) {
          console.error('[ProfileScreen] fetchProfile error:', err);
          // Fall back to whatever is in auth context — don't wipe profileData
        } finally {
          if (!cancelled) setFetchingProfile(false);
        }
      };

      fetchProfile();

      return () => {
        cancelled = true; // cleanup if screen leaves focus before fetch finishes
      };
    }, [token])
  );

  if (authLoading || fetchingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token || !user) {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    return null;
  }

  // Prefer freshly fetched data; fall back to auth context
  const data = profileData || user;

  const fullName =
    `${data?.first_name || ''} ${data?.last_name || ''}`.trim() ||
    data?.name ||
    data?.username ||
    data?.email?.split('@')[0] ||
    'User';

  const displayEmail = data?.email || 'Not added yet';
  const displayPhone =
    data?.phone && data.phone.trim() && data.phone !== 'string'
      ? `+91 ${data.phone.replace(/^\+?91\s?/, '')}`
      : 'Not added yet';
  const isVerified = data?.is_verified === true;

  const avatarUrl: string | null =
    profileData?.profile_picture ||
    profileData?.avatar ||
    user?.profile_picture ||
    user?.avatar ||
    null;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch {
              Alert.alert('Error', 'Logout failed. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };


  const generateQRCode = async () => {
    try {
      setQrLoading(true);
      const response = await axios.get(`${BASE_URL}/api/common/version/?platform=${Platform.OS}`);
      const url = response.data?.url;

      if (!url) {
        Alert.alert('Error', 'No share URL was returned by the server.');
        return;
      }

      setQrUrl(url);
      setQrTitle(response.data?.message || 'Share App QR Code');
      setQrVisible(true);
    } catch (error) {
      console.error('[ProfileScreen] generateQRCode error:', error);
      Alert.alert('Error', 'Could not load the share link. Please try again.');
    } finally {
      setQrLoading(false);
    }
  };

  const shareQRCode = async () => {
    try {
      if (!qrShotRef.current) {
        Alert.alert('Error', 'QR code is not ready yet.');
        return;
      }

      const capturedUri = await captureRef(qrShotRef, {
        format: 'png',
        quality: 1,
      });

      await Share.open({
        url: capturedUri.startsWith('file://') ? capturedUri : `file://${capturedUri}`,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error) {
      console.error('[ProfileScreen] shareQRCode error:', error);
      Alert.alert('Error', 'Could not open share options.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={scale(26)} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: scale(26) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Edit personal info — navigates to PersonalInfoScreen where photo management lives */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('PersonalInfoScreen')}
          >
            <Icon name="pencil-outline" size={20} color="#111111" />
          </TouchableOpacity>

          <View style={styles.profileContent}>
            {/* Avatar — tapping navigates to PersonalInfoScreen to update/remove */}
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => navigation.navigate('PersonalInfoScreen')}
              activeOpacity={0.85}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  key={avatarUrl}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="account-outline" size={scale(44)} color="#AAAAAA" />
                </View>
              )}
              {/* Camera badge — visual cue that photo is editable */}
              <View style={styles.cameraBadge}>
                <Icon name="camera-plus-outline" size={scale(14)} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{fullName}</Text>

              <View style={styles.infoRow}>
                <Icon name="email-outline" size={scale(16)} color="#AAAAAA" />
                <Text style={styles.infoText}>{displayEmail}</Text>
                {isVerified && (
                  <Icon name="check-decagram" size={scale(14)} color="#2ECC71" style={styles.verifiedIcon} />
                )}
              </View>

              <View style={styles.infoRow}>
                <Icon name="phone-outline" size={scale(16)} color="#AAAAAA" />
                <Text style={styles.infoText}>{displayPhone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileDivider} />

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('PersonalInfoScreen')}
          >
            <Icon name="account-edit-outline" size={scale(18)} color="#111111" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
            <Icon name="chevron-right" size={scale(20)} color="#AAAAAA" />
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        <View style={styles.sectionsContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT</Text>
            <View style={styles.menuGroupCard}>
              <MenuItem icon="wallet-outline" title="Wallet & Coins" onPress={() => navigation.navigate('WalletScreen')} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            <View style={styles.menuGroupCard}>
              <MenuItem icon="history" title="Try On History" onPress={() => { navigation.navigate('VirtualTryOnHistory') }} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share</Text>
            <View style={styles.menuGroupCard}>
              <MenuItem icon="share-outline" title="Share App QR Code" onPress={() => generateQRCode() } />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>
            <View style={styles.menuGroupCard}>
              <MenuItem
                icon="headphones"
                title="Help & Support"
                onPress={() => navigation.navigate('HelpSupport')}
              />
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[styles.logoutButton, loggingOut && styles.logoutDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="logout" size={scale(20)} color="#FFFFFF" />
                <Text style={styles.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', fontSize: scale(12), color: '#AAAAAA', marginBottom: scale(80) }}>
          Version {DeviceInfo.getVersion()}
        </Text>

        <View style={{ height: scale(80) }} />
      </ScrollView>

      <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>{qrTitle}</Text>
              <TouchableOpacity onPress={() => setQrVisible(false)}>
                <Icon name="close" size={scale(22)} color="#111111" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrInfoBox}>
              <Text style={styles.qrInfoLabel}>{Platform.OS === 'ios' ? 'iOS' : 'Android'} App URL</Text>
              <Text style={styles.qrInfoUrl} numberOfLines={2}>{qrUrl}</Text>
            </View>

            <ViewShot ref={qrShotRef} style={styles.qrShot} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
              <View style={styles.qrCodeCard}>
                <View style={styles.qrCodeInner}>
                  {qrLoading ? (
                    <ActivityIndicator size="large" color="#111111" />
                  ) : (
                    <Image
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrUrl)}` }}
                      style={styles.qrImage}
                    />
                  )}
                </View>
              </View>
            </ViewShot>

            <View style={styles.qrActions}>
              <TouchableOpacity
                style={[styles.qrActionButton, styles.qrSecondaryButton]}
                onPress={() => Linking.openURL(qrUrl)}
              >
                <Text style={styles.qrSecondaryButtonText}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.qrActionButton, styles.qrPrimaryButton]} onPress={shareQRCode}>
                <Text style={styles.qrPrimaryButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: '6.4%',
    paddingBottom: scale(16),
    paddingTop: scale(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: scale(8),
    marginLeft: -scale(8),
  },
  headerTitle: {
    fontSize: scale(20),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    letterSpacing: -0.3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(16),
    color: '#AAAAAA',
    fontFamily: 'Poppins-Regular',
  },

  scrollContent: {
    paddingBottom: scale(40),
  },

  /* Profile Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: '6.4%',
    marginTop: scale(20),
    marginBottom: scale(20),
    borderRadius: scale(12),
    paddingVertical: scale(0),
    paddingHorizontal: scale(0),
    borderWidth: 0.8,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  profileDivider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
  },
  editButton: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderRadius: scale(10),
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    display: 'none',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(8),
  },

  avatarWrapper: {
    width: scale(92),
    height: scale(92),
    borderRadius: scale(46),
    position: 'relative',
    marginRight: scale(20),
    backgroundColor: '#F7F7F7',
  },
  avatarImage: {
    width: scale(92),
    height: scale(92),
    borderRadius: scale(46),
    borderWidth: 3,
    borderColor: '#F9F9F9',
  },
  avatarPlaceholder: {
    width: scale(92),
    height: scale(92),
    borderRadius: scale(46),
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    backgroundColor: '#111111',
    borderRadius: scale(10),
    width: scale(24),
    height: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  userInfo: { flex: 1, paddingLeft: scale(8) },
  userName: {
    fontSize: scale(18),
    fontFamily: 'Poppins-Bold',
    color: '#111111',
    marginBottom: scale(8),
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6)
  },
  infoText: {
    fontSize: scale(13),
    color: '#555555',
    marginLeft: scale(8),
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontWeight: '500',
  },
  verifiedIcon: {
    marginLeft: scale(6)
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    justifyContent: 'space-between',
  },
  editProfileText: {
    fontSize: scale(15),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginLeft: scale(10),
    flex: 1,
    fontWeight: '600',
  },

  /* Menu Sections */
  sectionsContainer: {
    marginHorizontal: '6.4%'
  },
  section: {
    marginBottom: scale(18),
  },
  sectionTitle: {
    fontSize: scale(10),
    fontFamily: 'Poppins-Bold',
    color: '#BBBBBB',
    paddingHorizontal: scale(8),
    paddingVertical: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(6),
    paddingHorizontal: scale(8),
    borderBottomWidth: 0.5,
    borderBottomColor: '#F5F5F5',
  },
  menuGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(10),
    borderWidth: 0.8,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  menuIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    marginRight: scale(2),
  },
  menuText: {
    fontSize: scale(14),
    color: '#222222',
    marginLeft: scale(8),
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    flex: 1,
  },

  /* Logout */
  logoutContainer: {
    marginHorizontal: '6.4%',
    marginTop: scale(32),
    marginBottom: scale(30)
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  logoutDisabled: {
    opacity: 0.7
  },
  logoutText: {
    fontSize: scale(15),
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginLeft: scale(8),
    fontWeight: '700',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(18),
  },
  qrModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(18),
    padding: scale(18),
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(14),
  },
  qrModalTitle: {
    flex: 1,
    fontSize: scale(18),
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginRight: scale(12),
  },
  qrInfoBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(16),
  },
  qrInfoLabel: {
    fontSize: scale(11),
    fontFamily: 'Poppins-SemiBold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: scale(6),
  },
  qrInfoUrl: {
    fontSize: scale(13),
    fontFamily: 'Poppins-Regular',
    color: '#111111',
    lineHeight: scale(20),
  },
  qrShot: {
    alignSelf: 'center',
    marginBottom: scale(18),
  },
  qrCodeCard: {
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  qrCodeInner: {
    width: scale(260),
    height: scale(260),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  qrActionButton: {
    flex: 1,
    paddingVertical: scale(13),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  qrPrimaryButton: {
    backgroundColor: '#111111',
  },
  qrSecondaryButton: {
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  qrPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: scale(14),
    fontFamily: 'Poppins-SemiBold',
  },
  qrSecondaryButtonText: {
    color: '#111111',
    fontSize: scale(14),
    fontFamily: 'Poppins-SemiBold',
  },
});