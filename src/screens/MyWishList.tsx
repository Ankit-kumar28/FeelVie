// src/features/profile/screens/MyWishList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useCart } from '../context/CartContext'; // adjust path if needed

const BASE_URL = 'https://feelvie.yaytech.in';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

interface WishlistItem {
  id: number;
  product: number;
  product_name: string;
  variant?: number | null;
  variant_name?: string | null;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  selling_price: string;
  original_price?: string;
  images?: { image_url?: string; image?: string }[];
  discount?: number;
  variants?: Array<{
    id: number;
    color?: { name: string };
    size?: { size: string };
    quantity: number;
    price_override?: string;
    is_active: boolean;
  }>;
  stock_quantity?: number;
}

export default function MyWishListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart?.() ?? { addToCart: () => {} };

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [products, setProducts] = useState<{ [key: number]: Product }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCartItemId, setAddingToCartItemId] = useState<number | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setError('Please login to view wishlist');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${BASE_URL}/api/wishlist/items/`, { headers });
      if (!res.ok) throw new Error('Failed to load wishlist');

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.results || [];
      setWishlistItems(items);

      const uniqueProductIds = [...new Set(items.map((i: WishlistItem) => i.product))];
      if (uniqueProductIds.length === 0) return;

      const productPromises = uniqueProductIds.map(async (prodId) => {
        const prodRes = await fetch(`${BASE_URL}/api/catalog/products/${prodId}/`, { headers });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          return { [prodId]: prodData };
        }
        return null;
      });

      const fetched = await Promise.all(productPromises);
      const productsMap = fetched.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setProducts(productsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
  };

  const removeFromWishlist = async (itemId: number) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/wishlist/items/${itemId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to remove from wishlist');

      setWishlistItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Remove from wishlist failed:', err);
      Toast.show({
        type: 'error',
        text1: 'Could not remove item',
      });
    }
  };

  const handleMoveToCart = async (item: WishlistItem, product: Product) => {
  if (addingToCartItemId === item.id) return;

  setAddingToCartItemId(item.id);

  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Toast.show({ type: 'error', text1: 'Please login again' });
      return;
    }

    let selectedVariant = null;
    let variantIdToSend: number | null = null;
    let currentPrice = parseFloat(product.selling_price || '0');

    if (item.variant && product.variants && product.variants.length > 0) {
      selectedVariant = product.variants.find((v) => v.id === item.variant);
      if (selectedVariant) {
        variantIdToSend = selectedVariant.id;
        if (selectedVariant.price_override) {
          currentPrice = parseFloat(selectedVariant.price_override);
        }
      }
    }

    // Stock check
    const inStock =
      selectedVariant?.quantity != null
        ? selectedVariant.quantity >= 1
        : (product.stock_quantity ?? 0) >= 1;

    if (!inStock) {
      Toast.show({
        type: 'error',
        text1: 'Out of stock',
        text2: 'This item is currently unavailable',
      });
      return;
    }

    // ─── BACKEND: Add to cart API call ───
    const addToCartRes = await fetch(`${BASE_URL}/api/cart/items/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product: item.product,
        variant: variantIdToSend,          
        quantity: 1,
      }),
    });

    if (!addToCartRes.ok) {
      const errorText = await addToCartRes.text();
      console.log("Add to cart failed:", errorText);
      throw new Error('Failed to add to cart on server');
    }

   
    addToCart({
      id: product.id,
      name: product.name || 'Product',
      price: currentPrice,
      originalPrice: parseFloat(product.original_price || String(currentPrice)),
      image: product.images?.[0]?.image_url || product.images?.[0]?.image || '',
      color: selectedVariant?.color?.name,
      size: selectedVariant?.size?.size,
      variantId: variantIdToSend ?? undefined,
      quantity: 1,
    });

    Toast.show({
      type: 'success',
      text1: 'Moved to Cart',
      text2: `${product.name || 'Item'} added successfully`,
      position: 'bottom',
      visibilityTime: 2200,
    });

    await removeFromWishlist(item.id);

  } catch (err: any) {
    console.error('Move to cart error:', err);
    Toast.show({
      type: 'error',
      text1: 'Failed to move to cart',
      text2: err.message || 'Please try again',
    });
  } finally {
    setAddingToCartItemId(null);
  }
};
  const getProductImage = (product?: Product) => {
    const img = product?.images?.[0];
    return img?.image_url || img?.image || 'https://via.placeholder.com/300?text=No+Image';
  };

  const renderSkeleton = () => (
    <View style={styles.card}>
      <View style={[styles.image, { backgroundColor: '#e5e7eb' }]} />
      <View style={styles.info}>
        <View style={[styles.skeletonLine, { width: '80%', height: 16 }]} />
        <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const prod = products[item.product];
    if (!prod) return null;

    const selling = Number(prod.selling_price || 0);
    const original = Number(prod.original_price || selling);
    const discount = original > selling ? Math.round(((original - selling) / original) * 100) : 0;

    const isAdding = addingToCartItemId === item.id;

    return (
      <View style={styles.card}>
        {/* Remove (X) icon */}
        <TouchableOpacity
          style={styles.cutIcon}
          onPress={() => removeFromWishlist(item.id)}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          disabled={isAdding}
        >
          <Icon name="close" size={18} color="#ef4444" />
        </TouchableOpacity>

        {/* Image */}
        <TouchableOpacity
          style={styles.imageWrapper}
          onPress={() => navigation.navigate('ProductDetail', { product: prod })}
          disabled={isAdding}
        >
          <Image
            source={{ uri: getProductImage(prod) }}
            style={styles.image}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.info}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetail', { product: prod })}
            disabled={isAdding}
          >
            <Text style={styles.name} numberOfLines={2}>
              {prod.name}
            </Text>
          </TouchableOpacity>

          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₹{selling.toFixed(0)}</Text>
            {discount > 0 && (
              <>
                <Text style={styles.originalPrice}>₹{original.toFixed(0)}</Text>
                <Text style={styles.discountBadge}>{discount}% OFF</Text>
              </>
            )}
          </View>

          <View style={styles.separatorLine} />

          {/* MOVE TO BAG button */}
          <TouchableOpacity
            style={[styles.moveToBagContainer, isAdding && styles.moveToBagDisabled]}
            onPress={() => handleMoveToCart(item, prod)}
            disabled={isAdding}
            activeOpacity={0.7}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#B03385" />
            ) : (
              <Text style={styles.moveToBagText}>MOVE TO CART</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Wishlist</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.7}
        >
          <Icon name="shopping-cart" size={26} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          renderItem={renderSkeleton}
          keyExtractor={(_, i) => `skeleton-${i}`}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
        />
      ) : error || wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="favorite-border" size={90} color="#d1d5db" />
          <Text style={styles.emptyTitle}>
            {error || 'Your Wishlist is Empty'}
          </Text>
          <Text style={styles.emptySubtitle}>
            Save products you love to buy them later
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={styles.shopBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────
// Styles (added disabled state style)
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#B03385',
  },

  list: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#e9e9e9',
  },

  imageWrapper: {
    width: '100%',
    height: CARD_WIDTH * 1.0,
    backgroundColor: '#f8fafc',
  },
  image: {
    flex: 1,
  },

  info: {
    padding: 10,
    paddingBottom: 6,
  },

  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 18,
    marginBottom: 6,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B03385',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: 11,
    fontWeight: '600',
    // color: '#16a34a',
    // backgroundColor: '#f0fdf4',
    color: '#ffffff',
    backgroundColor: '#16a34ac3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  cutIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 5,
    zIndex: 10,
  },

  separatorLine: {
    height: 0.8,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },

  moveToBagContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  moveToBagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B03385',
    // textDecorationLine: 'underline',
  },
  moveToBagDisabled: {
    opacity: 0.6,
  },

  // Skeleton
  skeletonLine: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  shopBtn: {
    marginTop: 32,
    backgroundColor: '#B03385',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});