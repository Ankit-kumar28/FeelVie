// src/screens/WalletScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';
import Toast from 'react-native-toast-message';
import { act } from 'react-test-renderer';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.feelvie.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  transaction_type: string;
  source: string;
  amount: string;
  balance_after?: string;
  credit_balance_after?: number;
  order_id?: number;
  withdrawal_request_id?: number;
  description: string;
  meta?: string;
  created_at: string;
}

interface WalletData {
  id: number;
  balance: string;
  credit_balance: number;
  updated_at: string;
  transactions: Transaction[];
}

interface Withdrawal {
  id: number;
  amount: string;
  status: string;
  account_holder_name_snapshot?: string;
  account_number_snapshot?: string;
  ifsc_code_snapshot?: string;
  created_at: string;
}

interface BankDetail {
  id: number;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string;
  created_at: string;
}

interface CreditPack {
  id: number;
  name: string;
  price_inr: string;
  credits: number;
  effective_rate: string;
  is_active: boolean;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  audience: string;
  billing_cycle: string;
  price_inr: string;
  credits_per_month: number;
  extra_credit_price_inr: string;
  is_active: boolean;
}

interface MySubscription {
  id: number;
  status: string;
  started_at: string;
  current_period_end: string;
  auto_renew: boolean;
  plan: SubscriptionPlan;
  created_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  console.log('[WalletScreen] Component mounted / re-rendered');

  // Core wallet data
  const [wallet, setWallet] = useState<WalletData | null>(null);

  // Credits ecosystem
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<MySubscription[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'b2c' | 'b2b'>('b2c');

  // Modal visibility
  const [creditPacksModalVisible, setCreditPacksModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);

  // Coupon input
  const [couponCode, setCouponCode] = useState('');

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const activeSub = mySubscriptions.find((s) => s.status === 'active');

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    console.log('[fetchAllData] Starting data fetch. refreshing:', refreshing);
    if (!refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[fetchAllData] Token retrieved:', token ? '✅ exists' : '❌ missing');

      if (!token) {
        console.warn('[fetchAllData] No token found → navigating to Login');
        navigation.navigate('Login');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      console.log('[fetchAllData] Firing 6 parallel API calls...');

      const [walletRes, packsRes, plansRes, subsRes] =
        await Promise.all([
          fetch(`${BASE_URL}/api/wallet/me/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/credit-packs/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/subscription-plans/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/subscriptions/me/`, { headers }),
        ]);

      console.log('[fetchAllData] API response statuses:', {
        wallet: walletRes.status,
        creditPacks: packsRes.status,
        subscriptionPlans: plansRes.status,
        mySubscriptions: subsRes.status,
      });

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        console.log('[fetchAllData] ✅ Wallet data:', {
          id: walletData.id,
          balance: walletData.balance,
          credit_balance: walletData.credit_balance,
          transactionCount: walletData.transactions?.length ?? 0,
        });
        setWallet(walletData);
      } else {
        console.warn('[fetchAllData] ❌ Wallet fetch failed. Status:', walletRes.status);
      }

      if (packsRes.ok) {
        const packs = await packsRes.json();
        const packArray = Array.isArray(packs) ? packs : [];
        console.log('[fetchAllData] ✅ Credit packs count:', packArray.length);
        packArray.forEach((p: CreditPack) =>
          console.log(`  Pack: id=${p.id} name="${p.name}" credits=${p.credits} price=₹${p.price_inr} active=${p.is_active}`)
        );
        setCreditPacks(packArray);
      } else {
        console.warn('[fetchAllData] ❌ Credit packs fetch failed. Status:', packsRes.status);
      }

      if (plansRes.ok) {
        const plans = await plansRes.json();
        const planArray = Array.isArray(plans) ? plans : [];
        console.log('[fetchAllData] ✅ Subscription plans count:', planArray.length);
        planArray.forEach((p: SubscriptionPlan) =>
          console.log(`  Plan: id=${p.id} name="${p.name}" credits=${p.credits_per_month}/mo price=₹${p.price_inr}`)
        );
        setSubscriptionPlans(planArray);
      } else {
        console.warn('[fetchAllData] ❌ Subscription plans fetch failed. Status:', plansRes.status);
      }

      if (subsRes.ok) {
        const subs = await subsRes.json();
        const subArray = Array.isArray(subs) ? subs : [];
        console.log('[fetchAllData] ✅ My subscriptions count:', subArray.length);
        subArray.forEach((s: MySubscription) =>
          console.log(`  Sub: id=${s.id} status="${s.status}" plan="${s.plan?.name}" ends=${s.current_period_end}`)
        );
        setMySubscriptions(subArray);
        const active = subArray.find((s: MySubscription) => s.status === 'active');
        console.log('[fetchAllData] Active subscription:', active ? `${active.plan.name} (id=${active.id})` : 'none');
      } else {
        console.warn('[fetchAllData] ❌ My subscriptions fetch failed. Status:', subsRes.status);
      }

    } catch (err) {
      console.error('[fetchAllData] 🔴 Unexpected error during fetch:', err);
    } finally {
      console.log('[fetchAllData] Fetch complete. Setting loading=false, refreshing=false');
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, refreshing]);

  useEffect(() => {
    console.log('[useEffect] fetchAllData triggered on mount');
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    console.log('[onRefresh] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchAllData();
  };

  // ─── Razorpay Helper ────────────────────────────────────────────────────────

  const openRazorpay = async ({
    token,
    description,
    initializePayment,
    onSuccess,
  }: {
    token: string;
    description: string;
    initializePayment: () => Promise<{
      purchase_type?: string;
      purchase_id?: number;
      payment_mode?: string;
      razorpay_order_id: string;
      razorpay_key_id: string;
      amount: number;
      currency: string;
    }>;
    onSuccess: (paymentData: {
      paymentId: string;
      razorpayOrderId: string;
      signature: string;
      purchaseType?: string;
      purchaseId?: number;
    }) => Promise<void>;
  }) => {
    console.log('[openRazorpay] Initiating payment. Description:', description);

    // Step 1 — Create a purchase-specific Razorpay order
    const paymentData = await initializePayment();
    console.log('[openRazorpay] Razorpay order created:', {
      purchase_type: paymentData.purchase_type,
      purchase_id: paymentData.purchase_id,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_key_id: paymentData.razorpay_key_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
    });

    // Prefill user info
    console.log('[openRazorpay] Fetching user info for prefill...');
    const userRes = await fetch(`${BASE_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = userRes.ok ? await userRes.json() : {};
    const fullName =
      `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Customer';
    const phone = userData.phone || '';
    const email = userData.email || '';
    console.log('[openRazorpay] Prefill:', { fullName, phone, email: email || '(empty)' });

    // Step 2 — Open Razorpay
    const options = {
      description,
      currency: paymentData.currency || 'INR',
      key: paymentData.razorpay_key_id,
      amount: paymentData.amount.toString(),
      order_id: paymentData.razorpay_order_id,
      name: 'Feelvie',
      prefill: { email, contact: phone, name: fullName },
      theme: { color: '#111111' },
    };
    console.log('[openRazorpay] Step 2: Opening Razorpay checkout with options:', options);

    const razorpayResponse = await RazorpayCheckout.open(options);
    console.log('[openRazorpay] ✅ Razorpay checkout response:', {
      payment_id: razorpayResponse.razorpay_payment_id,
      order_id: razorpayResponse.razorpay_order_id,
      signature: razorpayResponse.razorpay_signature ? '(present)' : '(missing)',
    });

    // Step 3 — Treat a successful checkout as success and refresh local state
    console.log('[openRazorpay] Step 3: Calling onSuccess callback');
    await onSuccess({
      paymentId: razorpayResponse.razorpay_payment_id,
      razorpayOrderId: razorpayResponse.razorpay_order_id,
      signature: razorpayResponse.razorpay_signature,
      purchaseType: paymentData.purchase_type,
      purchaseId: paymentData.purchase_id,
    });
  };

  // ─── Purchase Credit Pack ───────────────────────────────────────────────────

  const handlePurchasePack = async (pack: CreditPack) => {
    console.log('[handlePurchasePack] User tapped pack:', { id: pack.id, name: pack.name, credits: pack.credits, price: pack.price_inr });
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[handlePurchasePack] Token:', token ? '✅' : '❌ missing');
      if (!token) { navigation.navigate('Login'); return; }

      await openRazorpay({
        token,
        description: `Purchase ${pack.name} – ${pack.credits} Credits`,
        initializePayment: async () => {
          console.log('[handlePurchasePack] Posting to /api/wallet/credits/purchase-pack/');
          const purchaseRes = await fetch(`${BASE_URL}/api/wallet/credits/purchase-pack/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pack_id: pack.id,
            }),
          });

          console.log('[handlePurchasePack] purchase-pack response status:', purchaseRes.status);
          if (!purchaseRes.ok) {
            const err = await purchaseRes.json().catch(() => ({}));
            console.error('[handlePurchasePack] ❌ Purchase init failed:', err);
            throw new Error(err.detail || 'Could not initialize pack purchase');
          }

          return purchaseRes.json();
        },
        onSuccess: async () => {
          console.log('[handlePurchasePack] ✅ Razorpay payment completed successfully');
          Toast.show({ type: 'success', text1: `${pack.credits} credits added!` });
          setCreditPacksModalVisible(false);
          fetchAllData();
        },
      });
    } catch (err: any) {
      console.error('[handlePurchasePack] Error:', err?.code, err?.message);
      if (err.code === 'payment_cancelled') {
        Toast.show({ type: 'info', text1: 'Payment Cancelled' });
      } else {
        Toast.show({ type: 'error', text1: 'Purchase Error', text2: err.message || 'Failed to purchase pack' });
      }
    }
  };

  // ─── Activate Subscription ─────────────────────────────────────────────────

  const handleActivateSubscription = async (plan: SubscriptionPlan) => {
    console.log('[handleActivateSubscription] User tapped plan:', { id: plan.id, name: plan.name, price: plan.price_inr });
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[handleActivateSubscription] Token:', token ? '✅' : '❌ missing');
      if (!token) { navigation.navigate('Login'); return; }

      await openRazorpay({
        token,
        description: `${plan.name} – ${plan.credits_per_month} Credits/month`,
        initializePayment: async () => {
          console.log('[handleActivateSubscription] Posting to /api/wallet/credits/activate-subscription/');
          const activateRes = await fetch(
            `${BASE_URL}/api/wallet/credits/activate-subscription/`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                plan_id: plan.id,
              }),
            }
          );

          console.log('[handleActivateSubscription] activate-subscription response status:', activateRes.status);
          if (!activateRes.ok) {
            const err = await activateRes.json().catch(() => ({}));
            console.error('[handleActivateSubscription] ❌ Activation init failed:', err);
            throw new Error(err.detail || 'Could not initialize subscription');
          }

          return activateRes.json();
        },
        onSuccess: async () => {
          console.log('[handleActivateSubscription] ✅ Razorpay payment completed successfully');
          Toast.show({ type: 'success', text1: `Subscribed to ${plan.name}!` });
          setSubscriptionModalVisible(false);
          fetchAllData();
        },
      });
    } catch (err: any) {
      console.error('[handleActivateSubscription] Error:', err?.code, err?.message);
      if (err.code === 'payment_cancelled') {
        Toast.show({ type: 'info', text1: 'Payment Cancelled' });
      } else {
        Toast.show({ type: 'error', text1: 'Subscription Error', text2: err.message || 'Failed to activate subscription' });
      }
    }
  };

  // ─── Modal Toggles (logged) ─────────────────────────────────────────────────

  const openCreditPacksModal = () => {
    console.log('[Modal] Opening Credit Packs modal. Packs available:', creditPacks.length);
    if (!activeSub) {
      console.warn('[Modal] No active subscription - credit packs disabled');
      Toast.show({ type: 'info', text1: 'Subscribe First', text2: 'Subscribe to a plan to buy credit packs' });
      return;
    }
    setCreditPacksModalVisible(true);
  };

  const openSubscriptionModal = () => {
    console.log('[MODAL DEBUG] openSubscriptionModal called');
    console.log('[MODAL DEBUG] Current state before:', { subscriptionModalVisible });
    setSubscriptionModalVisible(true);
    console.log('[MODAL DEBUG] State updated, modal should be visible now');
  };

  const openCouponModal = () => {
    console.log('[MODAL DEBUG] openCouponModal called');
    console.log('[MODAL DEBUG] Current state before:', { couponModalVisible });
    setCouponModalVisible(true);
    console.log('[MODAL DEBUG] State updated, modal should be visible now');
  };

  const handleRedeemCoupon = async () => {
    console.log('[handleRedeemCoupon] Attempting to redeem coupon:', couponCode);

    if (!couponCode.trim()) {
      Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter a coupon code' });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.warn('[handleRedeemCoupon] No token found');
        Toast.show({ type: 'error', text1: 'Error', text2: 'Authentication failed' });
        return;
      }

      console.log('[handleRedeemCoupon] Posting to /api/wallet/credits/redeem-coupon/');
      const res = await fetch(`${BASE_URL}/api/wallet/credits/redeem-coupon/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode.toUpperCase() }),
      });

      console.log('[handleRedeemCoupon] Response status:', res.status);

      if (res.ok) {
        const responseData = await res.json();
        console.log('[handleRedeemCoupon] ✅ Coupon redeemed successfully:', {
          credit_balance: responseData.credit_balance,
          balance: responseData.balance,
        });

        // Update wallet with response data
        setWallet(responseData);

        Toast.show({ type: 'success', text1: 'Coupon Redeemed!', text2: 'Credits have been added to your account' });
        setCouponModalVisible(false);
        setCouponCode('');

        // Refresh all data to show updated balances
        fetchAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('[handleRedeemCoupon] ❌ Coupon redemption failed:', errData);
        const errorMsg = errData.detail || errData.message || 'Invalid or already used coupon code';
        Toast.show({ type: 'error', text1: 'Coupon Failed', text2: errorMsg });
      }
    } catch (err) {
      console.error('[handleRedeemCoupon] 🔴 Network or unexpected error:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong. Please try again.' });
    }
  };


  const renderCreditPack = ({ item }: { item: CreditPack }) => (
    <TouchableOpacity style={styles.packCard} onPress={() => handlePurchasePack(item)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.packName}>{item.name}</Text>
        <Text style={styles.packCredits}>{item.credits} Credits</Text>
        <Text style={styles.packRate}>@ ₹{item.effective_rate}/credit</Text>
      </View>
      <View style={styles.packPriceCol}>
        <Text style={styles.packPrice}>₹{parseFloat(item.price_inr).toFixed(0)}</Text>
        <View style={styles.buyBtn}>
          <Text style={styles.buyBtnText}>Buy</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPlan = ({ item }: { item: SubscriptionPlan }) => {
    const isCurrent = activeSub?.plan?.id === item.id;
    return (
      <View style={[styles.planCard, isCurrent && styles.planCardActive]}>
        <View style={{ flex: 1 }}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{item.name}</Text>
            {isCurrent && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.planCredits}>{item.credits_per_month} Credits/month</Text>
          <Text style={styles.planCycle}>{item.billing_cycle}</Text>
          {isCurrent && activeSub && (
            <Text style={styles.planExpiry}>
              Renews {formatDate(activeSub.current_period_end)}
            </Text>
          )}
        </View>
        <View style={styles.planPriceCol}>
          <Text style={styles.planPrice}>₹{parseFloat(item.price_inr).toFixed(0)}</Text>
          <Text style={styles.planPriceSub}>/mo</Text>
          {!isCurrent && (
            <TouchableOpacity
              style={styles.subscribeBtn}
              onPress={() => handleActivateSubscription(item)}
            >
              <Text style={styles.subscribeBtnText}>Subscribe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    console.log('[WalletScreen] Rendering loading state...');
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={26} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111111" />
        </View>
      </SafeAreaView>
    );
  }

  const balance = wallet?.balance || '0.00';
  const creditBalance = wallet?.credit_balance ?? 0;
  console.log('[WalletScreen] Rendering main UI. balance:', balance, 'creditBalance:', creditBalance,);

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header]}>
          <TouchableOpacity onPress={() => { console.log('[Header] Back button pressed'); navigation.goBack(); }}>
            <Icon name="arrow-left" size={26} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Credits</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#111111']} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── CREDITS ONLY ── */}
          {/* Credit Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>CREDIT BALANCE</Text>
            <Text style={styles.balanceAmount}>{creditBalance}</Text>
            <Text style={styles.creditSubLabel}>credits available</Text>

            {activeSub ? (
              <>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.addMoneyBtn}
                    onPress={openCreditPacksModal}
                  >
                    <Icon name="package-variant" size={22} color="#111111" />
                    <Text style={styles.actionText}>Top-up Credits</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.addMoneyBtn, { flex: 1 }]}
                  onPress={openSubscriptionModal}
                >
                  <Icon name="crown" size={22} color="#111111" />
                  <Text style={styles.actionText}>Subscribe Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Active Subscription Card */}
          {activeSub && (
            <>
              <Text style={styles.sectionTitle}>ACTIVE SUBSCRIPTION</Text>
              <View style={styles.activeSubCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="crown" size={22} color="#111111" style={{ marginRight: 10 }} />
                  <Text style={styles.activeSubName}>{activeSub.plan.name}</Text>
                </View>
                <Text style={styles.activeSubDetail}>
                  {activeSub.plan.credits_per_month} credits/month
                </Text>
                <Text style={styles.activeSubDetail}>
                  Renews: {formatDate(activeSub.current_period_end)}
                </Text>
                <Text style={styles.activeSubDetail}>
                  Auto-renew: {activeSub.auto_renew ? 'On' : 'Off'}
                </Text>
              </View>
            </>
          )}

          {/* Tab Selector for Plans */}
          {!activeSub && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'b2c' && styles.tabButtonActive]}
                onPress={() => setActiveTab('b2c')}
              >
                <Text style={[styles.tabText, activeTab === 'b2c' && styles.tabTextActive]}>
                  B2C Plans
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'b2b' && styles.tabButtonActive]}
                onPress={() => setActiveTab('b2b')}
              >
                <Text style={[styles.tabText, activeTab === 'b2b' && styles.tabTextActive]}>
                  B2B Plans
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Subscription Plans */}
          {
            !activeSub && (
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>
                  {activeSub ? 'OTHER SUBSCRIPTION PLANS' : 'AVAILABLE PLANS'}
                </Text>
              </View>
            )
          }
          {!activeSub && subscriptionPlans
            .filter(plan => plan.audience.toLowerCase() === activeTab)
            .map((plan) => {
              const isCurrent = activeSub?.plan?.id === plan.id;
              return (
                <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {isCurrent && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planCredits}>{plan.credits_per_month} Credits/month</Text>
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text style={styles.planPrice}>
                      ₹{parseFloat(plan.price_inr).toFixed(0)}
                    </Text>
                    <Text style={styles.planPriceSub}>/mo</Text>
                    {!isCurrent && (
                      <TouchableOpacity
                        style={styles.subscribeBtn}
                        onPress={() => handleActivateSubscription(plan)}
                      >
                        <Text style={styles.subscribeBtnText}>Subscribe</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

          {/* Credit Packs - Only shown if active subscription */}
          {activeSub && (
            <>
              <View style={[styles.sectionRow, { marginTop: 24 }]}>
                <Text style={styles.sectionTitle}>CREDIT PACKS</Text>
                {creditPacks.length > 3 && (
                  <TouchableOpacity onPress={openCreditPacksModal}>
                    {/* <Text style={styles.seeAll}>See All</Text> */}
                  </TouchableOpacity>
                )}
              </View>
              {creditPacks.map((pack) => (
                <TouchableOpacity
                  key={pack.id}
                  style={styles.packCard}
                  onPress={() => handlePurchasePack(pack)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packName}>{pack.name}</Text>
                    <Text style={styles.packCredits}>{pack.credits} Credits</Text>
                    <Text style={styles.packRate}>@ ₹{pack.effective_rate}/credit</Text>
                  </View>
                  <View style={styles.packPriceCol}>
                    <Text style={styles.packPrice}>
                      ₹{parseFloat(pack.price_inr).toFixed(0)}
                    </Text>
                    <View style={styles.buyBtn}>
                      <Text style={styles.buyBtnText}>Buy</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Quick Actions - Always visible */}
          <View style={styles.quickActionsSection}>
            {/* <TouchableOpacity
              style={styles.quickActionBtn}
              activeOpacity={0.7}
              onPress={() => {
                console.log('[QuickAction] Manage Plans pressed → opening subscription modal');
                openSubscriptionModal();
              }}
            >
              <Icon name="crown" size={20} color="#111111" />
              <View style={{ flex: 1 }}>
                <Text style={styles.quickActionTitle}>Manage Plans</Text>
                <Text style={styles.quickActionDesc}>View all subscription options</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#AAAAAA" />
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.quickActionBtn}
              activeOpacity={0.7}
              onPress={() => {
                console.log('[QuickAction] Redeem Coupon pressed → opening coupon modal');
                openCouponModal();
              }}
            >
              <Icon name="ticket-percent" size={20} color="#111111" />
              <View style={{ flex: 1 }}>
                <Text style={styles.quickActionTitle}>Redeem Coupon</Text>
                <Text style={styles.quickActionDesc}>Enter coupon code for credits</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#AAAAAA" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Credit Packs Modal - Only show if subscription is active */}
      {activeSub && (
        <Modal
          visible={creditPacksModalVisible}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={() => { console.log('[Modal] Credit Packs modal closed via back press'); setCreditPacksModalVisible(false); }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <Text style={styles.modalTitle}>Buy Credit Packs</Text>
              <Text style={styles.modalSubtitle}>One-time credit top-ups</Text>
              {creditPacks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="package-variant" size={50} color="#AAAAAA" />
                  <Text style={styles.emptyText}>No packs available</Text>
                </View>
              ) : (
                <FlatList
                  data={creditPacks}
                  renderItem={renderCreditPack}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled
                />
              )}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => { console.log('[CreditPacksModal] Close pressed'); setCreditPacksModalVisible(false); }}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Subscription Plans Modal */}
      <Modal
        visible={subscriptionModalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => { console.log('[Modal] Subscription modal closed via back press'); setSubscriptionModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Subscription Plans</Text>
            <Text style={styles.modalSubtitle}>Monthly credit allocation</Text>
            {subscriptionPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="crown-outline" size={50} color="#AAAAAA" />
                <Text style={styles.emptyText}>No plans available</Text>
              </View>
            ) : (
              <FlatList
                data={subscriptionPlans}
                renderItem={renderPlan}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled
              />
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => { console.log('[SubscriptionModal] Close pressed'); setSubscriptionModalVisible(false); }}
            >
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Coupon Redemption Modal */}
      <Modal
        visible={couponModalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => { console.log('[Modal] Coupon modal closed via back press'); setCouponModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon
              name="ticket-percent-outline"
              size={40}
              color="#111111"
              style={{ alignSelf: 'center', marginBottom: 12 }}
            />
            <Text style={styles.modalTitle}>Redeem Coupon</Text>
            <Text style={styles.modalSubtitle}>Enter your coupon code to claim credits</Text>
            <TextInput
              style={styles.couponInput}
              placeholder="e.g., WELCOME50"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={(val) => { console.log('[CouponModal] Code typed:', val); setCouponCode(val); }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { console.log('[CouponModal] Cancel pressed'); setCouponModalVisible(false); setCouponCode(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleRedeemCoupon}>
                <Text style={styles.confirmText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#111111' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  tabTextActive: {
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#111111' },
  tabText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#AAAAAA' },
  tabTextActive: { fontFamily: 'Poppins-SemiBold', color: '#111111' },

  scrollContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 38,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 4,
  },
  creditSubLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
    marginBottom: 20,
  },

  actionRow: { flexDirection: 'row', width: '100%', gap: 12 },
  addMoneyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111111',
    gap: 8,
  },
  withdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#111111',
    gap: 8,
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',  // full width, no flex: 1
  },
  actionText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  withdrawText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    width: '100%',
  },
  couponRowText: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#111111' },

  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#111111' },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  transactionDesc: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#111111' },
  transactionDate: { fontSize: 13, color: '#AAAAAA', marginTop: 4, fontFamily: 'Poppins-Regular' },
  transactionAmount: { fontSize: 16, fontFamily: 'Poppins-SemiBold' },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#AAAAAA', marginTop: 12, fontFamily: 'Poppins-Regular' },

  withdrawalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  withdrawalAmount: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  withdrawalBank: { fontSize: 13, color: '#AAAAAA', marginTop: 2, fontFamily: 'Poppins-Regular' },
  withdrawalDate: { fontSize: 12, color: '#AAAAAA', marginTop: 2, fontFamily: 'Poppins-Regular' },
  statusBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusApproved: { backgroundColor: '#E6F4EA' },
  statusRejected: { backgroundColor: '#FDECEA' },
  statusText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#111111' },

  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  packName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  packCredits: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#555555', marginTop: 2 },
  packRate: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#AAAAAA', marginTop: 2 },
  packPriceCol: { alignItems: 'flex-end', gap: 8 },
  packPrice: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  buyBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buyBtnText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  planCardActive: { borderColor: '#111111', backgroundColor: '#FAFAFA' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  activeBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  planCredits: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#555555' },
  planCycle: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#AAAAAA', marginTop: 2 },
  planExpiry: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#AAAAAA', marginTop: 2 },
  planPriceCol: { alignItems: 'flex-end', gap: 4 },
  planPrice: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  planPriceSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#AAAAAA' },
  subscribeBtn: {
    marginTop: 6,
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subscribeBtnText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  activeSubCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#111111',
  },
  activeSubName: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  activeSubDetail: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#555555', marginTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: width * 0.88,
    borderRadius: 8,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    padding: 16,
    fontSize: 17,
    marginBottom: 24,
    fontFamily: 'Poppins-Regular',
    color: '#111111',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0a0a0a',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#111111',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#000000' },
  confirmText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#fffefe' },

  selectedBankPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  bankName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  bankNumber: { fontSize: 14, color: '#AAAAAA', marginTop: 2, fontFamily: 'Poppins-Regular' },
  bankIfsc: { fontSize: 13, color: '#AAAAAA', marginTop: 2, fontFamily: 'Poppins-Regular' },

  bankSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  bankSelectName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  bankSelectNumber: { fontSize: 14, color: '#AAAAAA', marginTop: 2 },
  bankSelectIfsc: { fontSize: 13, color: '#AAAAAA', marginTop: 2 },

  addNewBank: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  addNewBankText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },

  couponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111111',
    gap: 8,
  },
  couponBtnText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  couponInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    padding: 16,
    fontSize: 17,
    marginBottom: 24,
    marginTop: 12,
    fontFamily: 'Poppins-Regular',
    color: '#111111',
  },

  quickActionsSection: {
    marginTop: 32,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 16,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
  },
});