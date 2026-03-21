// src/features/home/screens/MyListingsScreen.tsx

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
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 3) / 2;
const IMAGE_ASPECT_RATIO = 1.1;

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

interface WishlistStatus {
  inWishlist: boolean;
  itemId?: number;
  isToggling?: boolean;
}

export default function MyListingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Record<number, WishlistStatus>>({});

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const BASE_URL = 'https://feelvie.yaytech.in';
  const PRODUCTS_ENDPOINT = `${BASE_URL}/api/catalog/products/my_products/`;
  const WISHLIST_ENDPOINT = `${BASE_URL}/api/wishlist/items/`;

  const fetchMyProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setErrorMessage('Please login to view your listings');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(PRODUCTS_ENDPOINT, { headers });

      if (!res.ok) {
        setErrorMessage('Failed to load listings');
        return;
      }

      const data = await res.json();
      const rawProducts = Array.isArray(data) ? data : data.results || data.data || [];

      const processed = rawProducts.map((p: any) => {
        const orig = parseFloat(p.original_price || '0');
        const sell = parseFloat(p.selling_price || '0');
        const discount = orig > sell && orig > 0 ? Math.round(((orig - sell) / orig) * 100) : 0;
        return { ...p, discount, images: p.images || [] } as Product;
      });

      setProducts(processed);

      if (processed.length > 0) {
        await fetchWishlistStatus(token, processed.map(p => p.id));
      }
    } catch (err) {
      console.error('[MY-LISTINGS] Error:', err);
      setErrorMessage('Something went wrong. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchWishlistStatus = async (token: string, productIds: number[]) => {
    try {
      const res = await fetch(WISHLIST_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];

        const newMap: Record<number, WishlistStatus> = {};
        productIds.forEach(id => {
          const match = items.find((item: any) => item.product === id && item.variant === 0);
          newMap[id] = { inWishlist: !!match, itemId: match?.id };
        });

        setWishlistMap(prev => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.error('[WISHLIST] Error fetching status:', err);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyProducts();
  };

  const getProductImage = (product: Product) => {
    const img = product.images?.[0];
    return img?.image_url || img?.image || 'https://via.placeholder.com/400x440?text=No+Image';
  };

  const toggleWishlist = async (product: Product) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;

    const current = wishlistMap[product.id] || { inWishlist: false };
    const willBeIn = !current.inWishlist;

    setWishlistMap(prev => ({
      ...prev,
      [product.id]: { inWishlist: willBeIn, itemId: current.itemId, isToggling: true },
    }));

    try {
      if (current.inWishlist && current.itemId) {
        const url = `${WISHLIST_ENDPOINT}${current.itemId}/`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Delete failed');
        setWishlistMap(prev => ({
          ...prev,
          [product.id]: { inWishlist: false, itemId: undefined, isToggling: false },
        }));
      } else {
        const payload = { product: product.id, variant: null };
        const res = await fetch(WISHLIST_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Add failed');
        const added = await res.json();
        setWishlistMap(prev => ({
          ...prev,
          [product.id]: { inWishlist: true, itemId: added.id, isToggling: false },
        }));
      }
    } catch (err) {
      console.error('[WISHLIST TOGGLE ERROR]', err);
      setWishlistMap(prev => ({
        ...prev,
        [product.id]: { ...current, isToggling: false },
      }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#B03385" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.topHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-ios" size={26} color="#1C1C1E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Listings</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('MyWishList')}
          style={styles.headerAction}
        >
          <Icon name="favorite-border" size={28} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      >
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <FlatList
          data={products}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.productsList}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => {
            const status = wishlistMap[item.id] || { inWishlist: false, isToggling: false };

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.productCard}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: getProductImage(item) }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />

                  <TouchableOpacity
                    style={styles.heartContainer}
                    onPress={() => toggleWishlist(item)}
                    disabled={status.isToggling}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    {status.isToggling ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon
                        name={status.inWishlist ? 'favorite' : 'favorite-border'}
                        size={24}
                        color={status.inWishlist ? '#ef4444' : '#ffffff'}
                        style={styles.heartShadow}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                  </Text>

                  <View style={styles.priceRow}>
                    {item.original_price && Number(item.original_price) > Number(item.selling_price) && (
                      <Text style={styles.originalPrice}>
                        ₹{Number(item.original_price).toLocaleString('en-IN')}
                      </Text>
                    )}

                    <Text style={styles.sellingPrice}>
                      ₹{Number(item.selling_price || 0).toLocaleString('en-IN')}
                    </Text>

                    {item.discount && item.discount > 0 && (
                      <Text style={styles.discountBadge}>{item.discount}% OFF</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="inventory-2" size={80} color="#e0e0e0" />
              <Text style={styles.emptyText}>No products listed yet</Text>
              <Text style={styles.emptySubText}>Your uploaded items will appear here</Text>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#B03385',
  },
  headerAction: { padding: 8 },

  productsList: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 8,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },

  productCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: IMAGE_ASPECT_RATIO,
    backgroundColor: '#f3f4f6',
  },
  productImage: {
    ...StyleSheet.absoluteFillObject,
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
  heartShadow: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },

  productInfo: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },

  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 6,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sellingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 13,
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#16a34ac3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },

  errorText: {
    color: '#dc2626',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
});