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
import { Platform } from 'react-native';


const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.feelvie.com';
const PlatformName = Platform.OS === 'ios' ? 'iOS' : 'Android';

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

interface CreditPack {
  id: number;
  name: string;
  price_inr: string;
  credits: number;
  effective_rate: string;
  is_active: boolean;
}

/** Price suffix for a plan's billing cycle — "/mo", "/yr", … */
const cycleSuffix = (cycle?: string) => {
  switch ((cycle ?? '').toLowerCase()) {
    case 'monthly': return '/mo';
    case 'yearly':
    case 'annual':
    case 'annually': return '/yr';
    case 'quarterly': return '/qtr';
    case 'weekly': return '/wk';
    case 'daily': return '/day';
    default: return cycle ? `/${cycle.toLowerCase()}` : '';
  }
};

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

  // UI Visibility Toggle State (Defaulting to false per requirement)
  const [showUi, setShowUi] = useState<boolean>(false);

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

  // ─── Admin UI Toggle Handling ───────────────────────────────────────────────

  const checkUiVisibility = useCallback(async () => {
    try {
      console.log('[checkUiVisibility] Fetching fresh UI config from admin api...');

      if(PlatformName == 'Android'){
        setShowUi(true);
        return; // Skip API check for Android as per requirement
      }
      const response = await fetch(`${BASE_URL}/api/admin/showui/`);
      if (response.ok) {
        const data = await response.json();
        console.log('[checkUiVisibility] API response received:', data);

        const apiValue = !!data?.showui;
        setShowUi(apiValue);
      }
    } catch (error) {
      console.error('[checkUiVisibility] Error checking admin UI visibility:', error);
    }
  }, []);

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
      console.log('[fetchAllData] Firing parallel API calls...');

      const [walletRes, packsRes, plansRes, subsRes] =
        await Promise.all([
          fetch(`${BASE_URL}/api/wallet/me/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/credit-packs/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/subscription-plans/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/subscriptions/me/`, { headers }),
        ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData);
      }

      if (packsRes.ok) {
        const packs = await packsRes.json();
        setCreditPacks(Array.isArray(packs) ? packs : []);
      }

      if (plansRes.ok) {
        const plans = await plansRes.json();
        setSubscriptionPlans(Array.isArray(plans) ? plans : []);
      }

      if (subsRes.ok) {
        const subs = await subsRes.json();
        setMySubscriptions(Array.isArray(subs) ? subs : []);
      }

    } catch (err) {
      console.error('[fetchAllData] 🔴 Unexpected error during fetch:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, refreshing]);

  useEffect(() => {
    console.log('[useEffect] fetchAllData & checkUiVisibility triggered on mount');
    checkUiVisibility();
    fetchAllData();
  }, [fetchAllData, checkUiVisibility]);

  const onRefresh = () => {
    console.log('[onRefresh] Pull-to-refresh triggered');
    setRefreshing(true);
    checkUiVisibility();
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
    initializePayment: () => Promise<any>;
    onSuccess: (paymentData: any) => Promise<void>;
  }) => {
    const paymentData = await initializePayment();
    const userRes = await fetch(`${BASE_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = userRes.ok ? await userRes.json() : {};
    const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Customer';

    const options = {
      description,
      currency: paymentData.currency || 'INR',
      key: paymentData.razorpay_key_id,
      amount: paymentData.amount.toString(),
      order_id: paymentData.razorpay_order_id,
      name: 'Feelvie',
      prefill: { email: userData.email || '', contact: userData.phone || '', name: fullName },
      theme: { color: '#111111' },
    };

    const razorpayResponse = await RazorpayCheckout.open(options);
    await onSuccess({
      paymentId: razorpayResponse.razorpay_payment_id,
      razorpayOrderId: razorpayResponse.razorpay_order_id,
      signature: razorpayResponse.razorpay_signature,
      purchaseType: paymentData.purchase_type,
      purchaseId: paymentData.purchase_id,
    });
  };

  // ─── Purchase Actions ───────────────────────────────────────────────────────

  const handlePurchasePack = async (pack: CreditPack) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) { navigation.navigate('Login'); return; }

      await openRazorpay({
        token,
        description: `Purchase ${pack.name} – ${pack.credits} Credits`,
        initializePayment: async () => {
          const purchaseRes = await fetch(`${BASE_URL}/api/wallet/credits/purchase-pack/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ pack_id: pack.id }),
          });
          if (!purchaseRes.ok) throw new Error('Could not initialize pack purchase');
          return purchaseRes.json();
        },
        onSuccess: async () => {
          Toast.show({ type: 'success', text1: `${pack.credits} credits added!` });
          setCreditPacksModalVisible(false);
          fetchAllData();
        },
      });
    } catch (err: any) {
      if (err.code === 'payment_cancelled') {
        Toast.show({ type: 'info', text1: 'Payment Cancelled' });
      } else {
        Toast.show({ type: 'error', text1: 'Purchase Error', text2: err.message || 'Failed to purchase pack' });
      }
    }
  };

  const handleActivateSubscription = async (plan: SubscriptionPlan) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) { navigation.navigate('Login'); return; }

      const autopayRes = await fetch(`${BASE_URL}/api/secure/subscriptions/autopay/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id.toString() }),
      });

      if (!autopayRes.ok) {
        const errorText = await autopayRes.text();
        throw new Error(errorText || 'Could not start plan autopay');
      }

      const autopayData = await autopayRes.json();
      const subscriptionId = autopayData?.subscription_id;
      const razorpayKey = autopayData?.razorpay_key_id;
      if (!subscriptionId || !razorpayKey) throw new Error('Could not initialize Razorpay subscription');

      const userRes = await fetch(`${BASE_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = userRes.ok ? await userRes.json() : {};
      const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Customer';

      const options = {
        key: razorpayKey,
        subscription_id: subscriptionId,
        name: 'Feelvie',
        description: `${plan.name} Subscription`,
        prefill: {
          email: userData.email || '',
          contact: userData.phone || '',
          name: fullName,
        },
        theme: { color: '#111111' },
      };

      setSubscriptionModalVisible(false);
      const razorpayResponse = await RazorpayCheckout.open(options);
      Toast.show({ type: 'success', text1: `Subscribed to ${plan.name}!` });
      console.log('Razorpay subscription success:', razorpayResponse);
      fetchAllData();
    } catch (err: any) {
      if (err.code === 'payment_cancelled') {
        Toast.show({ type: 'info', text1: 'Payment Cancelled' });
      } else {
        Toast.show({ type: 'error', text1: 'Subscription Error', text2: err.message || 'Failed to activate subscription' });
      }
    }
  };

  const openCreditPacksModal = () => {
    if (!activeSub) {
      Toast.show({ type: 'info', text1: 'Subscribe First', text2: 'Subscribe to a plan to buy credit packs' });
      return;
    }
    setCreditPacksModalVisible(true);
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter a coupon code' });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/wallet/credits/redeem-coupon/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.toUpperCase() }),
      });

      if (res.ok) {
        const responseData = await res.json();
        setWallet(responseData);
        Toast.show({ type: 'success', text1: 'Coupon Redeemed!', text2: 'Credits have been added to your account' });
        setCouponModalVisible(false);
        setCouponCode('');
        fetchAllData();
      } else {
        Toast.show({ type: 'error', text1: 'Coupon Failed', text2: 'Invalid or already used coupon code' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong.' });
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
            <Text style={styles.planExpiry}>Renews {formatDate(activeSub.current_period_end)}</Text>
          )}
        </View>
        <View style={styles.planPriceCol}>
          <Text style={styles.planPrice}>₹{parseFloat(item.price_inr).toFixed(0)}</Text>
          <Text style={styles.planPriceSub}>{cycleSuffix(item.billing_cycle)}</Text>
          {!isCurrent && (
            <TouchableOpacity style={styles.subscribeBtn} onPress={() => handleActivateSubscription(item)}>
              <Text style={styles.subscribeBtnText}>Subscribe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
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

  const creditBalance = wallet?.credit_balance ?? 0;

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
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
          {/* Credit Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>CREDIT BALANCE</Text>
            <Text style={styles.balanceAmount}>{creditBalance}</Text>
            <Text style={styles.creditSubLabel}>credits available</Text>

            {/* Top-up Button logic handled dynamically based on subscription status & admin flag */}
            {activeSub ? (
              showUi && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.addMoneyBtn} onPress={openCreditPacksModal}>
                    <Icon name="package-variant" size={22} color="#111111" />
                    <Text style={styles.actionText}>Top-up Credits</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              showUi && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.addMoneyBtn, { flex: 1 }]} onPress={() => setSubscriptionModalVisible(true)}>
                    <Icon name="crown" size={22} color="#111111" />
                    <Text style={styles.actionText}>Subscribe Now</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>

          {/* ── CONDITIONAL RENDERING BASED ON ADMIN CONFIGURATION (showUi) ── */}
          {showUi ? (
            <>
              {/* Active Subscription Card */}
              {activeSub && (
                <>
                  <Text style={styles.sectionTitle}>ACTIVE SUBSCRIPTION</Text>
                  <View style={styles.activeSubCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Icon name="crown" size={22} color="#111111" style={{ marginRight: 10 }} />
                      <Text style={styles.activeSubName}>{activeSub.plan.name}</Text>
                    </View>
                    <Text style={styles.activeSubDetail}>{activeSub.plan.credits_per_month} credits/month</Text>
                    <Text style={styles.activeSubDetail}>Renews: {formatDate(activeSub.current_period_end)}</Text>
                    <Text style={styles.activeSubDetail}>Auto-renew: {activeSub.auto_renew ? 'On' : 'Off'}</Text>
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
                    <Text style={[styles.tabText, activeTab === 'b2c' && styles.tabTextActive]}>B2C Plans</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'b2b' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('b2b')}
                  >
                    <Text style={[styles.tabText, activeTab === 'b2b' && styles.tabTextActive]}>B2B Plans</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subscription Plans List */}
              {!activeSub && (
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>AVAILABLE PLANS</Text>
                </View>
              )}
              {!activeSub && subscriptionPlans
                .filter((plan) => plan.audience.toLowerCase() === activeTab)
                .map((plan) => {
                  const isCurrent = activeSub?.plan?.id === plan.id;
                  return (
                    <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.planHeader}>
                          <Text style={styles.planName}>{plan.name}</Text>
                        </View>
                        <Text style={styles.planCredits}>{plan.credits_per_month} Credits/month</Text>
                      </View>
                      <View style={styles.planPriceCol}>
                        <Text style={styles.planPrice}>₹{parseFloat(plan.price_inr).toFixed(0)}</Text>
                        <Text style={styles.planPriceSub}>{cycleSuffix(plan.billing_cycle)}</Text>
                        {!isCurrent && (
                          <TouchableOpacity style={styles.subscribeBtn} onPress={() => handleActivateSubscription(plan)}>
                            <Text style={styles.subscribeBtnText}>Subscribe</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}

              {/* Credit Packs */}
              {activeSub && (
                <>
                  <View style={[styles.sectionRow, { marginTop: 24 }]}>
                    <Text style={styles.sectionTitle}>CREDIT PACKS</Text>
                  </View>
                  {creditPacks.map((pack) => (
                    <TouchableOpacity key={pack.id} style={styles.packCard} onPress={() => handlePurchasePack(pack)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.packName}>{pack.name}</Text>
                        <Text style={styles.packCredits}>{pack.credits} Credits</Text>
                        <Text style={styles.packRate}>@ ₹{pack.effective_rate}/credit</Text>
                      </View>
                      <View style={styles.packPriceCol}>
                        <Text style={styles.packPrice}>₹{parseFloat(pack.price_inr).toFixed(0)}</Text>
                        <View style={styles.buyBtn}>
                          <Text style={styles.buyBtnText}>Buy</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {/* Quick Actions (Always Visible) */}
              <View style={styles.quickActionsSection}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  activeOpacity={0.7}
                  onPress={() => setCouponModalVisible(true)}
                >
                  <Icon name="ticket-percent" size={20} color="#111111" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickActionTitle}>Redeem Coupon</Text>
                    <Text style={styles.quickActionDesc}>Enter coupon code for credits</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#AAAAAA" />
                </TouchableOpacity>
              </View>
            </>

          )
            :
            <>
              {/* information that we are initially distributing free credits */}
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Welcome to Feelvie!</Text>
                <Text style={styles.infoDesc}>Currently, we are distributing free 5 credits to all users. Enjoy exploring the platform and stay tuned for upcoming subscription plans and credit packs.</Text>
              </View>
            </>
          }


        </ScrollView>
      </SafeAreaView>

      {/* ─── Modals (Controlled by activeSub & showUi flags) ────────────────── */}

      {activeSub && showUi && (
        <Modal
          visible={creditPacksModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreditPacksModalVisible(false)}
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
                />
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCreditPacksModalVisible(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showUi && (
        <Modal
          visible={subscriptionModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSubscriptionModalVisible(false)}
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
                />
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSubscriptionModalVisible(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Coupon Redemption Modal */}
      <Modal
        visible={couponModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCouponModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="ticket-percent-outline" size={40} color="#111111" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Redeem Coupon</Text>
            <Text style={styles.modalSubtitle}>Enter your coupon code to claim credits</Text>
            <TextInput
              style={styles.couponInput}
              placeholder="e.g., WELCOME50"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={(val) => setCouponCode(val)}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCouponModalVisible(false); setCouponCode(''); }}>
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
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontFamily: 'Poppins-Medium', color: '#666666' },
  tabTextActive: { color: '#111111', fontFamily: 'Poppins-SemiBold' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  center: { justifyContent: 'center', alignItems: 'center' },
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
  balanceAmount: { fontSize: 38, fontFamily: 'Poppins-SemiBold', color: '#111111', marginBottom: 4 },
  creditSubLabel: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#AAAAAA', marginBottom: 20 },
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
  closeBtn: {
    marginTop: 12,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  actionText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#AAAAAA', marginTop: 12, fontFamily: 'Poppins-Regular' },
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
  buyBtn: { backgroundColor: '#111111', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
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
  activeBadge: { backgroundColor: '#111111', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  planCredits: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#555555' },
  planPriceCol: { alignItems: 'flex-end', gap: 4 },
  planPrice: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#111111' },
  planPriceSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#AAAAAA' },
  subscribeBtn: { marginTop: 6, backgroundColor: '#111111', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: width * 0.88,
    borderRadius: 8,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#111111', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', marginBottom: 16, fontFamily: 'Poppins-Regular' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0a0a0a', borderRadius: 8, alignItems: 'center' },
  confirmBtn: { flex: 1, paddingVertical: 15, backgroundColor: '#111111', borderRadius: 8, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#000000' },
  confirmText: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#fffefe' },
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
  quickActionsSection: { marginTop: 32, marginBottom: 16, paddingTop: 16 },
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
  quickActionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111', marginBottom: 2 },
  quickActionDesc: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#AAAAAA' },
  infoCard: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 16, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#111111', marginBottom: 8 },
  infoDesc: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#555555' },
});