// src/screens/SampleOutfitScreen.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import productData from '../utils/product.json';
import { BASE_URL } from '../config/env';

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

const PRODUCTS_API = `${BASE_URL}/api/json/products/`;

const FALLBACK_CATEGORIES = productData.categories as Category[];

/** Accepts either `data: [...]` or `data: { categories: [...] }` */
const extractCategories = (data: any): Category[] => {
  if (Array.isArray(data)) return data as Category[];
  if (Array.isArray(data?.categories)) return data.categories as Category[];
  return [];
};

export default function SampleOutfitScreen() {
  const navigation = useNavigation<any>();

  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    FALLBACK_CATEGORIES[0]?.id
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedCategory =
    categories.find(c => c.id === selectedCategoryId) ?? categories[0];

  const loadCategories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(PRODUCTS_API, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      const remote = extractCategories(json?.data);

      // Empty (or unusable) response → keep the bundled product.json
      const next = remote.length > 0 ? remote : FALLBACK_CATEGORIES;
      setCategories(next);
      setSelectedCategoryId(next[0]?.id);
    } catch (err) {
      console.log('[SampleOutfit] products fetch failed, using local data:', err);
      setCategories(FALLBACK_CATEGORIES);
      setSelectedCategoryId(FALLBACK_CATEGORIES[0]?.id);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Animated values are created lazily so they work for remote categories too
  const scaleAnims = useRef<Record<number, Animated.Value>>({}).current;

  const getScaleAnim = (id: number) => {
    if (!scaleAnims[id]) scaleAnims[id] = new Animated.Value(1);
    return scaleAnims[id];
  };

  const animateSubcategory = (id: number) => {
    const anim = getScaleAnim(id);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Sample Outfits</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111111" />
        </View>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCategories(true)}
            tintColor="#f8ac1b"
          />
        }
      >
        {/* Categories */}
        <View style={styles.categoriesContainer}>
          {categories.map((category: any, index: number) => (
            <TouchableOpacity
              key={category.id ?? index}
              style={[
                styles.categoryItem,
                selectedCategory?.id === category.id && styles.activeCategoryItem
              ]}
              onPress={() => setSelectedCategoryId(category.id)}
            >
              <View style={[
                styles.categoryIconBox,
                selectedCategory?.id === category.id && styles.activeCategoryIconBox
              ]}>
                {typeof category.icon === 'string' && category.icon.startsWith('http') ? (
                  <Image source={{ uri: category.icon }} style={styles.categoryIcon} />
                ) : (
                  <Text style={{ fontSize: 24 }}>{category.icon}</Text>
                )}
              </View>
              <Text style={[
                styles.categoryText,
                selectedCategory?.id === category.id && styles.activeCategoryText
              ]}>{category.categoryName}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subcategories (List View) */}
        <View style={styles.subCategoriesContainer}>
          <Text style={styles.sectionTitle}>{selectedCategory?.categoryName} Sample Garments</Text>
          <View style={{ paddingHorizontal: 16 }}>
            {(selectedCategory?.subcategories ?? []).map((sub: Subcategory) => (
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
                  { transform: [{ scale: getScaleAnim(sub.id) }] }
                ]}>
                  <Text style={styles.subCategoryListText}>{sub.subcategoryName}</Text>
                  <Icon name="chevron-right" size={24} color="#AAAAAA" />
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
  subCategoryListText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
  },
});
