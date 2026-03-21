// src/features/home/screens/HomeScreen.tsx

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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Carousel from 'react-native-banner-carousel';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BannerWidth = SCREEN_WIDTH;
const BannerHeight = 210;

const H_CARD_WIDTH = 178;
const PRODUCT_IMG_HEIGHT = 190;

interface CarouselItem {
  id: number;
  image: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  is_active: boolean;
  order: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  image: string;
  parent: number;
}

interface ProductImage {
  id: number;
  image?: string;
  image_url?: string;
  alt_text?: string;
}

interface Product {
  id: number;
  name: string;
  selling_price: string;
  original_price?: string;
  images: ProductImage[];
  discount?: number;
}

interface SectionProduct {
  id: number;
  product: Product;
  order: number;
}

interface HomeSection {
  id: number;
  name: string;
  description?: string;
  section_type: string;
  is_active: boolean;
  order: number;
  products: SectionProduct[];
}

interface WishlistStatus {
  inWishlist: boolean;
  itemId?: number;
  isToggling?: boolean;
}

const BASE_URL = 'https://feelvie.yaytech.in';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Record<number, WishlistStatus>>({});

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const CAROUSEL_API = `${BASE_URL}/api/common/carousels/`;
  const CATEGORIES_API = `${BASE_URL}/api/catalog/categories/`;
  const SECTIONS_API = `${BASE_URL}/api/common/sections/`;
  const WISHLIST_API = `${BASE_URL}/api/wishlist/items/`;

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // Carousel
      const crRes = await fetch(CAROUSEL_API, { headers });
      if (crRes.ok) {
        const data = await crRes.json();
        setCarousels(
          (Array.isArray(data) ? data : []).filter((c: CarouselItem) => c.is_active)
            .sort((a, b) => a.order - b.order)
        );
      }

      // Categories
      const catRes = await fetch(CATEGORIES_API, { headers });
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(Array.isArray(data) ? data : data.results || []);
      }

      // Sections + products wishlist status
      const secRes = await fetch(SECTIONS_API, { headers });
      if (secRes.ok) {
        const data = await secRes.json();
        const secs = (Array.isArray(data) ? data : data.results || [])
          .filter((s: HomeSection) => s.is_active)
          .sort((a, b) => a.order - b.order);

        setSections(secs);

        const allProdIds = secs.flatMap(s => s.products?.map(sp => sp.product?.id) || []);
        if (allProdIds.length > 0) {
          await fetchWishlistStatus(token, allProdIds);
        }
      }
    } catch (err) {
      console.log('Home fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchWishlistStatus = async (token: string, productIds: number[]) => {
    try {
      const res = await fetch(WISHLIST_API, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;

      const data = await res.json();
      const items = Array.isArray(data) ? data : [];

      const map: Record<number, WishlistStatus> = {};
      productIds.forEach(id => {
        const match = items.find((it: any) => it.product === id && !it.variant);
        map[id] = match ? { inWishlist: true, itemId: match.id } : { inWishlist: false };
      });

      setWishlistMap(prev => ({ ...prev, ...map }));
    } catch (err) {
      console.log('Wishlist status fetch error:', err);
    }
  };

  const toggleWishlist = async (product: Product) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      // Toast.show({ type: 'error', text1: 'Please login first' });
      return;
    }

    const current = wishlistMap[product.id] || { inWishlist: false };
    const isCurrentlyIn = current.inWishlist;

    // Optimistic update
    setWishlistMap(prev => ({
      ...prev,
      [product.id]: { inWishlist: !isCurrentlyIn, isToggling: true },
    }));

    try {
      if (isCurrentlyIn && current.itemId) {
        // Remove
        const res = await fetch(`${WISHLIST_API}${current.itemId}/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Remove failed');
      } else {
        // Add
        const res = await fetch(WISHLIST_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ product: product.id }),
        });
        if (!res.ok) throw new Error('Add failed');

        const newItem = await res.json();
        setWishlistMap(prev => ({
          ...prev,
          [product.id]: { inWishlist: true, itemId: newItem.id },
        }));
      }

      // Toast.show({
      //   type: 'success',
      //   text1: isCurrentlyIn ? 'Removed from Wishlist' : 'Added to Wishlist',
      //   position: 'bottom',
      // });
    } catch (err) {
      console.log('Wishlist toggle error:', err);
      Toast.show({ type: 'error', text1: 'Something went wrong' });

      // Rollback optimistic update
      setWishlistMap(prev => ({
        ...prev,
        [product.id]: { inWishlist: isCurrentlyIn, isToggling: false },
      }));
    } finally {
      setWishlistMap(prev => ({
        ...prev,
        [product.id]: { ...prev[product.id], isToggling: false },
      }));
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  const getProductImage = (p: Product) =>
    p.images?.[0]?.image_url || p.images?.[0]?.image || 'https://via.placeholder.com/400';

  const getCategoryImage = (cat: Category) => {
    if (cat.image?.startsWith('http')) return { uri: cat.image };
    return { uri: 'https://via.placeholder.com/200?text=' + encodeURIComponent(cat.name) };
  };

  const renderCarousel = (item: CarouselItem, index: number) => (
    <Image
      key={index}
      style={{ width: BannerWidth, height: BannerHeight }}
      source={{ uri: item.image }}
      resizeMode="cover"
    />
  );

  const renderProduct = ({ item }: { item: SectionProduct }) => {
    const p = item.product;
    if (!p) return null;

    const status = wishlistMap[p.id] || { inWishlist: false, isToggling: false };
    const sell = Number(p.selling_price || 0);
    const orig = Number(p.original_price || sell);
    const discount = orig > sell ? Math.round(((orig - sell) / orig) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('ProductDetail', { product: p })}
      >
        <TouchableOpacity
          style={styles.heartContainer}
          onPress={() => toggleWishlist(p)}
          disabled={status.isToggling}
        >
          {status.isToggling ? (
            <ActivityIndicator size="small" color="#B03385" />
          ) : (
            <Icon
              name={status.inWishlist ? 'favorite' : 'favorite-border'}
              size={22}
              color={status.inWishlist ? '#ef4444' : '#ffffff'}
               style={styles.heartShadow}
            />
          )}
        </TouchableOpacity>

        <Image
          source={{ uri: getProductImage(p) }}
          style={styles.productImage}
          resizeMode="cover"
        />

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2}>
            {p.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.sellingPrice}>₹{sell.toFixed(0)}</Text>
            {discount > 0 && (
              <>
                <Text style={styles.originalPrice}>₹{orig.toFixed(0)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discount}% OFF</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

if (loading) {
  return (
    <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#B03385" />
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.logo}>FeelVie</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Icon name="search" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={{ marginLeft: 20 }}>
            <Icon name="shopping-cart" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
              activePageIndicatorStyle={{ backgroundColor: '#B03385' }}
              pageIndicatorStyle={{ backgroundColor: 'rgba(176,51,133,0.3)' }}
            >
              {carousels.map(renderCarousel)}
            </Carousel>
          ) : (
            <View style={styles.carouselPlaceholder} />
          )}
        </View>

        {/* Categories - alag title style */}
        <Text style={styles.categoriesTitle}>Shop by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() =>
                navigation.navigate('SearchResults', {
                  title: cat.name,
                  filters: { category: cat.id },
                })
              }
            >
              <Image source={getCategoryImage(cat)} style={styles.categoryImg} />
              <Text style={styles.categoryName} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sections */}
        {sections.map(section => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.name}</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SearchResults', {
                    title: section.name,
                    filters: { section: section.id },
                  })
                }
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={section.products?.slice(0, 8) || []}
              renderItem={renderProduct}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#b3b3b3',
  },
  logo: { fontSize: 26, fontWeight: 'bold', color: '#B03385' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },

  carouselContainer: {
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    // elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  carouselPlaceholder: { height: BannerHeight, backgroundColor: '#f1f5f9' },

  // ── Categories Title ── different from section title
  categoriesTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 20,
    letterSpacing: -0.4,
  },
  categoriesScroll: { paddingHorizontal: 16, paddingBottom: 8 },
  categoryCard: { alignItems: 'center', marginRight: 18, width: 80 },
  categoryImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 0.8,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  categoryName: {
    marginTop: 8,
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },

  section: { marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop:18,
    // borderBottomWidth:.5,
    // borderBottomStartRadius:45,
    // borderBottomColor:'#dbdada',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B03385',
    // underlineColorAndroid: '#B03385',
    textDecorationLine: 'underline',
  },


  heartShadow: {
    textShadowColor: 'rgba(188, 187, 187, 0.8)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },

  // ── Product Card (MyWishList inspired) ──
  productCard: {
    width: H_CARD_WIDTH,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.6,
    borderColor: '#e7e7e7',
    overflow: 'hidden',
    // elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  heartContainer: {
      position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },

  productImage: {
    width: '100%',
    height: PRODUCT_IMG_HEIGHT,
    backgroundColor: '#f8fafc',
  },

  infoContainer: { padding: 12 },
  name: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 18,
    marginBottom: 8,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sellingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B03385',
  },
  originalPrice: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#16a34ac3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});