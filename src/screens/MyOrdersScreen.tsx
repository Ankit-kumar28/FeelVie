import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.feelvie.com';

interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  // add other fields if needed
}

interface Order {
  id: number;
  status: string;
  total: string;
  created_at: string;
  items: OrderItem[];
}

export default function MyOrdersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [productImages, setProductImages] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const res = await fetch(`${BASE_URL}/api/orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) navigation.navigate('Login');
        throw new Error('Failed to fetch orders');
      }

      const data = await res.json();
      const orderList = Array.isArray(data) ? data : data.results || [];
      // Sort by newest first (common in order lists)
      const sorted = orderList.sort(
        (a: Order, b: Order) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sorted);

      // Optional: Load first product image for each order (visual cue)
      const imageMap: Record<number, string> = { ...productImages };

      for (const order of sorted) {
        if (order.items?.length > 0) {
          const firstProductId = order.items[0].product;
          if (!imageMap[firstProductId]) {
            try {
              const prodRes = await fetch(
                `${BASE_URL}/api/catalog/products/${firstProductId}/`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (prodRes.ok) {
                const prod = await prodRes.json();
                const img =
                  prod.images?.[0]?.image_url ||
                  prod.images?.[0]?.image ||
                  `https://via.placeholder.com/80?text=${firstProductId}`;
                imageMap[firstProductId] = img;
              }
            } catch (e) {
              console.log('Image fetch failed for product', firstProductId);
            }
          }
        }
      }

      setProductImages(imageMap);
    } catch (err) {
      console.error('MyOrders fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToOrderDetails = (orderId: number) => {
    console.log('[MyOrders] Navigating to OrderDetails with orderId:', orderId);
    navigation.navigate('OrderDetails', { orderId });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return '#16A34A';
    if (s.includes('shipped')) return '#111111';
    if (s.includes('confirmed') || s.includes('processing')) return '#f8ac1b';
    if (s.includes('cancel')) return '#EF4444';
    return '#666666'; // pending/placed/default
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
  const firstItem = item.items?.[0];
  const imageUri = firstItem
    ? productImages[firstItem.product] ||
      `https://via.placeholder.com/80?text=Item`
    : 'https://via.placeholder.com/80?text=No+Image';

  const firstProductName = firstItem?.product_name || 'Multiple items';

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.85}
      onPress={() => goToOrderDetails(item.id)}
    >
      {/* Left: Product Image */}
      <Image
        source={{ uri: imageUri }}
        style={styles.productImage}
        resizeMode="cover"
      />

      {/* Middle: Main Info */}
      <View style={styles.orderMainInfo}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        
        {/* ← Added: First item name */}
        <Text style={styles.firstItemName} numberOfLines={2}>
          {firstProductName}
        </Text>

        <Text style={styles.orderStatus} numberOfLines={1}>
          {item.status}
        </Text>
      </View>

      {/* Right: Date (top corner) + Amount + Arrow */}
      <View style={styles.rightColumn}>
        <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>

        <View style={styles.amountRow}>
          <Text style={styles.amount}>₹{parseFloat(item.total).toFixed(0)}</Text>
          <Icon name="chevron-right" size={24} color="#AAAAAA" style={{ marginLeft: 8 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f8ac1b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Optional: Add header if your app doesn't have one from navigator */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant-closed" size={80} color="#E8E8E8" />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubText}>
              When you place an order, it will appear here
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 19,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#f8ac1b',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: {
    // padding: 12,
    paddingBottom: 80,
  },

  orderCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    // borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    padding: 12,
    // marginBottom: 12,
    // elevation: 2,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    marginRight: 12,
  },

  orderMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  orderId: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#f8ac1b',
  },

  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 100,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#f8ac1b',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#444444',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 8,
  },
});