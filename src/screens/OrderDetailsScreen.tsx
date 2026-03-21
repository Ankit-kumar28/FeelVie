import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://feelvie.yaytech.in';

interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  variant: number;
  variant_name?: string;
  quantity: number;
  price_snapshot: string;
}

interface Order {
  id: number;
  status: string;
  payment_status: string;
  total: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  // Debug: Print full params
  console.log('[OrderDetails] Full route.params:', JSON.stringify(route.params, null, 2));

  // Safely extract orderId (support multiple common patterns)
  const orderId =
    route.params?.orderId ||
    route.params?.order?.id ||
    route.params?.id ||
    route.params?.order_id;

  console.log('[OrderDetails] Extracted orderId:', orderId);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [productImages, setProductImages] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) {
      console.error('[OrderDetails] Invalid or missing orderId:', orderId);
      setLoading(false);
      return;
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const res = await fetch(`${BASE_URL}/api/orders/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigation.navigate('Login');
        }
        throw new Error(`Failed to load order - status ${res.status}`);
      }

      const data = await res.json();
      console.log('[OrderDetails] Order data loaded:', data.id);
      setOrder(data);

      // Fetch product images
      const uniqueProductIds = new Set<number>();
      data.items.forEach((item: OrderItem) => uniqueProductIds.add(item.product));

      const imagePromises = Array.from(uniqueProductIds).map(async (pid) => {
        try {
          const prodRes = await fetch(`${BASE_URL}/api/catalog/products/${pid}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (prodRes.ok) {
            const prod = await prodRes.json();
            const img = prod.images?.[0]?.image_url || prod.images?.[0]?.image || '';
            return { pid, img };
          }
        } catch (e) {
          console.log(`[OrderDetails] Failed to load image for product ${pid}`);
        }
        return { pid, img: '' };
      });

      const results = await Promise.all(imagePromises);
      const imageMap: Record<number, string> = {};
      results.forEach(({ pid, img }) => {
        if (img) imageMap[pid] = img;
      });
      setProductImages(imageMap);
    } catch (err) {
      console.error('[OrderDetails] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return { color: '#10b981', label: 'Delivered', bg: '#ecfdf5' };
    if (s.includes('shipped')) return { color: '#3b82f6', label: 'Shipped', bg: '#eff6ff' };
    if (s.includes('confirmed')) return { color: '#f59e0b', label: 'Confirmed', bg: '#fffbeb' };
    if (s.includes('placed') || s.includes('pending'))
      return { color: '#64748b', label: 'Placed', bg: '#f3f4f6' };
    if (s.includes('cancel')) return { color: '#ef4444', label: 'Cancelled', bg: '#fee2e2' };
    return { color: '#6b7280', label: status.charAt(0).toUpperCase() + status.slice(1), bg: '#f3f4f6' };
  };

  const openProductDetail = (productId: number) => {
    navigation.navigate('ProductDetail', {
      product: { id: productId },
    });
  };

  // ─── UI RENDERING ───

  if (!orderId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Invalid Order</Text>
          <Text style={{ marginTop: 8, color: '#666', textAlign: 'center' }}>
            No order ID received. Please try again from My Orders.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B03385" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Order Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStatusInfo(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.orderSummaryCard}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.orderDate}>Placed on {formatDate(order.created_at)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={styles.paymentInfo}>
              Payment: <Text style={{ fontWeight: '600' }}>{order.payment_status}</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>

        {order.items.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => openProductDetail(item.product)}
            style={styles.itemRow}
          >
            <Image
              source={{
                uri: productImages[item.product] || 'https://via.placeholder.com/90',
              }}
              style={styles.itemImage}
              resizeMode="contain"
            />

            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product_name}
                {item.variant_name ? ` (${item.variant_name})` : ''}
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.itemPrice}>₹{parseFloat(item.price_snapshot).toFixed(0)}</Text>
                <Text style={styles.itemQty}> × {item.quantity}</Text>
              </View>

              <Text style={styles.itemTotal}>
                Item total: ₹{(parseFloat(item.price_snapshot) * item.quantity).toFixed(0)}
              </Text>
            </View>

            <Icon name="chevron-right" size={26} color="#444" />
          </TouchableOpacity>
        ))}

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.grandTotal}>₹{parseFloat(order.total).toFixed(0)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  scrollContent: { paddingBottom: 40 },
  orderSummaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  orderDate: { fontSize: 14, color: '#555', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  statusTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  paymentInfo: { fontSize: 14, color: '#444' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginLeft: 16, marginTop: 16, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#f8f9fa' },
  itemInfo: { flex: 1, marginLeft: 16, marginRight: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#111', lineHeight: 22, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#B03385' },
  itemQty: { fontSize: 14, color: '#555', marginLeft: 4 },
  itemTotal: { fontSize: 13, color: '#777', marginTop: 2 },
  totalCard: { backgroundColor: '#fff', margin: 12, marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 17, fontWeight: '600', color: '#222' },
  grandTotal: { fontSize: 18, fontWeight: 'bold', color: '#B03385' },
});