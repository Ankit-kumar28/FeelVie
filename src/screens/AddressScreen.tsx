import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Address = {
  id: number;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export default function AddressScreen({ navigation }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const insets = useSafeAreaInsets();

  const fabScale = new Animated.Value(1);

  const animateFab = () => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(fabScale, { toValue: 1.08, friction: 4, useNativeDriver: true }),
        Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ])
    ).start();
  };

  useEffect(() => {
    fetchAddresses();
    animateFab();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('https://feelvie.yaytech.in/api/auth/addresses/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data: Address[] = await response.json();
      const sorted = data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAddresses(sorted);
    } catch (err) {
      console.error('Fetch addresses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const recentAddress = addresses[0];

  const handleAddNew = () => {
    navigation.navigate('EditAddress');
  };

  const handleEdit = () => {
    if (recentAddress) {
      navigation.navigate('EditAddress', { address: recentAddress });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Address</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#B4338A" />
            <Text style={styles.loadingText}>Loading address...</Text>
          </View>
        ) : recentAddress ? (
          <View style={styles.addressCard}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconCircle}>
                  <Icon name="map-marker-outline" size={28} color="#ffffff" />
                </View>
                <Text style={styles.cardTitle}>
                  {recentAddress.is_default ? 'Delivery Address' : 'Delivery Address'}
                </Text>
              </View>

              <TouchableOpacity onPress={handleEdit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="pencil" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Divider line after title */}
            <View style={styles.divider} />

            <Text style={styles.nameText}>{recentAddress.name}</Text>
            <Text style={styles.phoneText}>+91 {recentAddress.phone}</Text>

            <View style={styles.addressLine}>
              <Icon name="map-marker" size={16} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={styles.addressText}>
                {recentAddress.line1}
                {recentAddress.line2 ? `, ${recentAddress.line2}` : ''}
              </Text>
            </View>

            <Text style={styles.cityText}>
              {recentAddress.city}, {recentAddress.state} - {recentAddress.postal_code}
            </Text>

            <Text style={styles.countryText}>{recentAddress.country}</Text>

            {recentAddress.is_default && (
              <View style={styles.activeLabelContainer}>
                <Text style={styles.activeLabel}>ACTIVE</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="map-marker-radius" size={90} color="#e5e7eb" />
            <Text style={styles.emptyTitle}>No Address Added</Text>
            <Text style={styles.emptySubtitle}>
              Add your delivery address for faster checkout
            </Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddNew}>
              <Text style={styles.addFirstButtonText}>+ Add New Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {addresses.length > 0 && !loading && (
        <Animated.View
          style={[
            styles.fab,
            { transform: [{ scale: fabScale }] },
          ]}
        >
          <TouchableOpacity activeOpacity={0.85} onPress={handleAddNew}>
            <Icon name="plus" size={32} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B03385',
  },

  scrollContent: {
    padding: 0,           // ← yaha se margin zero kiya
    paddingBottom: 120,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 160,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6b7280',
  },

  // Card ab full width → no horizontal margin
  addressCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#d9dbde',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    // elevation: 3,
    borderRadius: 12,
    marginHorizontal: 8,   // ← horizontal margin removed
    marginVertical: 12,
  
    position: 'relative',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 21,
    backgroundColor: '#8b326d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1f2937',
  },

  // ← Naya divider line title ke niche
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 20,
  },

  nameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  phoneText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 16,
  },

  addressLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  addressText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    flex: 1,
  },
  cityText: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
  },
  countryText: {
    fontSize: 14,
    color: '#6b7280',
  },

  activeLabelContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 140,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  addFirstButton: {
    marginTop: 36,
    backgroundColor: '#B4338A',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  addFirstButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#B4338A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B4338A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
});