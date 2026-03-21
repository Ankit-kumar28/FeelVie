// src/features/checkout/screens/CheckoutScreen.tsx

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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from "react-native-toast-message";
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://feelvie.yaytech.in';

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
}

interface DisplayItem {
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

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1); // 1 = Address, 2 = Payment
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [displayItem, setDisplayItem] = useState<DisplayItem | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  // Wallet integration
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(false);

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

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        showModal('warning', 'Login Required', 'Please login to continue.', () => navigation.navigate('Login'));
        return;
      }

      // Try to get data passed from Buy Now
      const { productId, variantId, quantity = 1, fromBuyNow } = route.params || {};

      if (fromBuyNow && productId && variantId) {
        try {
          const prodRes = await fetch(`${BASE_URL}/api/catalog/products/${productId}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!prodRes.ok) throw new Error('Failed to load product');

          const prod = await prodRes.json();
          const variant = prod.variants?.find((v: any) => v.id === variantId);

          if (!variant) throw new Error('Variant not found');

          setDisplayItem({
            productId,
            variantId,
            quantity,
            price: parseFloat(variant.price_override || prod.selling_price || '0'),
            name: prod.name || 'Product',
            image: prod.images?.[0]?.image_url || prod.images?.[0]?.image || '',
            color: variant.color?.name,
            colorHex: variant.color?.hex_code,
            size: variant.size?.size || variant.size?.size_display,
            originalPrice: prod.original_price ? parseFloat(prod.original_price) : undefined,
            condition: prod.condition || 'New',
          });
        } catch (err) {
          console.error(err);
          Toast.show({ type: 'error', text1: 'Failed to load product details' });
        }
      }

      // Load addresses
      await fetchAddresses(token);

      // Load wallet balance
      await fetchWalletBalance(token);

      setLoading(false);
    };

    loadData();
  }, []);

  const fetchAddresses = async (token: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/addresses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: Address[] = await res.json();
        const sorted = data.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setSavedAddresses(sorted);
        if (sorted.length > 0) setSelectedAddress(sorted[0]);
      }
    } catch (err) {
      console.error('Failed to load addresses');
    }
  };

  const fetchWalletBalance = async (token: string) => {
    setWalletLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/wallet/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(parseFloat(data.balance || '0'));
      }
    } catch (err) {
      console.error('Failed to load wallet balance', err);
    } finally {
      setWalletLoading(false);
    }
  };

  const subtotal = displayItem ? displayItem.price * displayItem.quantity : 0;
  const deliveryCharge = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + deliveryCharge + tax;

  const placeOrder = async () => {
    if (!selectedAddress) {
      showModal('warning', 'No Address', 'Please select a delivery address.');
      return;
    }

    if (!paymentMethod) {
      showModal('warning', 'No Payment Method', 'Please select a payment method.');
      return;
    }

    if (!displayItem) {
      showModal('error', 'Error', 'No item to checkout.');
      return;
    }

    setSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const userRes = await fetch(`${BASE_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await userRes.json();

      const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Customer';
      const phone = userData.phone || '9999999999';
      const email = userData.email || '';

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
        items: [{
          product: displayItem.productId,
          variant: displayItem.variantId,
          quantity: displayItem.quantity,
        }],
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

      // Handle payment methods
      if (paymentMethod === 'cod') {
        showSuccessAndFinish(orderId);
        return;
      }

      if (paymentMethod === 'wallet') {
        if (walletBalance < totalAmount) {
          showModal(
            'warning',
            'Insufficient Wallet Balance',
            `You have ₹${walletBalance.toFixed(0)} in your FeelVie Wallet, but the order total is ₹${totalAmount.toFixed(0)}.\n\nPlease add money to your wallet or choose another payment method.`
          );
          return;
        }

        // Call wallet deduction endpoint (you must implement this on backend)
        const walletPayRes = await fetch(`${BASE_URL}/api/wallet/deduct-for-order/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            amount: totalAmount.toString(),
          }),
        });

        if (!walletPayRes.ok) {
          const errData = await walletPayRes.json().catch(() => ({}));
          throw new Error(errData.detail || 'Wallet payment failed');
        }

        showSuccessAndFinish(orderId);
        return;
      }

      // Online Payment (Razorpay)
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

      const options = {
        description: `Order #${orderId}`,
        currency: paymentData.currency || 'INR',
        key: paymentData.razorpay_key_id,
        amount: paymentData.amount.toString(),
        order_id: paymentData.razorpay_order_id,
        name: 'Feelvie',
        prefill: { email, contact: phone, name: fullName },
        theme: { color: '#B03385' },
      };

      const razorpayResponse = await RazorpayCheckout.open(options);

      const verifyRes = await fetch(`${BASE_URL}/api/secure/verify-payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        }),
      });

      if (!verifyRes.ok) throw new Error('Payment verification failed');

      const verifyData = await verifyRes.json();

      if (['paid', 'captured', 'success'].includes(verifyData.payment_status?.toLowerCase())) {
        showSuccessAndFinish(orderId);
      } else {
        showModal('error', 'Payment Failed', 'Payment status: ' + (verifyData.payment_status || 'unknown'));
      }

    } catch (err: any) {
      console.error('Checkout error:', err);
      let msg = 'Failed to place order';
      if (err.code === 'payment_cancelled') msg = 'Payment was cancelled';
      showModal('error', 'Order Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const showSuccessAndFinish = (orderId: number | string) => {
    showModal(
      'success',
      'Order Placed!',
      `Order #${orderId} placed successfully.\nThank you for shopping!`,
      () => {
        // Clear temporary cart item if needed (optional)
        navigation.navigate('MainTabs');
      },
      'Continue Shopping'
    );
  };

  if (loading || !displayItem) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B03385" />
        <Text style={{ marginTop: 20, color: '#64748b' }}>Preparing checkout...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: 18, paddingBottom: 12 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.stepWrapper}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Text style={[styles.stepNumber, styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Address</Text>
        </View>
        <View style={styles.stepConnector} />
        <View style={styles.stepWrapper}>
          <View style={[styles.stepCircle, step === 2 && styles.stepActive]}>
            <Text style={[styles.stepNumber, step === 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Payment</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <View style={{ padding: 16 }}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>

              {savedAddresses.length > 0 ? (
                savedAddresses.map(addr => {
                  const selected = selectedAddress?.id === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addressCard, selected && styles.addressCardSelected]}
                      onPress={() => setSelectedAddress(addr)}
                    >
                      <View style={styles.radioCircle}>
                        {selected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.nameText}>{addr.name || 'Home'}</Text>
                        <Text style={styles.phoneText}>{addr.phone ? `+91 ${addr.phone}` : '—'}</Text>
                        <Text style={styles.addressFullText}>
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} - {addr.postal_code}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyAddressContainer}>
                  <Icon name="map-marker-off" size={70} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No Address Found</Text>
                  <TouchableOpacity
                    style={styles.addAddressBtn}
                    onPress={() => navigation.navigate('EditAddress', {
                      onSave: (newAddr: Address) => {
                        setSavedAddresses([newAddr]);
                        setSelectedAddress(newAddr);
                      }
                    })}
                  >
                    <Text style={styles.addAddressText}>+ Add New Address</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.addNewBtn}
                onPress={() => navigation.navigate('EditAddress', {
                  onSave: (addr: Address) => {
                    setSavedAddresses(prev => [addr, ...prev]);
                    setSelectedAddress(addr);
                  }
                })}
              >
                <Icon name="plus" size={20} color="#B03385" />
                <Text style={styles.addNewText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={{ padding: 16 }}>
              <Text style={styles.sectionTitle}>Payment Method</Text>

              {walletBalance > 0 && (
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'wallet' && styles.paymentSelected,
                  ]}
                  onPress={() => setPaymentMethod('wallet')}
                  disabled={walletLoading || submitting}
                >
                  <Icon
                    name="wallet"
                    size={28}
                    color={paymentMethod === 'wallet' ? '#B03385' : '#64748b'}
                  />
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={styles.paymentTitle}>FeelVie Wallet</Text>
                    <Text
                      style={[
                        styles.paymentSubtitle,
                        { color: walletBalance >= totalAmount ? '#10b981' : '#ef4444' },
                      ]}
                    >
                      Balance: ₹{walletBalance.toFixed(0)}
                      
                    </Text>
                  </View>
                  {walletLoading && (
                    <ActivityIndicator size="small" color="#B03385" style={{ marginLeft: 12 }} />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentSelected]}
                onPress={() => setPaymentMethod('cod')}
              >
                <Icon
                  name="cash"
                  size={28}
                  color={paymentMethod === 'cod' ? '#B03385' : '#64748b'}
                />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtitle}>Pay when item arrives</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'online' && styles.paymentSelected]}
                onPress={() => setPaymentMethod('online')}
              >
                <Icon
                  name="credit-card-outline"
                  size={28}
                  color={paymentMethod === 'online' ? '#B03385' : '#64748b'}
                />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.paymentTitle}>Pay Online</Text>
                  <Text style={styles.paymentSubtitle}>UPI, Card, Netbanking</Text>
                </View>
              </TouchableOpacity>

              {/* Order Summary */}
              <View style={styles.priceCard}>
                <Text style={styles.priceCardTitle}>Order Summary</Text>
                <View style={styles.itemRow}>
                  <Image source={{ uri: displayItem.image }} style={styles.smallImage} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{displayItem.name}</Text>
                    <Text style={styles.itemMeta}>
                      {displayItem.color && `${displayItem.color} • `}
                      {displayItem.size && `Size ${displayItem.size}`}
                    </Text>
                    <Text style={styles.itemPrice}>₹{displayItem.price.toFixed(0)} × {displayItem.quantity}</Text>
                  </View>
                </View>

                <View style={styles.priceLine}>
                  <Text style={styles.label}>Subtotal</Text>
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
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{totalAmount.toFixed(0)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 160 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: 42 }]}>
        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            (!selectedAddress || submitting || (step === 2 && !paymentMethod)) && styles.btnDisabled,
          ]}
          onPress={() => step === 1 ? setStep(2) : placeOrder()}
          disabled={submitting || !selectedAddress || (step === 2 && !paymentMethod)}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              {step === 1 ? 'Continue to Payment' : `Pay Now • ₹${totalAmount.toFixed(0)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
  headerContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,},
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#B03385' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#fff' },
  stepWrapper: { alignItems: 'center', width: 100 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#d1d5db' },
  stepActive: { backgroundColor: '#B03385', borderColor: '#B03385' },
  stepNumber: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  stepNumberActive: { color: '#fff' },
  stepLabel: { marginTop: 6, fontSize: 13, color: '#9ca3af' },
  stepLabelActive: { color: '#111827', fontWeight: '600' },
  stepConnector: { height: 2, width: 110, backgroundColor: '#d1d5db',paddingBottom:1,marginBottom:15, marginHorizontal:-4,},
  scrollContent: { padding: 0, paddingBottom: 180 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10 },
  placeOrderBtn: { backgroundColor: '#B03385', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#cbd5e1' },
  placeOrderText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#111827', marginBottom: 16 },
  addressCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#e5e7eb' },
  addressCardSelected: { borderColor: '#B03385', backgroundColor: '#fdf2f8' },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#B03385', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#B03385' },
  nameText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  phoneText: { fontSize: 14, color: '#4b5563', marginVertical: 4 },
  addressFullText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  addNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderWidth: 2, borderColor: '#B03385', borderStyle: 'dashed', borderRadius: 12, marginTop: 8 },
  addNewText: { color: '#B03385', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  emptyAddressContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 20 },
  addAddressBtn: { marginTop: 24, backgroundColor: '#B03385', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30 },
  addAddressText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  paymentSelected: { borderColor: '#B03385', borderWidth: 2, backgroundColor: '#fdf2f8' },
  paymentTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  paymentSubtitle: { fontSize: 13, color: '#64748b' },
  priceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  priceCardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  itemRow: { flexDirection: 'row', marginBottom: 20 },
  smallImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f1f5f9' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#B03385', marginTop: 6 },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: '600', color: '#111827' },
  free: { color: '#16a34a', fontWeight: '700' },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#B03385' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: width * 0.82, backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center' },
  modalIconContainer: { marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  modalMessage: { fontSize: 16, color: '#4b5563', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  modalButtons: { flexDirection: 'row', width: '100%', gap: 12 },
  modalConfirmBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  modalConfirmText: { color: 'white', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { color: '#374151', fontSize: 16, fontWeight: '700' },
});