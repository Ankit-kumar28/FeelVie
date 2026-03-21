// src/screens/marketplace/MarketplaceScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 3) / 2;
const IMAGE_ASPECT_RATIO = 1.12;

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
  color?: string;
  size?: string;
}

interface WishlistStatus {
  inWishlist: boolean;
  itemId?: number;
  isToggling?: boolean;
}

export default function MarketplaceScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Record<number, WishlistStatus>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sortVisible, setSortVisible] = useState(false);
  const sortAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
  const [selectedSort, setSelectedSort] = useState('Relevance');

  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
  const [selectedFilterTab, setSelectedFilterTab] = useState('Color');

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  const sortOptions = [
    'Relevance',
    'Price: Low to High',
    'Price: High to Low',
    'Popularity',
    'Newest First',
    'by % Discount',
  ];

  const filterTabs = ['Color', 'Size', 'Price'];

  const colors = ['Red', 'Blue', 'Black', 'White', 'Green', 'Pink', 'Orange', 'Yellow', 'Purple', 'Grey'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const BASE_URL = 'https://feelvie.yaytech.in';
  const PRODUCTS_ENDPOINT = `${BASE_URL}/api/catalog/products/`;
  const WISHLIST_ENDPOINT = `${BASE_URL}/api/wishlist/items/`;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setErrorMessage('Please login to view marketplace');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(PRODUCTS_ENDPOINT, { headers });

      if (!res.ok) {
        setErrorMessage('Failed to load products');
        return;
      }

      const data = await res.json();
      const rawProducts = Array.isArray(data) ? data : data.results || [];

      const processed = rawProducts.map((p: any) => {
        const orig = parseFloat(p.original_price || '0');
        const sell = parseFloat(p.selling_price || '0');
        const discount = orig > sell && orig > 0 ? Math.round(((orig - sell) / orig) * 100) : 0;
        return { ...p, discount, images: p.images || [] };
      });

      setProducts(processed);

      if (processed.length > 0) {
        await fetchWishlistStatus(token, processed.map(p => p.id));
      }
    } catch (err) {
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
          const match = items.find((item: any) => item.product === id);
          newMap[id] = { inWishlist: !!match, itemId: match?.id };
        });

        setWishlistMap(prev => ({ ...prev, ...newMap }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let result = [...products];

    const [minPrice, maxPrice] = priceRange;
    result = result.filter(p => {
      const price = parseFloat(p.selling_price) || 0;
      return price >= minPrice && price <= maxPrice;
    });

    if (selectedColors.length > 0) {
      result = result.filter(p => selectedColors.includes(p.color || ''));
    }

    if (selectedSizes.length > 0) {
      result = result.filter(p => selectedSizes.includes(p.size || ''));
    }

    if (selectedSort === 'Price: Low to High') {
      result.sort((a, b) => parseFloat(a.selling_price) - parseFloat(b.selling_price));
    } else if (selectedSort === 'Price: High to Low') {
      result.sort((a, b) => parseFloat(b.selling_price) - parseFloat(a.selling_price));
    } else if (selectedSort === 'by % Discount') {
      result.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    }

    setFilteredProducts(result);
  }, [products, selectedSort, selectedColors, selectedSizes, priceRange]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const getProductImage = (product: Product) => {
    const img = product.images?.[0];
    return img?.image_url || img?.image || 'https://via.placeholder.com/400x450?text=No+Image';
  };

  const toggleWishlist = async (product: Product) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;

    const current = wishlistMap[product.id] || { inWishlist: false };
    const willBeIn = !current.inWishlist;

    setWishlistMap(prev => ({
      ...prev,
      [product.id]: { ...current, inWishlist: willBeIn, isToggling: true },
    }));

    try {
      if (current.inWishlist && current.itemId) {
        await fetch(`${WISHLIST_ENDPOINT}${current.itemId}/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setWishlistMap(prev => ({
          ...prev,
          [product.id]: { inWishlist: false, isToggling: false },
        }));
      } else {
        const res = await fetch(WISHLIST_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product: product.id }),
        });

        if (!res.ok) throw new Error();

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
    } catch {
      setWishlistMap(prev => ({
        ...prev,
        [product.id]: { ...current, isToggling: false },
      }));
    }
  };

  const openSort = () => {
    setSortVisible(true);
    Animated.spring(sortAnim, { toValue: 0, useNativeDriver: true }).start();
  };

  const closeSort = () => {
    // Animated.spring(sortAnim, { toValue: SCREEN_HEIGHT, useNativeDriver: true }).start(() =>
    //   setSortVisible(false)
    // );
    setSortVisible(false);
  };

  const openFilter = () => {
    setFilterVisible(true);
    Animated.spring(filterAnim, { toValue: 0, useNativeDriver: true }).start();
  };

  const closeFilter = () => {
    // Animated.spring(filterAnim, { toValue: SCREEN_HEIGHT, useNativeDriver: true }).start(() =>
    //   setFilterVisible(false)
    // );
    setFilterVisible(false)
  };

  const clearAllFilters = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setPriceRange([0, 10000]);
    setSelectedSort('Relevance');
    closeFilter();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#B03385" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const headerHeight = insets.top + 52; // top padding + header height

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Marketplace</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
            <Icon name="search" size={24} color="#111" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('MyWishList')} style={styles.iconBtn}>
            <Icon name="favorite-border" size={24} color="#111" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('CartScreen')} style={styles.iconBtn}>
            <Icon name="shopping-cart" size={24} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.sortFilterBar, { top: headerHeight }]}>
        <TouchableOpacity style={styles.barButton} onPress={openSort}>
          <Icon name="sort" size={20} color="#333" />
          <Text style={styles.barText}>Sort</Text>
        </TouchableOpacity>

        <View style={styles.barDivider} />

        <TouchableOpacity style={styles.barButton} onPress={openFilter}>
          <Icon name="filter-list" size={20} color="#333" />
          <Text style={styles.barText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts.length > 0 ? filteredProducts : products}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.productsList, { paddingTop: 60 }]}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <Text style={styles.emptyText}>No products found</Text>
          )
        }
        renderItem={({ item }) => {
          const status = wishlistMap[item.id] || { inWishlist: false, isToggling: false };

          return (
            <TouchableOpacity
              style={styles.productCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: getProductImage(item) }}
                  style={styles.productImage}
                  resizeMode="cover"
                />

                {/* {item.discount && item.discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{item.discount}% OFF</Text>
                  </View>
                )} */}

                <TouchableOpacity
                  style={styles.heartContainer}
                  onPress={() => toggleWishlist(item)}
                  disabled={status.isToggling}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
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
                    <Text style={styles.discountInRow}>{item.discount}% OFF</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Sort Modal */}
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

      {/* Filter Modal */}
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
                    <Text
                      style={[
                        styles.sidebarText,
                        selectedFilterTab === tab && styles.sidebarTextActive,
                      ]}
                    >
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
                        <View
                          style={[
                            styles.checkbox,
                            selectedColors.includes(c) && styles.checkboxSelected,
                          ]}
                        >
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
                        <View
                          style={[
                            styles.checkbox,
                            selectedSizes.includes(s) && styles.checkboxSelected,
                          ]}
                        >
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
                      onValueChange={val => setPriceRange([priceRange[0], val])}
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
                      onValueChange={val => setPriceRange([val, priceRange[1]])}
                      minimumTrackTintColor="#B03385"
                      maximumTrackTintColor="#ddd"
                      thumbTintColor="#B03385"
                    />
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearAllFilters}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B03385',
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  iconBtn: { padding: 4 },

  sortFilterBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    position: 'absolute',
    left: 0,
    right: 0,
    height: 48,
    zIndex: 9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },

  barButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  barText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  barDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
  },

  productsList: {
    paddingHorizontal: CARD_MARGIN,
    paddingBottom: 78,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  productCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#b5b3b3',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },

  heartShadow: {
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },

  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },

  discountText: {
    color: 'white',
    fontSize: 11.5,
    fontWeight: '700',
  },

  productInfo: {
    padding: 10,
    paddingTop: 8,
  },

  productName: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 19,
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

  discountInRow: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#16a34ac3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  errorText: {
    textAlign: 'center',
    padding: 40,
    color: '#dc2626',
    fontSize: 16,
  },

  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
    fontSize: 16,
  },

  // Modal styles (unchanged)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
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

  filterBody: { flexDirection: 'row', flex: 1 },
  leftSidebar: { width: 120, backgroundColor: '#f8f9fa' },
  sidebarItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sidebarItemActive: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#B03385' },
  sidebarText: { fontSize: 15, color: '#555' },
  sidebarTextActive: { color: '#B03385', fontWeight: '600' },
  rightContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#B03385', marginRight: 12 },
  checkboxSelected: { backgroundColor: '#B03385' },
  checkboxLabel: { fontSize: 15 },
  priceLabel: { fontSize: 16, marginBottom: 16, textAlign: 'center', fontWeight: '500' },
  slider: { width: '100%', height: 40 },

  filterFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clearBtn: { flex: 1, alignItems: 'center', padding: 14 },
  clearText: { color: '#B03385', fontWeight: '600' },
  closeBtn: { flex: 1, alignItems: 'center', padding: 14 },
  closeText: { color: '#666', fontWeight: '600' },
  applyBtn: {
    flex: 1,
    backgroundColor: '#B03385',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontWeight: '600' },
});