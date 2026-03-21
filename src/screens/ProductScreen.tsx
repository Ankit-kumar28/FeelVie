// src/features/product/screens/ProductDetailScreen.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://feelvie.yaytech.in';

interface Variant {
  id?: number;
  color?: { id: number; name?: string; hex_code?: string } | null;
  size?: { id?: number; size?: string; size_display?: string } | null;
  sku?: string;
  quantity: number;
  price_override?: string | null;
  is_active: boolean;
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
  name?: string;
  description?: string;
  selling_price?: string;
  original_price?: string;
  currency?: string;
  condition?: string;
  stock_quantity?: number;
  images?: ProductImage[];
  variants?: Variant[];
  category?: number | null;
  rating?: number;
  rating_count?: number;
}

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const initialProduct = route.params?.product;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const [addingToCart, setAddingToCart] = useState(false);

  // Wishlist states
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(null);

  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    if (!initialProduct?.id) {
      setError("No product selected");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setError("Please login to view product details");
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch main product
      const res = await fetch(`${BASE_URL}/api/catalog/products/${initialProduct.id}/`, { headers });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Product fetch failed: ${res.status} - ${errText}`);
      }
      const data = await res.json();
      setProduct(data);

      // Auto-select first valid variant
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        const first = data.variants.find(
          (v: Variant) => v?.is_active && v?.quantity > 0 && v?.color?.name && v?.size?.size
        );
        if (first) {
          setSelectedColor(first.color!.name!);
          setSelectedSize(first.size!.size!);
          setSelectedVariant(first);
        }
      }

      // Fetch similar products (same category, exclude current, max 4)
      if (data?.category) {
        setSimilarLoading(true);
        const simRes = await fetch(
          `${BASE_URL}/api/catalog/products/?category=${data.category}&limit=10`,
          { headers }
        );
        if (simRes.ok) {
          const simData = await simRes.json();
          const list = Array.isArray(simData) ? simData : simData?.results || [];
          const filtered = list
            .filter((p: Product) => p?.id !== data.id)
            .slice(0, 4);
          setSimilarProducts(filtered);
        }
        setSimilarLoading(false);
      }

      await checkWishlistStatus(token, data.id);

      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: any) {
      console.error('[ERROR] fetchProduct:', err);
      setError( "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const checkWishlistStatus = async (token: string, productId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/wishlist/items/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.results || [];

      const existing = items.find(
        (item: any) => item.product === productId && (!selectedVariant || item.variant === selectedVariant?.id)
      );

      setIsInWishlist(!!existing);
      setWishlistItemId(existing?.id || null);
    } catch (err) {
      console.warn('[WARN] Wishlist check failed:', err);
    }
  };

  // ────────────────────────────────────────────────
  //                  SHARE FUNCTION
  // ────────────────────────────────────────────────
  const shareProduct = async () => {
    if (!product) {
      console.log("[SHARE DEBUG] Product is not loaded yet");
      Toast.show({ type: 'error', text1: 'Product not loaded' });
      return;
    }

    console.log("[SHARE DEBUG] Preparing to share product:", {
      id: product.id,
      name: product.name,
      currentPrice,
      discount,
      image: product.images?.[0]?.image_url || product.images?.[0]?.image || 'no image',
    });

    const productLink = `https://feelvie.yaytech.in/products/${product.id}`;
    const firstImage = product.images?.[0]?.image_url || product.images?.[0]?.image;

    const shareOptions: any = {
      title: 'FeelVie - Check this awesome product!',
      message: `Hey! Look at this:\n\n${product.name || 'Great Product'}\nPrice: ₹${currentPrice.toFixed(0)}${discount > 0 ? `   (${discount}% OFF)` : ''}\n\n`,
      url: productLink,
    };

    // Include product image if available (very good for sharing)
    if (firstImage) {
      shareOptions.url = firstImage;
      shareOptions.message += `View full details: ${productLink}\n`;
      console.log("[SHARE DEBUG] Image included in share:", firstImage);
    } else {
      console.log("[SHARE DEBUG] No product image available for sharing");
    }

    // Optional: Force WhatsApp only (uncomment if needed)
    // shareOptions.social = Share.Social.WHATSAPP;

    try {
      console.log("[SHARE DEBUG] Opening native share sheet with options:", shareOptions);
      const result = await Share.open(shareOptions);

      console.log("[SHARE DEBUG] Share completed with result:", result);

      Toast.show({
        type: 'success',
        text1: 'Shared successfully! 🚀',
        position: 'bottom',
      });
    } catch (err: any) {
      console.error("[SHARE DEBUG] Share failed:", err);

      if (err?.message?.includes('canceled') || err?.message?.includes('dismissed')) {
        console.log("[SHARE DEBUG] User cancelled sharing");
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Could not share',
        text2: err?.message || 'Something went wrong',
      });
    }
  };

  const toggleWishlist = async () => {
    if (!product) return;

    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Toast.show({ type: 'error', text1: 'Please login to use wishlist' });
      return;
    }

    setWishlistLoading(true);

    try {
      if (isInWishlist && wishlistItemId) {
        const delRes = await fetch(`${BASE_URL}/api/wishlist/items/${wishlistItemId}/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!delRes.ok) throw new Error('Failed to remove from wishlist');

        setIsInWishlist(false);
        setWishlistItemId(null);
        Toast.show({ type: 'info', text1: 'Removed from Wishlist' });
      } else {
        const body = {
          product: product.id,
          variant: selectedVariant?.id || null,
        };

        const postRes = await fetch(`${BASE_URL}/api/wishlist/items/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!postRes.ok) {
          const errText = await postRes.text();
          throw new Error(`Wishlist add failed: ${errText}`);
        }

        const added = await postRes.json();
        setIsInWishlist(true);
        setWishlistItemId(added.id);
        Toast.show({ type: 'success', text1: 'Added to Wishlist' });
      }
    } catch (err: any) {
      console.error('[ERROR] Wishlist toggle error:', err);
      Toast.show({ type: 'error', text1: 'Failed to update wishlist' });
    } finally {
      setWishlistLoading(false);
    }
  };

  const availableColors = useMemo(() => {
    if (!Array.isArray(product?.variants)) return [];
    return [...new Set(
      product.variants
        .filter(v => v?.is_active && v?.quantity > 0 && v?.color?.name)
        .map(v => v.color!.name!)
    )];
  }, [product]);

  const availableSizesForColor = useMemo(() => {
    if (!selectedColor || !Array.isArray(product?.variants)) return [];
    return product.variants
      .filter(v =>
        v?.is_active &&
        v?.quantity > 0 &&
        v?.color?.name === selectedColor &&
        v?.size?.size
      )
      .map(v => v.size!.size!);
  }, [product, selectedColor]);

  const handleSelectColor = (colorName: string) => {
    setSelectedColor(colorName);
    setSelectedSize(null);
    setSelectedVariant(null);

    const first = product?.variants?.find(
      v => v?.color?.name === colorName && v?.is_active && v?.quantity > 0 && v?.size?.size
    );
    if (first) {
      setSelectedSize(first.size!.size!);
      setSelectedVariant(first);
    }

    if (product) {
      AsyncStorage.getItem('access_token').then(token => {
        if (token) checkWishlistStatus(token, product.id);
      });
    }
  };

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    const variant = product?.variants?.find(
      v =>
        v?.color?.name === selectedColor &&
        v?.size?.size === size &&
        v?.is_active &&
        v?.quantity > 0
    );
    setSelectedVariant(variant || null);

    if (product) {
      AsyncStorage.getItem('access_token').then(token => {
        if (token) checkWishlistStatus(token, product.id);
      });
    }
  };

  const currentPrice = selectedVariant?.price_override
    ? parseFloat(selectedVariant.price_override) || 0
    : parseFloat(product?.selling_price || '0');

  const originalPriceVal = parseFloat(product?.original_price || '0');
  const discount = originalPriceVal > currentPrice && originalPriceVal > 0
    ? Math.round(((originalPriceVal - currentPrice) / originalPriceVal) * 100)
    : 0;

  const inStock = selectedVariant
    ? (selectedVariant.quantity ?? 0) > 0
    : (product?.stock_quantity ?? 0) > 0;

  const addToCartApi = async () => {
    if (!product || !selectedVariant?.id) {
      Toast.show({ type: 'error', text1: 'Please select a valid variant' });
      return false;
    }

    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Toast.show({ type: 'error', text1: 'Please login to add to cart' });
      return false;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/cart/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: product.id,
          variant: selectedVariant.id,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to add to cart');
      }

      await response.json();
      return true;
    } catch (err: any) {
      console.error('[ERROR] Add to cart failed:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to add to cart',
        text2: 'Something went wrong',
      });
      return false;
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    const needsVariant = Array.isArray(product.variants) && product.variants.length > 0;
    if (needsVariant && (!selectedColor || !selectedSize)) {
      Toast.show({ type: 'error', text1: 'Please select color & size' });
      return;
    }

    if (!inStock) {
      Toast.show({ type: 'error', text1: 'Out of stock' });
      return;
    }

    setAddingToCart(true);
    const success = await addToCartApi();
    setAddingToCart(false);

    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: product.name || 'Item added successfully',
      });
    }
  };

 const handleBuyNow = async () => {
  if (!product || !selectedVariant?.id) {
    Toast.show({ type: 'error', text1: 'Please select color & size' });
    return;
  }

  if (!inStock) {
    Toast.show({ type: 'error', text1: 'Out of stock' });
    return;
  }

  const token = await AsyncStorage.getItem('access_token');
  if (!token) {
    Toast.show({ type: 'error', text1: 'Please login to continue' });
    navigation.navigate('Login');
    return;
  }

  try {
    // 1. Add item to cart first (backend usually requires cart → order flow)
    const addRes = await fetch(`${BASE_URL}/api/cart/items/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product: product.id,
        variant: selectedVariant.id,
        quantity: 1,
      }),
    });

    if (!addRes.ok) {
      const errText = await addRes.text();
      throw new Error(errText || 'Failed to prepare item for checkout');
    }

    // 2. Navigate directly to Checkout (we'll create this screen next)
    navigation.navigate('Checkout', {
      // optional: pass product info if you want to show quick preview
      fromBuyNow: true,
      productId: product.id,
      variantId: selectedVariant.id,
      quantity: 1,
    });

    Toast.show({
      type: 'success',
      text1: 'Proceeding to Checkout',
      text2: 'Fast checkout initiated',
    });
  } catch (err: any) {
    console.error('Buy Now prepare error:', err);
    Toast.show({
      type: 'error',
      text1: 'Could not proceed to checkout',
      text2:  'Please try again',
    });
  }
};

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B03385" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="error-outline" size={64} color="#ef4444" />
        <Text style={{ marginTop: 16, fontSize: 18, color: '#374151', textAlign: 'center' }}>
          {error || "Product not found"}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProduct}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(img => img?.image_url || img?.image).filter(Boolean) as string[]
    : ['https://via.placeholder.com/600?text=No+Image'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{'Product Details'}</Text> 

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleWishlist} disabled={wishlistLoading}>
            {wishlistLoading ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Icon
                name={isInWishlist ? "favorite" : "favorite-border"}
                size={26}
                color={isInWishlist ? "#ef4444" : "#000000"}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={shareProduct}>
            <Icon name="share" size={24} color="#000000" style={{ marginLeft: 20 }} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={styles.carousel}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: false,
            })}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.mainImage} resizeMode="contain" />
            )}
            keyExtractor={(_, i) => `img-${i}`}
          />
          <View style={styles.dotsContainer}>
            {images.map((_, i) => {
              const opacity = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              return <Animated.View key={i} style={[styles.dot, { opacity }]} />;
            })}
          </View>
        </View>

        {/* Price & Discount */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₹{currentPrice.toFixed(0)}</Text>
            {discount > 0 && (
              <>
                <Text style={styles.originalPrice}>₹{originalPriceVal.toFixed(0)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discount}% OFF</Text>
                </View>
              </>
            )}
          </View>
          {discount > 0 && (
            <Text style={styles.savings}>You save ₹{(originalPriceVal - currentPrice).toFixed(0)}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.productTitle}>{product.name || 'Unnamed Product'}</Text>

        {/* Condition & Stock */}
        <View style={styles.metaRow}>
          <Text style={styles.conditionText}>
            Condition: <Text style={{ fontWeight: '600' }}>{product.condition?.replace('_', ' ') || '—'}</Text>
          </Text>
          {inStock ? (
            <Text style={styles.stockText}>In Stock</Text>
          ) : (
            <Text style={[styles.stockText, { color: '#ef4444' }]}>Out of Stock</Text>
          )}
        </View>

        {/* Color Selection */}
        {availableColors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableColors.map(colorName => {
                const col = product.variants?.find(v => v?.color?.name === colorName)?.color;
                const selected = selectedColor === colorName;

                return (
                  <TouchableOpacity
                    key={colorName}
                    style={styles.colorOption}
                    onPress={() => handleSelectColor(colorName)}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: col?.hex_code || '#9ca3af' },
                        selected && styles.colorSelected,
                      ]}
                    >
                      {selected && <Icon name="check" size={18} color="#fff" />}
                    </View>
                    <Text style={[styles.colorLabel, selected && { color: "#B03385", fontWeight: '700' }]}>
                      {colorName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Size Selection */}
        {Array.isArray(product.variants) && product.variants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Size</Text>

            {selectedColor ? (
              availableSizesForColor.length > 0 ? (
                <View style={styles.sizeGrid}>
                  {availableSizesForColor.map(size => {
                    const isSelected = selectedSize === size;
                    const variantForSize = product.variants?.find(
                      v =>
                        v?.color?.name === selectedColor &&
                        v?.size?.size === size &&
                        v?.is_active
                    );
                    const available = (variantForSize?.quantity ?? 0) > 0;

                    return (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.sizeButton,
                          isSelected && styles.sizeSelected,
                          !available && !isSelected && styles.sizeUnavailable,
                        ]}
                        onPress={() => available && handleSelectSize(size)}
                        disabled={!available}
                      >
                        <Text
                          style={[
                            styles.sizeText,
                            isSelected && styles.sizeTextSelected,
                            !available && !isSelected && { color: '#94a3b8' },
                          ]}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No sizes available for this color</Text>
              )
            ) : (
              <Text style={styles.emptyText}>Select a color first</Text>
            )}

            {selectedVariant && selectedVariant.quantity > 0 && (
              <Text style={styles.stockInfo}>
                {selectedVariant.quantity} left in stock
              </Text>
            )}
          </View>
        )}

        {/* Trust Badges */}
        <View style={styles.trustContainer}>
          <View style={styles.trustBadge}>
            <Icon name="local-shipping" size={20} color="#16a34a" />
            <Text style={styles.trustText}>Free Delivery</Text>
          </View>
          <View style={styles.trustBadge}>
            <Icon name="payments" size={20} color="#B03385" />
            <Text style={styles.trustText}>COD Available</Text>
          </View>
          <View style={styles.trustBadge}>
            <Icon name="verified" size={20} color="#eab308" />
            <Text style={styles.trustText}>Verified Seller</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <Text
            style={styles.description}
            numberOfLines={showFullDesc ? undefined : 5}
          >
            {product.description || "No description available."}
          </Text>
          {product.description?.length > 150 && (
            <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)}>
              <Text style={styles.readMore}>
                {showFullDesc ? 'Read Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You may also like</Text>
            <FlatList
              horizontal
              data={similarProducts}
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.similarItem}
                  onPress={() => navigation.navigate('ProductDetail', { product: item })}
                >
                  <Image
                    source={{ uri: item.images?.[0]?.image_url || 'https://via.placeholder.com/140' }}
                    style={styles.similarImg}
                  />
                  <Text style={styles.similarName} numberOfLines={2}>
                    {item.name || 'Product'}
                  </Text>
                  <Text style={styles.similarPrice}>
                    ₹{parseFloat(item.selling_price || '0').toFixed(0)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      {/* Sticky Bottom Bar */}
     // ────────────────────────────────────────────────
{/* //                BOTTOM BAR (updated) */}
// ────────────────────────────────────────────────

<View style={[
  styles.bottomBar,
  { paddingBottom: 22 }
]}>
  <View style={styles.actionButtonsContainer}>
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.addToCartButton,
        (!inStock || addingToCart || !selectedVariant?.id) && styles.buttonDisabled
      ]}
      onPress={handleAddToCart}
      disabled={!inStock || addingToCart || !selectedVariant?.id}
    >
      {addingToCart ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Icon name="shopping-cart" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.buyNowButton,
        (!inStock || !selectedVariant?.id) && styles.buttonDisabled
      ]}
      onPress={handleBuyNow}
      disabled={!inStock || !selectedVariant?.id}
    >
      <Text style={styles.buyNowText}>Buy Now</Text>
    </TouchableOpacity>
  </View>
</View>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  carousel: { position: 'relative' },
  mainImage: { width, height: width * 1.12, backgroundColor: '#f9fafb' },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
    marginHorizontal: 4,
  },
  priceSection: { padding: 16, backgroundColor: '#fff' },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  currentPrice: { fontSize: 28, fontWeight: '800', color: '#111827' },
  originalPrice: {
    fontSize: 18,
    color: '#6b7280',
    textDecorationLine: 'line-through',
    marginLeft: 12,
  },
  discountBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  discountText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  savings: { color: '#16a34a', fontWeight: '600', marginTop: 6, fontSize: 15 },
  productTitle: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  conditionText: { fontSize: 15, color: '#475569' },
  stockText: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
  section: { padding: 16, borderTopWidth: 8, borderTopColor: '#f8fafc' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14, color: '#111827' },
  colorOption: { alignItems: 'center', marginRight: 24 },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: { borderColor: '#B03385', borderWidth: 3.5 },
  colorLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -8,
  },
  sizeButton: {
    minWidth: 44,
    paddingVertical: 14,
    paddingHorizontal: 20,
    margin: 8,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSelected: {
    backgroundColor: '#B03385',
    borderColor: '#B03385',
  },
  sizeUnavailable: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  sizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: 0.3,
  },
  sizeTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyText: { color: '#f87171', fontSize: 15, fontStyle: 'italic' },
  stockInfo: { marginTop: 12, color: '#16a34a', fontWeight: '600', fontSize: 14 },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  trustBadge: { alignItems: 'center' },
  trustText: { fontSize: 13, color: '#475569', marginTop: 6, fontWeight: '500' },
  description: { fontSize: 15, lineHeight: 24, color: '#4b5563' },
  readMore: { color: "#B03385", fontWeight: '700', marginTop: 10, fontSize: 15 },
  similarItem: { width: 140, marginRight: 16, alignItems: 'center' },
  similarImg: { width: 140, height: 140, borderRadius: 12, backgroundColor: '#f3f4f6' },
  similarName: { fontSize: 14, marginTop: 10, textAlign: 'center', color: '#111827' },
  similarPrice: { fontSize: 15, color: '#B03385', fontWeight: '700', marginTop: 4 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ffffff',
    elevation: 1,              // Android shadow
    shadowColor: '#000',        // iOS shadow
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },

  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // gap: 42,
    // justifyContent:'space'
    justifyContent:'space-around'

  },

  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B03385',     // slightly brighter violet
    borderRadius: 12,
    padding: 14,
    // minHeight: 44,
    marginRight:5,
    paddingHorizontal:4,
  },

  buyNowButton: {
    flex: 1.3,                   // Buy Now slightly wider (common pattern)
    backgroundColor: '#1a3571',   // dark charcoal black
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft:8,
    // minHeight: 44,
    // margin:5,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  addToCartText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  buyNowText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#B03385",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});