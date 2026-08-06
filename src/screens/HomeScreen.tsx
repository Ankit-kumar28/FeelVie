// src/screens/HomeScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePicker from 'react-native-image-crop-picker';
import Toast from 'react-native-toast-message';
import Carousel from 'react-native-banner-carousel';
import DeviceInfo from 'react-native-device-info';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BannerWidth = SCREEN_WIDTH - 24; // 12px margin on each side
const BannerHeight = 220;

// Shared with VirtualTryOnScreen so a pick made here carries into the try-on flow
const USER_IMAGE_KEY = 'VIRTUAL_TRYON_USER_IMAGE';
const GARMENT_IMAGE_KEY = 'VIRTUAL_TRYON_GARMENT_IMAGE';

const RECENT_LIMIT = 5;

interface HistoryItem {
  id: number;
  category: string;
  output_image_url: string;
  request_meta: string;
  created_at: string;
}

/** Match TryOnResult: check if URL, otherwise apply base64 prefix */
const toImageUri = (value: string): string => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `data:image/png;base64,${value.replace(/^data:image\/\w+;base64,/, '')}`;
};

interface CarouselItem {
  id: number;
  image: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  is_active: boolean;
  order: number;
}

const BASE_URL = 'https://api.feelvie.com';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<{
    platform: string;
    latest_version: string;
    latest_build_number: string;
    is_mandatory: boolean;
    update_required: boolean;
    message: string;
    url: string;
  } | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const CAROUSEL_API = `${BASE_URL}/api/common/carousels?type=app`;
  const WALLET_API = `${BASE_URL}/api/wallet/me/`;
  const HISTORY_API = `${BASE_URL}/api/secure/vton/history/`;

  const fetchRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(HISTORY_API, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a: HistoryItem, b: HistoryItem) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecent(sorted.slice(0, RECENT_LIMIT));
    } catch (err) {
      console.log('Recent generations fetch error:', err);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // Wallet
      const walletRes = await fetch(WALLET_API, { headers });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setCreditBalance(Number(walletData?.credit_balance ?? 0));
      }

      // Carousel
      const crRes = await fetch(CAROUSEL_API, { headers });
      if (crRes.ok) {
        const data = await crRes.json();
        setCarousels(
          (Array.isArray(data) ? data : []).filter((c: CarouselItem) => c.is_active)
            .sort((a, b) => a.order - b.order)
        );
      }
    } catch (err) {
      console.log('Home fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Keep the two selection boxes and the recent strip in sync with the try-on flow
  useFocusEffect(
    useCallback(() => {
      loadStoredImages();
      fetchRecent();
    }, [fetchRecent])
  );

  const loadStoredImages = async () => {
    try {
      const [garment, user] = await AsyncStorage.multiGet([GARMENT_IMAGE_KEY, USER_IMAGE_KEY]);
      setGarmentImage(garment[1]);
      setUserImage(user[1]);
    } catch (err) {
      console.log('Failed to load stored try-on images:', err);
    }
  };

  // ── Image selection (shares storage keys with VirtualTryOnScreen) ──
  const cropConfig = {
    width: 900,
    height: 1400, // 3:4 aspect ratio
    cropping: true,
    mediaType: 'photo' as const,
  };

  const pickImage = async (
    fromCamera: boolean,
    setter: (uri: string) => void,
    key: string,
    type: string
  ) => {
    try {
      const image = fromCamera
        ? await ImagePicker.openCamera(cropConfig)
        : await ImagePicker.openPicker(cropConfig);
      if (image?.path) {
        setter(image.path);
        await AsyncStorage.setItem(key, image.path);
      }
    } catch (error: any) {
      if (error?.message !== 'User cancelled image selection') {
        console.log(`${type} picker error:`, error);
        Toast.show({ type: 'error', text1: `Failed to open ${fromCamera ? 'camera' : 'gallery'}` });
      }
    }
  };

  const selectImageSource = (setter: (uri: string) => void, key: string, type: string) => {
    Alert.alert(
      `Upload ${type}`,
      'Choose an option to upload your image:',
      [
        { text: 'Take a Photo', onPress: () => pickImage(true, setter, key, type) },
        { text: 'Choose from Gallery', onPress: () => pickImage(false, setter, key, type) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const appversion = DeviceInfo.getVersion();
        const buildNumber = DeviceInfo.getBuildNumber();
        
        const response = await fetch(`${BASE_URL}/api/common/version/?platform=${(Platform.OS).toLowerCase()}`);
        if (!response.ok) return;

        const data = await response.json();
        if (data?.update_required && (data.latest_version !== appversion || data.latest_build_number !== buildNumber)) {
          setUpdateInfo(data);
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.log('Update check failed:', error);
      }
    };

    checkAppVersion();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  const renderCarousel = (item: CarouselItem, index: number) => (
    <Image
      key={index}
      style={{ width: BannerWidth, height: BannerHeight, objectFit: "fill", borderRadius: 16 }}
      source={{ uri: item.image }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={[styles.header]}>
          <Text style={styles.logo}>FeelVie</Text>
          <TouchableOpacity style={styles.creditBadge} onPress={() => navigation.navigate('WalletScreen')}>
            <Icon name="account-balance-wallet" size={16} color="#000" />
            <Text style={styles.creditText}>{creditBalance} Credit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Carousel Skeleton */}
          <View style={styles.carouselContainer}>
            <View style={styles.skeletonCarousel} />
          </View>

          {/* Categories Placeholder */}
          <View style={[styles.categoriesContainer, { opacity: 0.3 }]}>
            <View style={[styles.skeletonText, { width: 60, height: 60, borderRadius: 30 }]} />
            <View style={[styles.skeletonText, { width: 60, height: 60, borderRadius: 30 }]} />
            <View style={[styles.skeletonText, { width: 60, height: 60, borderRadius: 30 }]} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!updateInfo?.is_mandatory) {
            setShowUpdateModal(false);
          }
        }}
      >
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalContainer}>
            <Text style={styles.updateModalTitle}>Update Available</Text>
            <Text style={styles.updateModalMessage}>
              {updateInfo?.message ?? 'A newer version is available.'}
            </Text>
            <Text style={styles.updateModalVersion}>
              Version {updateInfo?.latest_version}
            </Text>
            <View style={styles.updateModalActions}>
              {!updateInfo?.is_mandatory && (
                <TouchableOpacity
                  style={styles.updateModalCloseButton}
                  onPress={() => setShowUpdateModal(false)}
                >
                  <Text style={styles.updateModalCloseText}>Later</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.updateModalActionButton}
                onPress={async () => {
                  if (updateInfo?.url) {
                    await Linking.openURL(updateInfo.url);
                  }
                }}
              >
                <Text style={styles.updateModalActionText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header]}>
        <Text style={styles.logo}>FeelVie</Text>
        <TouchableOpacity style={styles.creditBadge} onPress={() => navigation.navigate('WalletScreen')}>
          <Icon name="account-balance-wallet" size={16} color="#000" />
          <Text style={styles.creditText}>{creditBalance} Credit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f8ac1b" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ minHeight: SCREEN_HEIGHT - 100 }}>
          {/* Carousel */}
          <View style={styles.carouselContainer}>
            {carousels.length > 0 ? (
              <Carousel
                autoplay
                autoplayTimeout={5000}
                loop
                pageSize={BannerWidth}
                activePageIndicatorStyle={{ backgroundColor: '#f8ac1b' }}
                pageIndicatorStyle={{ backgroundColor: 'rgba(248,172,27,0.3)' }}
              >
                {carousels.map(renderCarousel)}
              </Carousel>
            ) : (
              <View style={styles.carouselPlaceholder} />
            )}
          </View>

          {/* Garment + Photo selection boxes */}
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>Start Your Try-On</Text>
            <View style={styles.selectionRow}>
              <TouchableOpacity
                style={styles.selectionBox}
                activeOpacity={0.85}
                onPress={() => selectImageSource(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
              >
                {garmentImage ? (
                  <>
                    <Image source={{ uri: garmentImage }} style={styles.selectionImage} resizeMode="cover" />
                    <View style={styles.selectionEditBadge}>
                      <MCIcon name="pencil" size={14} color="#FFFFFF" />
                    </View>
                  </>
                ) : (
                  <View style={styles.selectionPlaceholder}>
                    <MCIcon name="hanger" size={34} color="#f8ac1b" />
                    <Text style={styles.selectionPlaceholderText}>Upload</Text>
                  </View>
                )}
                <Text style={styles.selectionLabel}>Garment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.selectionBox}
                activeOpacity={0.85}
                onPress={() => selectImageSource(setUserImage, USER_IMAGE_KEY, 'Your Photo')}
              >
                {userImage ? (
                  <>
                    <Image source={{ uri: userImage }} style={styles.selectionImage} resizeMode="cover" />
                    <View style={styles.selectionEditBadge}>
                      <MCIcon name="pencil" size={14} color="#FFFFFF" />
                    </View>
                  </>
                ) : (
                  <View style={styles.selectionPlaceholder}>
                    <MCIcon name="account-box-outline" size={34} color="#f8ac1b" />
                    <Text style={styles.selectionPlaceholderText}>Upload</Text>
                  </View>
                )}
                <Text style={styles.selectionLabel}>Your Photo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.tryOnButton, !(garmentImage && userImage) && styles.tryOnButtonDisabled]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TryOn')}
            >
              <Text style={styles.tryOnButtonText}>
                {garmentImage && userImage ? 'Try It On Now' : 'Continue to Try-On'}
              </Text>
              <Icon name="auto-awesome" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Recent generations */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Recent Generations</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>

            {recentLoading ? (
              <View style={styles.recentPlaceholderRow}>
                <ActivityIndicator size="small" color="#111111" />
              </View>
            ) : recent.length === 0 ? (
              <View style={styles.recentEmpty}>
                <MCIcon name="tshirt-crew-outline" size={40} color="#DDDDDD" />
                <Text style={styles.recentEmptyText}>
                  Your try-on results will appear here once you generate them.
                </Text>
              </View>
            ) : (
              <FlatList
                data={recent}
                horizontal
                keyExtractor={item => String(item.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.recentCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('TryOnResult', {
                        resultBase64: item.output_image_url,
                        isUrl: true,
                        category: item.category,
                        timestamp: item.created_at,
                        metadata: item.request_meta,
                      })
                    }
                  >
                    <Image
                      source={{ uri: toImageUri(item.output_image_url) }}
                      style={styles.recentImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>


        {/* Bottom Banner */}
        <Image
          source={require('../assets/images/homebottom.png')}
          style={{ width: '100%', height: 400 }}
          resizeMode="contain"
        />

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#111111',
    letterSpacing: -0.5,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingInline: 10,
    gap: 6,
  },
  creditText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    transform: [{ translateY: -1 }],
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },

  carouselContainer: {
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  carouselPlaceholder: { height: BannerHeight, backgroundColor: '#F5F5F5' },

  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    marginTop: 24,
    gap: 20,
    paddingLeft: 14,
  },

  /* Garment + Photo selection */
  selectionSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
  },
  selectionImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#F2F2F2',
  },
  selectionPlaceholder: {
    width: '100%',
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectionEditBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  tryOnButton: {
    marginTop: 16,
    backgroundColor: '#111111',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryOnButtonDisabled: {
    backgroundColor: '#333333',
  },
  tryOnButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
  },

  /* Recent generations */
  recentSection: {
    marginTop: 32,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#f8ac1b',
  },
  recentListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recentCard: {
    width: 140,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F7F7F7',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  recentPlaceholderRow: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentEmpty: {
    marginHorizontal: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  recentEmptyText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#111111',
    marginBottom: 16,
  },
  skeletonCarousel: {
    height: BannerHeight,
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
  },

  skeletonText: {
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
  },

  infoContainer: { padding: 12 },
  name: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    lineHeight: 16,
    marginBottom: 8,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  sellingPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
    color: '#f8ac1b',
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  updateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  updateModalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  updateModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 12,
  },
  updateModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    marginBottom: 16,
  },
  updateModalVersion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
    marginBottom: 24,
  },
  updateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  updateModalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
  },
  updateModalCloseText: {
    color: '#333333',
    fontWeight: '700',
    fontSize: 14,
  },
  updateModalActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'black',
  },
  updateModalActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
