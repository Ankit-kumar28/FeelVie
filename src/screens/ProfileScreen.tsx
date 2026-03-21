// src/screens/ProfileScreen.tsx
import React, { useState, useMemo } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const { user, logout, token, isLoading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [loggingOut, setLoggingOut] = useState(false);

  const MAIN_COLOR = '#B03385';

  // Simple seed for random avatar (based on user id/email or random)
  const avatarSeed = useMemo(() => {
    if (!user) return 'anonymous';
    return user.username || 'user' + Math.floor(Math.random() * 10000);
  }, [user]);

  const randomAvatarUrl = `https://api.dicebear.com/9.x/avataaars/png?seed=${avatarSeed}&backgroundColor=b6e3f4`;

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingBottom: 65 }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token || !user) {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    return null;
  }

  const fullName =
    user?.name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'User';

  const displayEmail = user?.email || 'Not added yet';
  const displayPhone = user?.phone && user.phone.trim() && user.phone !== 'string' ? user.phone : 'Not added yet';
  const isVerified = user?.is_verified === true;
  const avatarUrl = user?.avatar || user?.profile_picture || null;

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
            } catch (err) {
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('PersonalInfoScreen')}
          >
            <Icon name="pencil" size={20} color={MAIN_COLOR} />
          </TouchableOpacity>

          <View style={styles.profileContent}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Image source={{ uri: randomAvatarUrl }} style={styles.avatar} />
              )}
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{fullName}</Text>

              <View style={styles.infoRow}>
                <Icon name="email-outline" size={18} color="#666" />
                <Text style={styles.infoText}>{displayEmail}</Text>
                {isVerified && <Icon name="check-decagram" size={16} color={MAIN_COLOR} style={styles.verifiedIcon} />}
              </View>

              <View style={styles.infoRow}>
                <Icon name="phone-outline" size={18} color="#666" />
                <Text style={styles.infoText}>{displayPhone}</Text>
                {isVerified && <Icon name="check-decagram" size={16} color={MAIN_COLOR} style={styles.verifiedIcon} />}
              </View>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.sectionsContainer}>
          {/* SELL & LISTINGS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sell & Listings</Text>
            <MenuItem
              icon="tag-outline"
              title="Sell / Rent Product"
              onPress={() => navigation.navigate('SellProduct')}
            />
            <MenuItem
              icon="package"
              title="My Listings"
              onPress={() => navigation.navigate('MyListings')}
            />
          </View>

          {/* ORDERS & WISHLIST */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Orders & Wishlist</Text>
            <MenuItem
              icon="heart-outline"
              title="My Wishlist"
              onPress={() => navigation.navigate('MyWishList')}
            />
            <MenuItem
              icon="package-variant"
              title="My Orders"
              onPress={() => navigation.navigate('MyOrders')}
            />
          </View>

          {/* PAYMENT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <MenuItem
              icon="credit-card-outline"
              title="Payment Methods"
              onPress={() => navigation.navigate('PaymentInfoScreen')}
            />
            <MenuItem
              icon="wallet-outline"
              title="Wallet & Coins"
             
                onPress={() => navigation.navigate('WalletScreen')
                // Alert.alert('Coming Soon', 'Wallet feature is under development.');
              }
            />
          </View>

          {/* ADDRESS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <MenuItem
              icon="map-marker-outline"
              title="My Addresses"
              onPress={() => navigation.navigate('AddressScreen')}
            />
          </View>

          {/* HELP & SUPPORT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help & Support</Text>
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
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <Icon name="logout" size={22} color="#ef4444" />
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

const MenuItem = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuLeft}>
      <Icon name={icon} size={24} color="#B03385" />
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Icon name="chevron-right" size={22} color="#9ca3af" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9fa' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 50, android: 40 }),
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#B03385' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: .5,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#f9e8f2',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileContent: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginRight: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#f0e4ea' },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 15, color: '#444', marginLeft: 8, flex: 1 },
  verifiedIcon: { marginLeft: 6 },

  sectionsContainer: {
    marginHorizontal: 8,
    marginBottom: 24,
    // backgroundColor: '#ffffff',
    // borderRadius: 12,
    // overflow: 'hidden',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 6,
    // // elevation: 3,
  },
  section: {
    // borderBottomWidth: 1,
    // borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000b8',
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fafafa',
  },
  menuItem: {
    flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 15,
  paddingHorizontal: 20,
  backgroundColor: '#ffffff',           // ← added
  borderRadius: 8,  
  borderLeftColor:"#050505",                   // ← added rounded corners
  marginHorizontal: 8,                 // ← added spacing from sides
  marginVertical: 4,                    // ← space between items
  // elevation: .5,                         // subtle shadow (Android)
  // shadowColor: '#000',                  // iOS shadow
  // shadowOffset: { width: 0, height: 1 },
  // shadowOpacity: 0.08,
  // shadowRadius: 4,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1,borderRadius:12, },
  menuText: { fontSize: 16, color: '#111', marginLeft: 16, fontWeight: '500' },

  logoutContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 140,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutDisabled: { opacity: 0.6 },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 12,
  },
});