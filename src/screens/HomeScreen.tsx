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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Carousel from 'react-native-banner-carousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BannerWidth = SCREEN_WIDTH - 24; // 12px margin on each side
const BannerHeight = 220;

const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const PRODUCT_IMG_HEIGHT = 280;

interface CarouselItem {
  id: number;
  image: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  is_active: boolean;
  order: number;
}

interface ProductImage {
  id: number;
  image?: string;
  image_url?: string;
  alt_text?: string;
  sort_order?: number;
}

interface Product {
  id: number;
  name: string;
  selling_price: string;
  original_price?: string | null;
  images: ProductImage[];
  category: number;
  description?: string;
  product_type: string;
  condition: string;
}

const BASE_URL = 'https://api.feelvie.com';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wishlistMap, setWishlistMap] = useState<Record<number, boolean>>({});
  const [creditBalance, setCreditBalance] = useState<number>(0);

  const handleVirtualTryOn = (product: Product) => {
    // Navigate to VirtualTryOn screen with product as garment
    navigation.navigate('VirtualTryOn', {
      garment: product,
      garmentImage: getProductImage(product),
      garmentName: product.name
    });
  };

  const toggleWishlist = (productId: number) => {
    setWishlistMap(prev => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const CAROUSEL_API = `${BASE_URL}/api/common/carousels?type=app`;
  const PRODUCTS_API = `${BASE_URL}/api/catalog/products/`;
  const WALLET_API = `${BASE_URL}/api/wallet/me/`;

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

      // Products
      const prodRes = await fetch(PRODUCTS_API, { headers });
      if (prodRes.ok) {
        const data = await prodRes.json();
        const prods = Array.isArray(data) ? data : data.results || [];
        setProducts(prods.filter((p: Product) => p.images && p.images.length > 0));
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  const getProductImage = (p: Product) =>
    p.images?.[0]?.image_url || p.images?.[0]?.image || 'https://via.placeholder.com/400';

  const renderCarousel = (item: CarouselItem, index: number) => (
    <Image
      key={index}
      style={{ width: BannerWidth, height: BannerHeight , objectFit : "fill", borderRadius: 16}}
      source={{ uri: item.image }}
    />
  );

  const renderProduct = ({ item }: { item: Product }) => {
    const inWishlist = wishlistMap[item.id] || false;

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.92}
        onPress={() => handleVirtualTryOn(item)}
      >
        {/* Heart Icon - Wishlist */}
        <TouchableOpacity
          style={styles.heartContainer}
          onPress={() => toggleWishlist(item.id)}
        >
          <Icon
            name={inWishlist ? 'favorite' : 'favorite-border'}
            size={18}
            color={inWishlist ? '#ef4444' : '#ffffff'}
            style={styles.heartShadow}
          />
        </TouchableOpacity>

        {/* AI Virtual Try-On Icon */}
        <TouchableOpacity
          style={styles.aiContainer}
          onPress={() => handleVirtualTryOn(item)}
        >
          <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>Try on yourself
          </Text>
          <Icon
            name="auto-awesome"
            size={16}
            color="#000"
            style={styles.aiShadow}
          />
        </TouchableOpacity>

        <Image
          source={{ uri: getProductImage(item) }}
          style={styles.productImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={[styles.header]}>
          <Text style={styles.logo}>FeelVie</Text>
          <View style={styles.creditBadge}>
            <Icon name="account-balance-wallet" size={16} color="#000" />
            <Text style={styles.creditText}>{creditBalance} Credit</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Carousel Skeleton */}
          <View style={styles.carouselContainer}>
            <View style={styles.skeletonCarousel} />
          </View>

          {/* Products Title Skeleton */}
          <View style={{ marginTop: 24, marginLeft: 20, marginBottom: 12 }}>
            <View style={[styles.skeletonText, { width: 150, height: 20 }]} />
          </View>

          {/* Grid Skeleton */}
          <View style={styles.gridContent}>
            <View style={styles.columnWrapper}>
              <View style={styles.skeletonCard} />
              <View style={styles.skeletonCard} />
            </View>
            <View style={styles.columnWrapper}>
              <View style={styles.skeletonCard} />
              <View style={styles.skeletonCard} />
            </View>
            <View style={styles.columnWrapper}>
              <View style={styles.skeletonCard} />
              <View style={styles.skeletonCard} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header]}>
        <Text style={styles.logo}>FeelVie</Text>
        <View style={styles.creditBadge}>
          <Icon name="account-balance-wallet" size={16} color="#000" />
          <Text style={styles.creditText}>{creditBalance} Credit</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f8ac1b" />}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Products Grid */}
        <Text style={styles.productsTitle}>Try Virtual</Text>
        <FlatList
          scrollEnabled={false}
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.gridContent}
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
    paddingInline : 10,
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

  skeletonCarousel: {
    height: BannerHeight,
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
  },

  skeletonCard: {
    width: PRODUCT_CARD_WIDTH,
    height: PRODUCT_IMG_HEIGHT,
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
  },

  skeletonText: {
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
  },

  productsTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#111111',
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 20,
    letterSpacing: -0.5,
  },

  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  columnWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },

  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  heartContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },

  aiContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#fff',
    paddingVertical: 4,
    width: '90%',
    height: 32,
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,

  },

  heartShadow: {
    textShadowColor: 'rgba(188, 187, 187, 0.8)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },

  aiShadow: {
    textShadowColor: 'rgba(248, 172, 27, 0.6)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },

  productImage: {
    width: '100%',
    height: PRODUCT_IMG_HEIGHT,
    backgroundColor: '#F5F5F5',
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
});
