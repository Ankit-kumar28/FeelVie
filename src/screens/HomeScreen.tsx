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
import productData from '../utils/product.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BannerWidth = SCREEN_WIDTH - 24; // 12px margin on each side
const BannerHeight = 220;

interface Category {
  id: number;
  categoryName: string;
  icon: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: number;
  subcategoryName: string;
  icon: string;
  products: Product[];
}

interface Product {
  id: number;
  productName: string;
  imageUrl: string;
}

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
  const [selectedCategory, setSelectedCategory] = useState<Category>(productData.categories[0] as Category);

  // Animated values for subcategories
  const [scaleAnims] = useState(() =>
    productData.categories.flatMap(cat => cat.subcategories).reduce((acc, sub) => {
      acc[sub.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<number, Animated.Value>)
  );

  const animateSubcategory = (id: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[id], { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnims[id], { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const CAROUSEL_API = `${BASE_URL}/api/common/carousels?type=app`;
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

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            {productData.categories.map((category: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory.id === category.id && styles.activeCategoryItem
                ]}
                onPress={() => setSelectedCategory(category as Category)}
              >
                <View style={[
                  styles.categoryIconBox,
                  selectedCategory.id === category.id && styles.activeCategoryIconBox
                ]}>
                  {category.icon.startsWith('http') ? (
                    <Image source={{ uri: category.icon }} style={styles.categoryIcon} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>{category.icon}</Text>
                  )}
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedCategory.id === category.id && styles.activeCategoryText
                ]}>{category.categoryName}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subcategories (List View) */}
          <View style={styles.subCategoriesContainer}>
            <Text style={styles.sectionTitle}>{selectedCategory.categoryName} Collections</Text>
            <View style={{ paddingHorizontal: 16 }}>
              {selectedCategory.subcategories.map((sub: Subcategory) => (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => {
                    animateSubcategory(sub.id);
                    // Map products to SearchResults format
                    const products = sub.products.map(p => ({
                      id: p.id,
                      name: p.productName,
                      selling_price: "499", // Placeholder price for static data
                      images: [{ id: 1, image_url: p.imageUrl }]
                    }));
                    navigation.navigate('SearchResults', {
                      title: sub.subcategoryName,
                      preDefinedProducts: products
                    });
                  }}
                  activeOpacity={0.7}
                  style={styles.subCategoryListRow}
                >
                  <Animated.View style={[
                    styles.subCategoryListContent,
                    { transform: [{ scale: scaleAnims[sub.id] || 1 }] }
                  ]}>
                    <View style={styles.subCategoryIconCircle}>
                      {sub.icon.startsWith('http') ? (
                         <Image source={{ uri: sub.icon }} style={styles.subCategoryIcon} />
                      ) : (
                        <Text style={{ fontSize: 20 }}>{sub.icon}</Text>
                      )}
                    </View>
                    <Text style={styles.subCategoryListText}>{sub.subcategoryName}</Text>
                    <Icon name="chevron-right" size={24} color="#AAAAAA" />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
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
  categoryItem: {
    alignItems: 'center',
    opacity: 0.6,
  },
  activeCategoryItem: {
    opacity: 1,
  },
  categoryIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 4,
  },
  activeCategoryIconBox: {
    borderColor: '#f8ac1b',
    backgroundColor: '#FFF9F0',
  },
  categoryIcon: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
  },
  activeCategoryText: {
    color: '#f8ac1b',
  },

  subCategoriesContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#111111',
    marginBottom: 16,
    marginLeft: 20,
  },
  subCategoryListRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#36363652',
    padding: 12,
  },
  subCategoryListContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subCategoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  subCategoryListText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
  },
  subCategoryIcon: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    resizeMode: "contain",
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
});
