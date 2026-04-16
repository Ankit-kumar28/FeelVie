// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../config/env';

// ─── MenuItem ─────────────────────────────────────────────────────────────────

const MenuItem = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuLeft}>
      <Icon name={icon} size={24} color="#111111" />
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Icon name="chevron-right" size={22} color="#AAAAAA" />
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, token, isLoading: authLoading, setUser } = useAuth();
  const navigation = useNavigation<any>();
  const [loggingOut, setLoggingOut] = useState(false);

  // ── Fresh profile data fetched from API (not stale context) ──
  const [profileData, setProfileData] = useState<any>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);

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
      ? data.phone
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 26 }} />
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
                  <Icon name="account-outline" size={44} color="#AAAAAA" />
                </View>
              )}
              {/* Camera badge — visual cue that photo is editable */}
              <View style={styles.cameraBadge}>
                <Icon name="camera-plus-outline" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{fullName}</Text>

              <View style={styles.infoRow}>
                <Icon name="email-outline" size={18} color="#AAAAAA" />
                <Text style={styles.infoText}>{displayEmail}</Text>
                {isVerified && (
                  <Icon name="check-decagram" size={16} color="#111111" style={styles.verifiedIcon} />
                )}
              </View>

              <View style={styles.infoRow}>
                <Icon name="phone-outline" size={18} color="#AAAAAA" />
                <Text style={styles.infoText}>{displayPhone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.sectionsContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT</Text>
            <MenuItem icon="wallet-outline" title="Wallet & Coins" onPress={() => navigation.navigate('WalletScreen')} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDRESS</Text>
            <MenuItem icon="map-marker-outline" title="My Addresses" onPress={() => {}} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>
            <MenuItem
              icon="headphones"
              title="Help & Support"
              onPress={() => navigation.navigate('HelpSupport')}
            />
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
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <>
                <Icon name="logout" size={22} color="#111111" />
                <Text style={styles.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 50, android: 40 }),
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: { 
    padding: 8 
  },
  headerTitle: { 
    fontSize: 20, 
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
    marginTop: 12, 
    fontSize: 16, 
    color: '#AAAAAA',
    fontFamily: 'Poppins-Regular',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  /* Profile Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },

  avatarWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    position: 'relative',
    marginRight: 20,
    backgroundColor: '#F7F7F7',
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F7F7F7',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#111111',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  userInfo: { flex: 1 },
  userName: { 
    fontSize: 22, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginBottom: 10 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  infoText: { 
    fontSize: 15, 
    color: '#111111', 
    marginLeft: 10, 
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
  verifiedIcon: { 
    marginLeft: 6 
  },

  /* Menu Sections */
  sectionsContainer: { 
    marginHorizontal: 16 
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    paddingHorizontal: 4,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  menuLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  menuText: { 
    fontSize: 16, 
    color: '#111111', 
    marginLeft: 18,
    fontFamily: 'Poppins-Regular',
  },

  /* Logout */
  logoutContainer: { 
    marginHorizontal: 16, 
    marginTop: 40, 
    marginBottom: 100 
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    paddingVertical: 17,
    borderRadius: 8,
  },
  logoutDisabled: { 
    opacity: 0.7 
  },
  logoutText: { 
    fontSize: 16, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#FFFFFF', 
    marginLeft: 12 
  },
});