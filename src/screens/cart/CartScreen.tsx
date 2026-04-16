import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from "react-native-toast-message";
import RazorpayCheckout from 'react-native-razorpay';
import { BASE_URL } from '../../config/env';

const { width } = Dimensions.get('window');
// const BASE_URL = 'https://feelvie.yaytech.in';

type ModalType = 'success' | 'error' | 'warning' | 'info';

interface CustomModalProps {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface CartApiItem {
  id: number;
  product: number;
  variant: number;
  quantity: number;
  price_snapshot: string;
  created_at: string;
  updated_at: string;
}

interface VariantDetail {
  id: number;
  color?: { id: number; name: string; hex_code?: string };
  size?: { id: number; size: string; size_display?: string };
  sku?: string;
  quantity: number;
  price_override?: string;
  is_active: boolean;
}

interface ProductDetail {
  id: number;
  name: string;
  original_price?: string;
  selling_price: string;
  condition?: string;
  images?: { id: number; image_url?: string; image?: string }[];
  variants?: VariantDetail[];
}

interface DisplayCartItem {
  cartId: number;
  productId: number;
  variantId: number;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  originalPrice?: number;
  condition?: string;
}

interface Address {
  id: number;
  name?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  is_default?: boolean;
  created_at: string;
}

function CustomModal({
  visible,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText,
}: CustomModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success': return <Icon name="check-circle" size={64} color="#10b981" />;
      case 'error': return <Icon name="alert-circle" size={64} color="#ef4444" />;
      case 'warning': return <Icon name="alert" size={64} color="#f59e0b" />;
      default: return <Icon name="information" size={64} color="#3b82f6" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalIconContainer}>{getIcon()}</View>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalButtons}>
            {cancelText && (
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: getButtonColor() }]}
              onPress={() => { onClose(); onConfirm?.(); }}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CartScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [displayItems, setDisplayItems] = useState<DisplayCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ type: 'info', title: '', message: '' });

  const showModal = (
    type: ModalType,
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setModalConfig({ type, title, message, onConfirm, confirmText, cancelText });
    setModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      setStep(1);
      setPaymentMethod(null);
      setSelectedAddress(null);
      fetchAndEnrichCart();
    }, [])
  );

  const fetchAndEnrichCart = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        showModal('warning', 'Login Required', 'Please login to view your cart.', () => navigation.navigate('Login'));
        setDisplayItems([]);
        return;
      }

      const cartRes = await fetch(`${BASE_URL}/api/cart/items/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!cartRes.ok) {
        if (cartRes.status === 401) {
          showModal('warning', 'Session Expired', 'Please login again.', () => navigation.navigate('Login'));
        }
        throw new Error('Failed to fetch cart');
      }

      const cartData = await cartRes.json();
      const rawItems: CartApiItem[] = Array.isArray(cartData) ? cartData : cartData.results || [];

      if (rawItems.length === 0) {
        setDisplayItems([]);
        setLoading(false);
        return;
      }

      const productPromises = rawItems.map(async (item) => {
        try {
          const prodRes = await fetch(`${BASE_URL}/api/catalog/products/${item.product}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!prodRes.ok) return null;

          const prod: ProductDetail = await prodRes.json();
          const variant = prod.variants?.find(v => v.id === item.variant);

          return {
            cartId: item.id,
            productId: item.product,
            variantId: item.variant,
            quantity: item.quantity,
            price: parseFloat(item.price_snapshot) || 0,
            name: prod.name || 'Product',
            image: prod.images?.[0]?.image_url || prod.images?.[0]?.image || '',
            color: variant?.color?.name || undefined,
            colorHex: variant?.color?.hex_code || undefined,
            size: variant?.size?.size || variant?.size?.size_display || undefined,
            originalPrice: prod.original_price ? parseFloat(prod.original_price) : undefined,
            condition: prod.condition || 'New',
          };
        } catch (err) {
          console.warn(`Failed to fetch product ${item.product}:`, err);
          return null;
        }
      });

      const enriched = (await Promise.all(productPromises)).filter(Boolean) as DisplayCartItem[];
      setDisplayItems(enriched);
    } catch (err) {
      console.error('Cart enrich error:', err);
      Toast.show({ type: 'error', text1: 'Failed to load cart details' });
      setDisplayItems([]);
    } finally {
      setLoading(false);
    }
  };

  const clearCartOnServer = async (token: string): Promise<boolean> => {
    try {
      const listRes = await fetch(`${BASE_URL}/api/cart/items/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!listRes.ok) return false;

      const items = await listRes.json();
      const cartItems = Array.isArray(items) ? items : items.results || [];

      if (cartItems.length === 0) return true;

      const deletePromises = cartItems.map(async (item: { id: number }) => {
        const deleteRes = await fetch(`${BASE_URL}/api/cart/items/${item.id}/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        return deleteRes.ok;
      });

      const results = await Promise.all(deletePromises);
      return results.every(success => success);
    } catch (err) {
      console.error('Cart clear error:', err);
      return false;
    }
  };

  const showOrderSuccessAndNavigate = (orderId: number | string) => {
    showModal(
      'success',
      'Order Placed Successfully!',
      `Your order #${orderId} has been placed.\n\nThank you for shopping with us!`,
      () => {
        setDisplayItems([]);
        setStep(1);
        setPaymentMethod(null);
        setSelectedAddress(null);
        navigation.navigate('Home');
      },
      'Continue Shopping'
    );
  };

  const fetchAddresses = async () => {
    setLoadingAddress(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/auth/addresses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: Address[] = await res.json();
        const sorted = data.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSavedAddresses(sorted);
        if (sorted.length > 0) {
          setSelectedAddress(sorted[0]);
        } else {
          setSelectedAddress(null);
        }
      }
    } catch (err) {
      console.error('Addresses fetch error:', err);
    } finally {
      setLoadingAddress(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (step === 1) await fetchAndEnrichCart();
      if (step === 2) await fetchAddresses();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Refresh failed' });
    } finally {
      setRefreshing(false);
    }
  }, [step]);

  useEffect(() => {
    if (step === 2) fetchAddresses();
  }, [step]);

  const removeFromCart = async (cartId: number) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/api/cart/items/${cartId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to remove');

      setDisplayItems(prev => prev.filter(item => item.cartId !== cartId));
      Toast.show({ type: 'success', text1: 'Item removed' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to remove item' });
    }
  };

  const updateQuantity = async (cartId: number, newQty: number) => {
    if (newQty < 1) return;

    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/api/cart/items/${cartId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: newQty }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setDisplayItems(prev =>
        prev.map(item =>
          item.cartId === cartId ? { ...item, quantity: newQty } : item
        )
      );
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to update quantity' });
    }
  };

  const placeOrder = async () => {
    if (!selectedAddress) {
      showModal('warning', 'No Address', 'Please select or add a delivery address.');
      return;
    }

    if (!paymentMethod) {
      showModal('warning', 'No Payment Method', 'Please select a payment method.');
      return;
    }

    setSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Please login');

      const userRes = await fetch(`${BASE_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Failed to fetch user');

      const userData = await userRes.json();

      const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Customer';
      const phone = userData.phone || '9999999999';
      const email = userData.email || '';

      const itemsPayload = displayItems.map(item => ({
        product: item.productId,
        variant: item.variantId,
        quantity: item.quantity,
      }));

      const orderPayload = {
        shipping_fee: deliveryCharge.toString(),
        currency: "INR",
        customer_note: "",
        shipping_name: fullName,
        shipping_phone: phone,
        shipping_line1: selectedAddress.line1 || '',
        shipping_line2: selectedAddress.line2 || '',
        shipping_city: selectedAddress.city || '',
        shipping_state: selectedAddress.state || '',
        shipping_postal_code: selectedAddress.postal_code || '',
        shipping_country: selectedAddress.country || 'India',
        items: itemsPayload,
        payment_method: paymentMethod,
      };

      const createOrderRes = await fetch(`${BASE_URL}/api/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!createOrderRes.ok) {
        const errText = await createOrderRes.text();
        throw new Error(errText || 'Failed to create order');
      }

      const createdOrder = await createOrderRes.json();
      const orderId = createdOrder.id;

      // Clear cart right after order creation (safe for both COD & online)
      const cleared = await clearCartOnServer(token);
      if (!cleared) {
        console.warn('Cart clear partially failed after order creation');
      }

      if (paymentMethod === 'cod') {
        showOrderSuccessAndNavigate(orderId);
        setSubmitting(false);
        return;
      }

      // ────────────────────────────────
      //        ONLINE PAYMENT FLOW
      // ────────────────────────────────

      const makePaymentRes = await fetch(`${BASE_URL}/api/secure/make-payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!makePaymentRes.ok) throw new Error('Failed to initialize payment');

      const paymentData = await makePaymentRes.json();

      const {
        razorpay_order_id,
        razorpay_key_id,
        amount,
        currency,
      } = paymentData;

      const options = {
        description: `Order #${orderId}`,
        currency: currency || 'INR',
        key: razorpay_key_id,
        amount: amount.toString(),
        order_id: razorpay_order_id,
        name: 'Feelvie',
        prefill: { email, contact: phone, name: fullName },
        theme: { color: '#B03385' },
        modal: {
          ondismiss: () => {
            console.log('[RAZORPAY] Checkout modal dismissed / cancelled');
            Toast.show({
              type: 'info',
              text1: 'Payment Cancelled',
              text2: 'No amount was deducted. You can try again.',
            });
          },
        },
      };

      let razorpayResponse;
      try {
        razorpayResponse = await RazorpayCheckout.open(options);
      } catch (err: any) {
        // Handle explicit cancel / error from Razorpay SDK
        if (err.code === 'payment_cancelled' || err.description?.toLowerCase().includes('cancel')) {
          throw new Error('Payment cancelled by user');
        }
        throw err;
      }

      const {
        razorpay_payment_id,
        razorpay_order_id: returned_order_id,
        razorpay_signature,
      } = razorpayResponse;

      if (!razorpay_payment_id || !razorpay_signature) {
        throw new Error('Incomplete payment response - likely cancelled');
      }

      const verifyRes = await fetch(`${BASE_URL}/api/secure/verify-payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          razorpay_order_id: returned_order_id,
          razorpay_payment_id,
          razorpay_signature,
        }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData?.message || 'Payment verification failed');
      }

      const verifyData = await verifyRes.json();

      if (['paid', 'captured', 'success'].includes(verifyData.payment_status?.toLowerCase())) {
        showOrderSuccessAndNavigate(orderId);
      } else {
        showModal('error', 'Payment Not Completed', `Status: ${verifyData.payment_status || 'Unknown'}`);
      }

    } catch (err: any) {
      console.error('Place order / payment error:', err);

      let message = 'Could not complete order. Please try again.';

      if (err.message?.includes('cancel') || err.code === 'payment_cancelled') {
        message = 'Payment was cancelled. No amount deducted.';
      } else if (err.description) {
        message = err.description;
      } else if (err.message) {
        message = err.message;
      }

      showModal('error', 'Order Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = useMemo(() =>
    displayItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [displayItems]
  );

  const deliveryCharge = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + deliveryCharge + tax;

  const savings = useMemo(() =>
    displayItems.reduce((sum, item) => {
      const orig = item.originalPrice || item.price;
      return sum + (orig - item.price) * item.quantity;
    }, 0),
    [displayItems]
  );

  const moveToWishlist = async (item: DisplayCartItem) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Toast.show({ type: 'error', text1: 'Please login to use wishlist' });
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/wishlist/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: item.productId,
          variant: item.variantId,
        }),
      });

      if (!res.ok) throw new Error('Failed to add to wishlist');

      Toast.show({ type: 'success', text1: 'Moved to Wishlist', text2: item.name });
      removeFromCart(item.cartId);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to move to wishlist' });
    }
  };

  const handleRemove = (item: DisplayCartItem) => {
    showModal(
      'warning',
      'Remove Item?',
      'Are you sure you want to remove this item from cart?',
      () => removeFromCart(item.cartId),
      'Remove',
      'Cancel'
    );
  };

  const canGoNext = () => {
    if (step === 1) return displayItems.length > 0;
    if (step === 2) return !!selectedAddress;
    return !!paymentMethod;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      showModal('warning', 'Incomplete', 'Please complete current step.');
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      placeOrder();
    }
  };

  if (refreshing && step === 1 && displayItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Cart</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyWishList')}>
              <Icon name="heart-outline" size={26} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B03385" />
          <Text style={{ marginTop: 20, fontSize: 16, color: '#64748b' }}>
            Refreshing cart...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(step - 1)}>
            <Icon name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <TouchableOpacity
            style={styles.wishlistHeaderBtn}
            onPress={() => navigation.navigate('MyWishList')}
          >
            <Icon name="heart-outline" size={26} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s, idx) => (
          <React.Fragment key={s}>
            <View style={styles.stepWrapper}>
              <View style={[
                styles.stepCircle,
                s < step && styles.stepCompleted,
                s === step && styles.stepActive,
                s > step && styles.stepFuture,
              ]}>
                {s < step ? (
                  <Icon name="check" size={18} color="#fff" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    s === step && styles.stepNumberActive,
                  ]}>
                    {s}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                s <= step && styles.stepLabelActive
              ]}>
                {s === 1 ? 'Cart' : s === 2 ? 'Address' : 'Payment'}
              </Text>
            </View>
            {idx < 2 && (
              <View style={[
                styles.stepConnector,
                s < step && styles.stepConnectorCompleted,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            (displayItems.length === 0 && step === 1) && { flexGrow: 1, justifyContent: 'center' }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#B03385', '#ec4899', '#c026d3']}
              tintColor="#B03385"
              title={step === 1 ? "Updating cart..." : step === 2 ? "Loading addresses..." : "Refreshing..."}
              titleColor="#64748b"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <>
              {displayItems.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="cart-outline" size={100} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>Your cart is empty</Text>
                  <Text style={styles.emptySubtitle}>
                    Pull down to refresh or add items to continue shopping
                  </Text>
                  <TouchableOpacity
                    style={styles.shopNowBtn}
                    onPress={() => navigation.navigate("Home")}
                  >
                    <Text style={styles.shopNowText}>Continue Shopping</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {displayItems.map((item) => {
                    const discount =
                      item.originalPrice && item.originalPrice > item.price
                        ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
                        : 0;

                    const colorHex = item.colorHex || '#000000';

                    return (
                      <View style={styles.cardContainer} key={item.cartId}>
                        <TouchableOpacity
                          activeOpacity={0.88}
                          style={styles.card}
                          onPress={() => {
                            navigation.navigate('ProductDetail', {
                              product: {
                                id: item.productId,
                                name: item.name,
                              }
                            });
                          }}
                        >
                          <Image
                            source={{ uri: item.image || 'https://via.placeholder.com/90' }}
                            style={styles.image}
                          />

                          <View style={styles.details}>
                            <Text style={styles.title} numberOfLines={2}>
                              {item.name}
                            </Text>

                            <View style={styles.metaRow}>
                              {item.size && (
                                <Text style={styles.meta}>
                                  Size: <Text style={styles.sizeBold}>{item.size}</Text>
                                </Text>
                              )}

                              {item.color && (
                                <View style={styles.colorRow}>
                                  <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
                                  <Text style={[styles.colorName, { color: colorHex }]}>
                                    {item.color}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.meta}>
                              Condition: {item.condition || 'New'}
                            </Text>

                            <View style={styles.priceRow}>
                              <View style={styles.priceContainer}>
                                <Text style={styles.price}>₹{item.price.toFixed(0)}</Text>
                                {discount > 0 && (
                                  <Text style={styles.originalPrice}>
                                    ₹{item.originalPrice?.toFixed(0)}
                                  </Text>
                                )}
                              </View>

                              <View style={styles.quantityContainer}>
                                <TouchableOpacity
                                  style={styles.qtyBtn}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    if (item.quantity > 1) updateQuantity(item.cartId, item.quantity - 1);
                                  }}
                                >
                                  <Text style={styles.qtyText}>-</Text>
                                </TouchableOpacity>

                                <Text style={styles.quantityDisplay}>{item.quantity}</Text>

                                <TouchableOpacity
                                  style={styles.qtyBtn}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.cartId, item.quantity + 1);
                                  }}
                                >
                                  <Text style={styles.qtyText}>+</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={styles.wishlistRow}
                              onPress={(e) => {
                                e.stopPropagation();
                                moveToWishlist(item);
                              }}
                            >
                              <Text style={styles.wishlistText}>Move to Wishlist</Text>
                              <Ionicons name="arrow-forward-outline" size={18} color="#64748b" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeIcon}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemove(item);
                          }}
                        >
                          <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <View style={styles.priceCard}>
                    <Text style={styles.priceCardTitle}>Price Details</Text>

                    <View style={styles.priceLine}>
                      <Text style={styles.label}>Subtotal ({displayItems.length} item{displayItems.length !== 1 ? 's' : ''})</Text>
                      <Text style={styles.value}>₹{subtotal.toFixed(0)}</Text>
                    </View>

                    <View style={styles.priceLine}>
                      <Text style={styles.label}>Delivery</Text>
                      <Text style={[styles.value, deliveryCharge === 0 && styles.free]}>
                        {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                      </Text>
                    </View>

                    <View style={styles.priceLine}>
                      <Text style={styles.label}>GST (18%)</Text>
                      <Text style={styles.value}>₹{tax.toFixed(0)}</Text>
                    </View>

                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>Total Amount</Text>
                      <Text style={styles.totalValue}>₹{totalAmount.toFixed(0)}</Text>
                    </View>

                    {savings > 0 && (
                      <Text style={styles.savings}>You save ₹{savings.toFixed(0)} 🎉</Text>
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={styles.sectionTitle}>Select Delivery Address</Text>

              {loadingAddress ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#B03385" />
                  <Text style={styles.loadingText}>Loading addresses...</Text>
                </View>
              ) : savedAddresses.length > 0 ? (
                <>
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddress?.id === addr.id;

                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[
                          styles.addressCard,
                          isSelected && styles.addressCardSelected,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => setSelectedAddress(addr)}
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.radioCircle}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>

                          <View style={styles.addressMain}>
                            <View style={styles.nameRow}>
                              <Text style={styles.nameText}>
                                {addr.name || 'Home'}
                              </Text>
                            </View>

                            <Text style={styles.phoneText}>
                              {addr.phone ? `+91 ${addr.phone}` : 'Phone not provided'}
                            </Text>

                            <Text style={styles.addressFullText} numberOfLines={3}>
                              {addr.line1}
                              {addr.line2 ? `, ${addr.line2}` : ''}
                              {`, ${addr.city}, ${addr.state} - ${addr.postal_code}`}
                              {addr.country ? `, ${addr.country}` : ''}
                            </Text>
                          </View>

                          {isSelected && (
                            <TouchableOpacity
                              style={styles.editIcon}
                              onPress={() =>
                                navigation.navigate('EditAddress', {
                                  address: addr,
                                  onSave: (updated: Address) => {
                                    setSelectedAddress(updated);
                                    setSavedAddresses(prev =>
                                      prev.map(a => a.id === updated.id ? updated : a)
                                    );
                                  }
                                })
                              }
                            >
                              <Icon name="pencil" size={20} color="#B03385" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.addNewAddressBtn}
                    onPress={() =>
                      navigation.navigate('EditAddress', {
                        onSave: (newAddr: Address) => {
                          setSavedAddresses(prev => [newAddr, ...prev]);
                          setSelectedAddress(newAddr);
                        }
                      })
                    }
                  >
                    <Icon name="plus-circle-outline" size={24} color="#B03385" />
                    <Text style={styles.addNewAddressText}>Add New Address</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyAddressContainer}>
                  <Icon name="map-marker-off" size={80} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No Addresses Found</Text>
                  <Text style={styles.emptySubtitle}>
                    Please add a delivery address to continue
                  </Text>

                  <TouchableOpacity
                    style={styles.addFirstButton}
                    onPress={() =>
                      navigation.navigate('EditAddress', {
                        onSave: (newAddress: Address) => {
                          setSavedAddresses([newAddress]);
                          setSelectedAddress(newAddress);
                        }
                      })
                    }
                  >
                    <Text style={styles.addFirstButtonText}>+ Add New Address</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={styles.sectionTitle}>Payment Method</Text>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cod' && styles.paymentSelected,
                ]}
                onPress={() => setPaymentMethod('cod')}
              >
                <Icon name="cash" size={28} color={paymentMethod === 'cod' ? '#B03385' : '#64748b'} />
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtitle}>Pay when item is delivered</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'online' && styles.paymentSelected,
                ]}
                onPress={() => setPaymentMethod('online')}
              >
                <Icon name="credit-card-outline" size={28} color={paymentMethod === 'online' ? '#B03385' : '#64748b'} />
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentTitle}>Pay Online</Text>
                  <Text style={styles.paymentSubtitle}>UPI, Cards, Wallets</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.priceCard}>
                <Text style={styles.priceCardTitle}>Order Summary</Text>

                <View style={styles.priceLine}>
                  <Text style={styles.label}>Subtotal ({displayItems.length} item{displayItems.length !== 1 ? 's' : ''})</Text>
                  <Text style={styles.value}>₹{subtotal.toFixed(0)}</Text>
                </View>

                <View style={styles.priceLine}>
                  <Text style={styles.label}>Delivery</Text>
                  <Text style={[styles.value, deliveryCharge === 0 && styles.free]}>
                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                  </Text>
                </View>

                <View style={styles.priceLine}>
                  <Text style={styles.label}>GST (18%)</Text>
                  <Text style={styles.value}>₹{tax.toFixed(0)}</Text>
                </View>

                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{totalAmount.toFixed(0)}</Text>
                </View>

                {savings > 0 && (
                  <Text style={styles.savings}>You save ₹{savings.toFixed(0)} 🎉</Text>
                )}
              </View>
            </View>
          )}

          <View style={{ height: displayItems.length > 0 ? 180 : 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {displayItems.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: 100}]}>
          <TouchableOpacity
            style={[styles.placeOrderBtn, (!canGoNext() || submitting) && styles.btnDisabled]}
            onPress={handleNext}
            disabled={!canGoNext() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.placeOrderText}>
                {step === 1
                  ? 'Continue to Address'
                  : step === 2
                  ? 'Proceed to Payment'
                  : `Place Order • ₹${totalAmount.toFixed(0)}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <CustomModal
        visible={modalVisible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={() => setModalVisible(false)}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    // paddingTop: -15,
    marginTop:-18,
    paddingBottom:12,

  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#B03385',
  },

  wishlistHeaderBtn: {
    // padding: 8,
    // paddingTop:1,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom:12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  stepWrapper: { alignItems: 'center', width: 80 },

  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },

  stepCompleted: { backgroundColor: '#B03385', borderColor: '#B03385' },
  stepActive: { backgroundColor: '#fff', borderColor: '#B03385', borderWidth: 3 },
  stepFuture: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },

  stepNumber: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  stepNumberActive: { color: '#B03385', fontWeight: '700' },

  stepLabel: { marginTop: 6, fontSize: 12, fontWeight: '500', color: '#9ca3af' },
  stepLabelActive: { color: '#111827', fontWeight: '700' },

  stepConnector: { height: 2, width: 80, backgroundColor: '#d0d1d1', marginHorizontal: -10, marginBottom: 18 },
  stepConnectorCompleted: { backgroundColor: '#B03385' },

  scrollContent: { padding: 16, paddingBottom: 160 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  placeOrderBtn: {
    backgroundColor: '#B03385',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },

  btnDisabled: { backgroundColor: '#cbd5e1' },

  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cardContainer: {
    position: 'relative',
    marginBottom: 12,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  image: { width: 100, height: 120, borderRadius: 12 },

  details: { flex: 1, marginLeft: 16 },

  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },

  meta: { fontSize: 13, color: '#64748b' },

  sizeBold: { fontWeight: '700', color: '#111827' },

  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#d1d5db' },

  colorName: { fontSize: 13, fontWeight: '600' },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  priceContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },

  price: { fontSize: 18, fontWeight: '700', color: '#B03385' },

  originalPrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },

  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 36,
  },

  qtyBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  qtyText: { fontSize: 18, fontWeight: '700', color: '#B03385' },

  quantityDisplay: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 12,
  },

  wishlistRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },

  wishlistText: { fontSize: 13, color: '#64748b', marginLeft: 6 },

  removeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },

  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  priceCardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },

  priceLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },

  label: { fontSize: 14, color: '#64748b' },

  value: { fontSize: 14, fontWeight: '600', color: '#111827' },

  free: { color: '#16a34a', fontWeight: '700' },

  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
  },

  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },

  totalValue: { fontSize: 18, fontWeight: '800', color: '#B03385' },

  savings: {
    marginTop: 12,
    textAlign: 'center',
    color: '#15803d',
    fontWeight: '700',
    fontSize: 14,
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },

  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  shopNowBtn: {
    marginTop: 8,
    backgroundColor: '#B03385',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },

  shopNowText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  addressCardSelected: {
    borderColor: '#B03385',
    borderWidth: 2,
    backgroundColor: '#fdf2f8',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B03385',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },

  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#B03385',
  },

  addressMain: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },

  nameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },

  phoneText: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 8,
  },

  addressFullText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },

  editIcon: {
    padding: 8,
  },

  addNewAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#B03385',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#fff5f9',
  },

  addNewAddressText: {
    color: '#B03385',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },

  emptyAddressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },

  addFirstButton: {
    marginTop: 32,
    backgroundColor: '#B03385',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },

  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },

  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
  },

  paymentOption: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },

  paymentSelected: {
    borderColor: '#B03385',
    borderWidth: 2,
    backgroundColor: '#fdf2f8',
  },

  paymentTextContainer: { marginLeft: 16, flex: 1 },

  paymentTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },

  paymentSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  modalContainer: {
    width: width * 0.84,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },

  modalIconContainer: { marginBottom: 24 },

  modalTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },

  modalMessage: { fontSize: 16, color: '#4b5563', textAlign: 'center', lineHeight: 24, marginBottom: 32 },

  modalButtons: { flexDirection: 'row', width: '100%', gap: 12 },

  modalConfirmBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },

  modalConfirmText: { color: 'white', fontSize: 16, fontWeight: '700' },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },

  modalCancelText: { color: '#374151', fontSize: 16, fontWeight: '700' },
});