import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  selling_price: string;
  original_price?: string;
  images: Array<{ id: number; image_url?: string; image?: string }>;
  discount?: number;
  color?: string;
  size?: string;
}

interface WishlistStatus {
  inWishlist: boolean;
  itemId?: number;
  isToggling?: boolean;
}

const numColumns = 2;
const itemWidth = (SCREEN_WIDTH - 32) / numColumns;

const SkeletonCard = () => (
  <View style={styles.productCard}>
    <View style={[styles.productImage, { backgroundColor: '#f1f5f9' }]} />
    <View style={styles.info}>
      <View style={{ height: 16, backgroundColor: '#f1f5f9', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ height: 14, width: 80, backgroundColor: '#f1f5f9', borderRadius: 4 }} />
    </View>
  </View>
);

const ProductCard = memo(({ 
  item, 
  onPress,
  wishlistStatus = { inWishlist: false, isToggling: false },
  onToggleWishlist,
}: { 
  item: Product; 
  onPress: () => void;
  wishlistStatus?: WishlistStatus;
  onToggleWishlist: (product: Product) => void;
}) => {
  const discount = item.discount || 0;
  const imageUri = item.images?.[0]?.image_url || item.images?.[0]?.image || 'https://via.placeholder.com/400';

  const navigation = useNavigation<any>();

  const handleVirtualTryOn = (product: Product) => {
    navigation.navigate('VirtualTryOn', {
      garment: product,
      garmentImage: product.images?.[0]?.image_url || product.images?.[0]?.image || 'https://via.placeholder.com/400',
      garmentName: product.name
    });
  };

  return (
    <View 
      // activeOpacity={0.92}
      style={styles.productCard} 
      // onPress={onPres/s}
    >
      {/* Heart Icon - Wishlist */}
      <TouchableOpacity
        style={styles.heartContainer}
        onPress={() => onToggleWishlist(item)}
        disabled={wishlistStatus.isToggling}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        {wishlistStatus.isToggling ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon
            name={wishlistStatus.inWishlist ? 'favorite' : 'favorite-border'}
            size={18}
            color={wishlistStatus.inWishlist ? '#ef4444' : '#ffffff'}
            style={styles.heartShadow}
          />
        )}
      </TouchableOpacity>

      {/* AI Virtual Try-On Icon */}
      <TouchableOpacity
        style={styles.aiContainer}
        onPress={() => handleVirtualTryOn(item)}
      >
        <Text style={{ color: '#000', fontSize: 13, fontWeight: '600' }}>Try on</Text>
        <Icon
          name="auto-awesome"
          size={14}
          color="#000"
          style={styles.aiShadow}
        />
      </TouchableOpacity>

      <Image
        source={{ uri: imageUri }}
        style={styles.productImage}
        resizeMode="cover"
      />
    </View>
  );
});

export default function SearchResults() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { query, filters: initialFilters = {}, title, category, sectionId, preDefinedProducts } = route.params || {};

  const filters = {
    ...initialFilters,
    ...(category ? { category } : {}),
    ...(sectionId ? { sectionId } : {}),
  };

  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>(preDefinedProducts || []);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(preDefinedProducts || []);
  const [wishlistMap, setWishlistMap] = useState<Record<number, WishlistStatus>>({});
  const [loading, setLoading] = useState(!preDefinedProducts);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sort states
  const [sortVisible, setSortVisible] = useState(false);
  const sortAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
  const [selectedSort, setSelectedSort] = useState('Relevance');

  const sortOptions = [
    'Relevance',
    'Price: Low to High',
    'Price: High to Low',
    'Popularity',
    'Newest First',
    'by % Discount',
  ];

  // Filter states
  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
  const [selectedFilterTab, setSelectedFilterTab] = useState('Color');

  const filterTabs = ['Color', 'Size', 'Price'];

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  const colors = ['Red', 'Blue', 'Black', 'White', 'Green', 'Pink', 'Orange', 'Yellow', 'Purple', 'Grey'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const BASE_URL = 'https://api.feelvie.com';
  const WISHLIST_ENDPOINT = `${BASE_URL}/api/wishlist/items/`;

  const buildUrl = useCallback(() => {
    // If it's a category filter from home screen, we fetch all sections and filter in frontend
    if (filters?.category) {
      return `${BASE_URL}/api/common/sections/`;
    }

    if (filters?.sectionId || filters?.section) {
      return `${BASE_URL}/api/common/sections/${filters.sectionId || filters.section}/`;
    }

    const params = new URLSearchParams();

    if (query && !filters?.category) {
      params.append('search', query);
    }

    const queryString = params.toString();
    return queryString
      ? `${BASE_URL}/api/catalog/products/all/?${queryString}`
      : `${BASE_URL}/api/catalog/products/all/`;
  }, [filters?.section, filters?.category, query]);

  const fetchProducts = useCallback(async (isRefresh = false, nextPageUrl?: string) => {
    if (isRefresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setErrorMsg('Please login to view products');
        return;
      }

      const url = nextPageUrl || buildUrl();

      console.log('[SearchResults] Fetching:', url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} - ${text}`);
      }

      const data = await res.json();

      let fetched: any[] = [];

      if (filters?.category) {
        // Data is an array of sections, we filter sections that match the category name
        const categoryMatch = filters.category.toLowerCase();
        const allSections = Array.isArray(data) ? data : data.results || [];
        
        // Filter sections by section_type matching the category slug
        const matchingSections = allSections.filter((s: any) => 
          (s.section_type || "").toLowerCase() === categoryMatch
        );
        
        matchingSections.forEach((s: any) => {
          if (s.products) {
            fetched.push(...s.products.map((p: any) => p.product || p));
          }
        });
        
        // Remove duplicates if any
        fetched = Array.from(new Map(fetched.map(item => [item.id, item])).values());
      } else if (filters?.sectionId || filters?.section) {
        fetched = (data.products || []).map((sp: any) => sp.product || sp);
      } else {
        fetched = data.results || data || [];
      }

      const processed = fetched.map((p: any) => {
        const orig = parseFloat(p.original_price || '0');
        const sell = parseFloat(p.selling_price || '0');
        const discount = orig > sell && orig > 0 ? Math.round(((orig - sell) / orig) * 100) : 0;
        return { ...p, discount };
      });

      if (isRefresh) {
        setProducts(processed);
      } else {
        setProducts((prev) => [...prev, ...processed]);
      }

      setNextUrl(data.next || null);
      setHasMore(!!data.next);
      setErrorMsg(null);

      // Fetch wishlist status after products load
      if (processed.length > 0) {
        await fetchWishlistStatus(token, processed.map(p => p.id));
      }
    } catch (err: any) {
      console.error('[SearchResults Fetch Error]', err);
      setErrorMsg( 'Failed to load products');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
      setLoadingMore(false);
    }
  }, [buildUrl, filters?.sectionId, filters?.section, filters?.category, query]);

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
          const match = items.find((item: any) => item.product === id);
          newMap[id] = { inWishlist: !!match, itemId: match?.id };
        });

        setWishlistMap(prev => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.log('Wishlist status fetch failed', err);
    }
  };

  // Reset + initial fetch
  useEffect(() => {
    if (preDefinedProducts) {
      setProducts(preDefinedProducts);
      setFilteredProducts(preDefinedProducts);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setProducts([]);
    setFilteredProducts([]);
    setNextUrl(null);
    setHasMore(true);
    setErrorMsg(null);
    setRefreshing(true);

    const timer = setTimeout(() => {
      fetchProducts(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [query, filters?.category, filters?.section, fetchProducts, preDefinedProducts]);

  // Reset filters on new search
  useEffect(() => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setPriceRange([0, 10000]);
    setSelectedSort('Relevance');
  }, [query]);

  // Client-side filtering & sorting
  useEffect(() => {
    let result = [...products];

    const isAnyFilterActive =
      selectedColors.length > 0 ||
      selectedSizes.length > 0 ||
      priceRange[0] !== 0 ||
      priceRange[1] !== 10000 ||
      selectedSort !== 'Relevance';

    if (!isAnyFilterActive) {
      setFilteredProducts(products);
      return;
    }

    const [minP, maxP] = priceRange;
    result = result.filter((p) => {
      const price = parseFloat(p.selling_price) || 0;
      return price >= minP && (maxP === 10000 || price <= maxP);
    });

    if (selectedColors.length > 0) {
      result = result.filter((p: any) => selectedColors.includes(p.color || p.variant_color || ''));
    }

    if (selectedSizes.length > 0) {
      result = result.filter((p: any) => selectedSizes.includes(p.size || p.variant_size || ''));
    }

    if (selectedSort === 'Price: Low to High') {
      result.sort((a, b) => parseFloat(a.selling_price) - parseFloat(b.selling_price));
    } else if (selectedSort === 'Price: High to Low') {
      result.sort((a, b) => parseFloat(b.selling_price) - parseFloat(a.selling_price));
    } else if (selectedSort === 'by % Discount') {
      result.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    }

    setFilteredProducts(result);
  }, [products, selectedColors, selectedSizes, priceRange, selectedSort]);

  const toggleWishlist = async (product: Product) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      // Optional: show toast/login prompt
      return;
    }

    const current = wishlistMap[product.id] || { inWishlist: false };
    const willBeIn = !current.inWishlist;

    // Optimistic update
    setWishlistMap(prev => ({
      ...prev,
      [product.id]: { ...current, inWishlist: willBeIn, isToggling: true },
    }));

    try {
      if (current.inWishlist && current.itemId) {
        // Remove from wishlist
        await fetch(`${WISHLIST_ENDPOINT}${current.itemId}/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        setWishlistMap(prev => ({
          ...prev,
          [product.id]: { inWishlist: false, isToggling: false },
        }));
      } else {
        // Add to wishlist
        const res = await fetch(WISHLIST_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product: product.id }),
        });

        if (!res.ok) throw new Error('Add failed');

        const added = await res.json();

        setWishlistMap(prev => ({
          ...prev,
          [product.id]: {
            inWishlist: true,
            itemId: added.id,
            isToggling: false,
          },
        }));
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      // Rollback
      setWishlistMap(prev => ({
        ...prev,
        [product.id]: { ...current, isToggling: false },
      }));
      // Optional: show error toast
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setProducts([]);
    setFilteredProducts([]);
    setNextUrl(null);
    setHasMore(true);
    setErrorMsg(null);
    fetchProducts(true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && nextUrl) {
      fetchProducts(false, nextUrl);
    }
  };

  const openSort = () => {
    setSortVisible(true);
    Animated.spring(sortAnim, { toValue: 0, useNativeDriver: true }).start();
  };

  const closeSort = () => {
    Animated.spring(sortAnim, { toValue: SCREEN_HEIGHT, useNativeDriver: true }).start(() =>
      setSortVisible(false)
    );
  };

  const openFilter = () => {
    setFilterVisible(true);
    Animated.spring(filterAnim, { toValue: 0, useNativeDriver: true }).start();
  };

  const closeFilter = () => {
    Animated.spring(filterAnim, { toValue: SCREEN_HEIGHT, useNativeDriver: true }).start(() =>
      setFilterVisible(false)
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      item={item}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
      wishlistStatus={wishlistMap[item.id] || { inWishlist: false, isToggling: false }}
      onToggleWishlist={toggleWishlist}
    />
  );

  const getItemLayout = (_, index) => ({
    length: 280,
    offset: 280 * index,
    index,
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon name="arrow-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title || query || 'Products'}
        </Text>
        {/* <View style={styles.rightIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
            <Icon name="search" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MyWishList')} style={styles.iconButton}>
            <Icon name="favorite-border" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CartScreen')} style={styles.iconButton}>
            <Icon name="shopping-cart" size={24} color="#000" />
          </TouchableOpacity>
        </View> */}
      </View>

      {loading && !refreshing ? (
        <FlatList
          data={Array.from({ length: 6 })}
          numColumns={2}
          renderItem={() => <SkeletonCard />}
          keyExtractor={(_, i) => `skeleton-${i}`}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
        />
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 && !loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#B03385']} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#B03385" style={{ padding: 20 }} /> : null
          }
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* Bottom Bar */}
      {/* <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBtn} onPress={openSort}>
          <Icon name="sort" size={22} color="#000" />
          <Text style={styles.bottomBtnText}>Sort By</Text>
        </TouchableOpacity>
        <View style={styles.bottomDivider} />
        <TouchableOpacity style={styles.bottomBtn} onPress={openFilter}>
          <Icon name="filter-list" size={22} color="#000" />
          <Text style={styles.bottomBtnText}>Filter</Text>
        </TouchableOpacity>
      </View> */}

      {/* Sort Bottom Sheet */}
      <Modal transparent visible={sortVisible} animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeSort}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sortAnim }] }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sort By</Text>
              <TouchableOpacity onPress={closeSort}>
                <Icon name="close" size={26} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetContent}>
              {sortOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={styles.sortRow}
                  onPress={() => {
                    setSelectedSort(option);
                    closeSort();
                  }}
                >
                  <View style={styles.radioOuter}>
                    {selectedSort === option && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.sortText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Overlay */}
      <Modal transparent visible={filterVisible} animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeFilter}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: filterAnim }] }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter</Text>
              <TouchableOpacity onPress={closeFilter}>
                <Icon name="close" size={26} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterBody}>
              <View style={styles.leftSidebar}>
                {filterTabs.map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.sidebarItem,
                      selectedFilterTab === tab && styles.sidebarItemActive,
                    ]}
                    onPress={() => setSelectedFilterTab(tab)}
                  >
                    <Text style={[
                      styles.sidebarText,
                      selectedFilterTab === tab && styles.sidebarTextActive,
                    ]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.rightContent}>
                {selectedFilterTab === 'Color' && (
                  <View>
                    <Text style={styles.sectionTitle}>Colors</Text>
                    {colors.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={styles.checkboxRow}
                        onPress={() => {
                          setSelectedColors(prev =>
                            prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                          );
                        }}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedColors.includes(c) && styles.checkboxSelected,
                        ]}>
                          {selectedColors.includes(c) && <Icon name="check" size={16} color="#fff" />}
                        </View>
                        <Text style={styles.checkboxLabel}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedFilterTab === 'Size' && (
                  <View>
                    <Text style={styles.sectionTitle}>Sizes</Text>
                    {sizes.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={styles.checkboxRow}
                        onPress={() => {
                          setSelectedSizes(prev =>
                            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                          );
                        }}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedSizes.includes(s) && styles.checkboxSelected,
                        ]}>
                          {selectedSizes.includes(s) && <Icon name="check" size={16} color="#fff" />}
                        </View>
                        <Text style={styles.checkboxLabel}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedFilterTab === 'Price' && (
                  <View>
                    <Text style={styles.sectionTitle}>Price Range</Text>
                    <Text style={styles.priceLabel}>
                      ₹{Math.round(priceRange[0])} – ₹{Math.round(priceRange[1])}
                    </Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={10000}
                      step={100}
                      value={priceRange[1]}
                      onValueChange={(val) => setPriceRange([priceRange[0], val])}
                      minimumTrackTintColor="#B03385"
                      maximumTrackTintColor="#ddd"
                      thumbTintColor="#B03385"
                    />
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={priceRange[1]}
                      step={100}
                      value={priceRange[0]}
                      onValueChange={(val) => setPriceRange([val, priceRange[1]])}
                      minimumTrackTintColor="#B03385"
                      maximumTrackTintColor="#ddd"
                      thumbTintColor="#B03385"
                    />
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={closeFilter}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={closeFilter}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginHorizontal: 16,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  listContent: { padding: 6 },
  row: { justifyContent: 'space-between' },
  productCard: {
    width: itemWidth,
    height: 280,
    marginBottom: 16,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
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

  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
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

  info: {
    display: 'none',
  },

  name: {
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

  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    height: 70,
    paddingBottom:10,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bottomBtnText: { fontSize: 14, fontWeight: '600' },
  bottomDivider: { width: 1, backgroundColor: '#eee' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 1.6,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetContent: { padding: 16 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B03385',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#B03385',
  },
  sortText: { fontSize: 16 },

  filterBody: { flex: 1, flexDirection: 'row' },
  leftSidebar: { width: 120, backgroundColor: '#f8f9fa' },
  sidebarItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sidebarItemActive: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#B03385' },
  sidebarText: { fontSize: 15, color: '#555' },
  sidebarTextActive: { color: '#B03385', fontWeight: '600' },
  rightContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#B03385',
    marginRight: 12,
  },
  checkboxSelected: { backgroundColor: '#B03385' },
  slider: { width: '100%', height: 40 },

  filterFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeBtn: { flex: 1, alignItems: 'center', padding: 14 },
  applyBtn: { flex: 1, backgroundColor: '#B03385', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 20, color: '#666' },
  errorText: { textAlign: 'center', marginTop: 50, color: '#ef4444' },
  noResults: { textAlign: 'center', marginTop: 50, color: '#666' },
});