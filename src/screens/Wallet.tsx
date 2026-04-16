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
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankDetail | null>(null);

  // Credits ecosystem
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<MySubscription[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'wallet' | 'credits'>('wallet');

  // Modal visibility
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [bankSelectModalVisible, setBankSelectModalVisible] = useState(false);
  const [creditPacksModalVisible, setCreditPacksModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);

  // Input values
  const [withdrawAmount, setWithdrawAmount] = useState('');
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

      const [walletRes, withdrawRes, bankRes, packsRes, plansRes, subsRes] =
        await Promise.all([
          fetch(`${BASE_URL}/api/wallet/me/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/withdrawals/`, { headers }),
          fetch(`${BASE_URL}/api/auth/bank-details/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/credit-packs/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/subscription-plans/`, { headers }),
          fetch(`${BASE_URL}/api/wallet/subscriptions/me/`, { headers }),
        ]);

      console.log('[fetchAllData] API response statuses:', {
        wallet: walletRes.status,
        withdrawals: withdrawRes.status,
        bankDetails: bankRes.status,
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

      if (withdrawRes.ok) {
        const wd = await withdrawRes.json();
        const wdArray = Array.isArray(wd) ? wd : [];
        console.log('[fetchAllData] ✅ Withdrawals count:', wdArray.length, wdArray);
        setWithdrawals(wdArray);
      } else {
        console.warn('[fetchAllData] ❌ Withdrawals fetch failed. Status:', withdrawRes.status);
      }

      if (bankRes.ok) {
        const banks = await bankRes.json();
        const bankArray = Array.isArray(banks) ? banks : [];
        console.log('[fetchAllData] ✅ Bank details count:', bankArray.length);
        bankArray.forEach((b: BankDetail, i: number) =>
          console.log(`  Bank[${i}]:`, b.id, b.account_holder_name, '****' + b.account_number.slice(-4))
        );
        setBankDetails(bankArray);
        if (bankArray.length === 1) {
          console.log('[fetchAllData] Single bank auto-selected:', bankArray[0].id);
          setSelectedBank(bankArray[0]);
        } else {
          console.log('[fetchAllData] Multiple or zero banks found → no auto-select');
          setSelectedBank(null);
        }
      } else {
        console.warn('[fetchAllData] ❌ Bank details fetch failed. Status:', bankRes.status);
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
    onSuccess,
  }: {
    token: string;
    description: string;
    onSuccess: (
      paymentId: string,
      razorpayOrderId: string,
      signature: string
    ) => Promise<void>;
  }) => {
    console.log('[openRazorpay] Initiating payment. Description:', description);

    // Step 1 — Create Razorpay order
    console.log('[openRazorpay] Step 1: Creating Razorpay order via /api/secure/make-payment/');
    const makePaymentRes = await fetch(`${BASE_URL}/api/secure/make-payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ description }),
    });

    console.log('[openRazorpay] make-payment response status:', makePaymentRes.status);
    if (!makePaymentRes.ok) {
      console.error('[openRazorpay] ❌ Failed to create Razorpay order');
      throw new Error('Failed to initialize payment');
    }
    const paymentData = await makePaymentRes.json();
    console.log('[openRazorpay] Razorpay order created:', {
      razorpay_order_id: paymentData.razorpay_order_id,
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
    const phone = userData.phone || '9999999999';
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

    // Step 3 — Verify payment
    console.log('[openRazorpay] Step 3: Verifying payment via /api/secure/verify-payment/');
    const verifyRes = await fetch(`${BASE_URL}/api/secure/verify-payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      }),
    });

    console.log('[openRazorpay] verify-payment response status:', verifyRes.status);
    if (!verifyRes.ok) {
      console.error('[openRazorpay] ❌ Payment verification request failed');
      throw new Error('Payment verification failed');
    }
    const verifyData = await verifyRes.json();
    console.log('[openRazorpay] Verification response:', verifyData);

    const isSuccess = ['paid', 'captured', 'success'].includes(
      verifyData.payment_status?.toLowerCase()
    );
    console.log('[openRazorpay] Payment status:', verifyData.payment_status, '→ isSuccess:', isSuccess);

    if (!isSuccess) {
      console.error('[openRazorpay] ❌ Payment not marked as successful');
      throw new Error('Payment not successful: ' + (verifyData.payment_status || 'unknown'));
    }

    // Step 4 — Call success callback
    console.log('[openRazorpay] Step 4: Calling onSuccess callback');
    await onSuccess(
      razorpayResponse.razorpay_payment_id,
      razorpayResponse.razorpay_order_id,
      razorpayResponse.razorpay_signature,
    );
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
        onSuccess: async (paymentId) => {
          console.log('[handlePurchasePack] onSuccess called. paymentId:', paymentId);
          console.log('[handlePurchasePack] Posting to /api/wallet/credits/purchase-pack/');
          const purchaseRes = await fetch(`${BASE_URL}/api/wallet/credits/purchase-pack/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pack_id: pack.id,
              payment_successful: true,
              payment_reference: paymentId,
            }),
          });

          console.log('[handlePurchasePack] purchase-pack response status:', purchaseRes.status);
          if (purchaseRes.ok) {
            const purchaseData = await purchaseRes.json();
            console.log('[handlePurchasePack] ✅ Pack purchased successfully:', purchaseData);
            Alert.alert('Success', `${pack.credits} credits added to your account!`);
            setCreditPacksModalVisible(false);
            fetchAllData();
          } else {
            const err = await purchaseRes.json().catch(() => ({}));
            console.error('[handlePurchasePack] ❌ Purchase failed:', err);
            Alert.alert('Failed', err.detail || 'Could not complete purchase');
          }
        },
      });
    } catch (err: any) {
      console.error('[handlePurchasePack] Error:', err?.code, err?.message);
      if (err.code === 'payment_cancelled') {
        Alert.alert('Cancelled', 'Payment was cancelled');
      } else {
        Alert.alert('Error', err.message || 'Failed to purchase pack');
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
        onSuccess: async (paymentId) => {
          console.log('[handleActivateSubscription] onSuccess called. paymentId:', paymentId);
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
                payment_successful: true,
                payment_reference: paymentId,
              }),
            }
          );

          console.log('[handleActivateSubscription] activate-subscription response status:', activateRes.status);
          if (activateRes.ok) {
            const activateData = await activateRes.json();
            console.log('[handleActivateSubscription] ✅ Subscription activated:', activateData);
            Alert.alert('Success', `Subscribed to ${plan.name}!`);
            setSubscriptionModalVisible(false);
            fetchAllData();
          } else {
            const err = await activateRes.json().catch(() => ({}));
            console.error('[handleActivateSubscription] ❌ Activation failed:', err);
            Alert.alert('Failed', err.detail || 'Could not activate subscription');
          }
        },
      });
    } catch (err: any) {
      console.error('[handleActivateSubscription] Error:', err?.code, err?.message);
      if (err.code === 'payment_cancelled') {
        Alert.alert('Cancelled', 'Payment was cancelled');
      } else {
        Alert.alert('Error', err.message || 'Failed to activate subscription');
      }
    }
  };

  // ─── Redeem Coupon ──────────────────────────────────────────────────────────

  const handleRedeemCoupon = async () => {
    console.log('[handleRedeemCoupon] Attempting to redeem code:', couponCode.trim());
    if (!couponCode.trim()) {
      console.warn('[handleRedeemCoupon] Empty coupon code — aborting');
      Alert.alert('Invalid', 'Please enter a coupon code');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[handleRedeemCoupon] Token:', token ? '✅' : '❌ missing');
      if (!token) { navigation.navigate('Login'); return; }

      console.log('[handleRedeemCoupon] Posting to /api/wallet/credits/redeem-coupon/ with code:', couponCode.trim().toUpperCase());
      const res = await fetch(`${BASE_URL}/api/wallet/credits/redeem-coupon/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
      });

      console.log('[handleRedeemCoupon] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[handleRedeemCoupon] ✅ Coupon redeemed successfully:', data);
        const credited = data.transactions?.[0]?.amount || '';
        console.log('[handleRedeemCoupon] Amount credited:', credited || '(not in response)');
        Alert.alert(
          'Coupon Redeemed!',
          credited ? `₹${credited} credited to your wallet.` : 'Coupon applied successfully!'
        );
        setCouponModalVisible(false);
        setCouponCode('');
        fetchAllData();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[handleRedeemCoupon] ❌ Coupon redemption failed:', err);
        Alert.alert(
          'Invalid Coupon',
          err.detail || err.code?.[0] || 'Coupon could not be redeemed'
        );
      }
    } catch (error) {
      console.error('[handleRedeemCoupon] 🔴 Unexpected error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // ── Withdraw Flow ─────────────────────────────────────────────────────────

  const initiateWithdraw = () => {
    console.log('[initiateWithdraw] Withdraw button pressed');
    console.log('[initiateWithdraw] Bank details available:', bankDetails.length);

    if (bankDetails.length === 0) {
      console.warn('[initiateWithdraw] No banks linked → showing alert');
      Alert.alert(
        'No Bank Account',
        'Please add your bank details first to withdraw money.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Bank',
            onPress: () => {
              console.log('[initiateWithdraw] User tapped "Add Bank" → navigating to PaymentInfoScreen');
              navigation.navigate('PaymentInfoScreen');
            },
          },
        ]
      );
      return;
    }

    if (bankDetails.length === 1) {
      console.log('[initiateWithdraw] Single bank → auto-selecting:', bankDetails[0].id, bankDetails[0].account_holder_name);
      setSelectedBank(bankDetails[0]);
      setWithdrawModalVisible(true);
    } else {
      console.log('[initiateWithdraw] Multiple banks (' + bankDetails.length + ') → opening bank selection modal');
      setBankSelectModalVisible(true);
    }
  };

  const selectBank = (bank: BankDetail) => {
    console.log('[selectBank] User selected bank:', { id: bank.id, name: bank.account_holder_name, last4: bank.account_number.slice(-4) });
    setSelectedBank(bank);
    setBankSelectModalVisible(false);
    setWithdrawModalVisible(true);
  };

  const handleWithdraw = async () => {
    console.log('[handleWithdraw] Submit withdrawal. Amount entered:', withdrawAmount, 'Selected bank:', selectedBank?.id);
    const amt = parseFloat(withdrawAmount);

    if (isNaN(amt) || amt <= 0) {
      console.warn('[handleWithdraw] Invalid amount:', withdrawAmount);
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!selectedBank) {
      console.warn('[handleWithdraw] No bank selected');
      Alert.alert('No Bank Selected', 'Please select a bank account');
      return;
    }

    const currentBalance = parseFloat(wallet?.balance || '0');
    console.log('[handleWithdraw] Balance check → requested:', amt, 'available:', currentBalance);
    if (amt > currentBalance) {
      console.warn('[handleWithdraw] ❌ Insufficient balance');
      Alert.alert('Insufficient Balance', `You have only ₹${currentBalance.toFixed(0)} available`);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[handleWithdraw] Token:', token ? '✅' : '❌ missing');
      console.log('[handleWithdraw] Posting to /api/wallet/withdrawals/ →', { amount: withdrawAmount, bank_details: selectedBank.id });

      const res = await fetch(`${BASE_URL}/api/wallet/withdrawals/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          bank_details: selectedBank.id,
        }),
      });

      console.log('[handleWithdraw] Response status:', res.status);
      if (res.ok) {
        const resData = await res.json();
        console.log('[handleWithdraw] ✅ Withdrawal submitted successfully:', resData);
        Alert.alert('Success', 'Your withdrawal request has been submitted.');
        setWithdrawModalVisible(false);
        setWithdrawAmount('');
        setBankSelectModalVisible(false);
        fetchAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('[handleWithdraw] ❌ Withdrawal API error:', errData);
        Alert.alert('Failed', errData.detail || 'Could not process withdrawal request');
      }
    } catch (err) {
      console.error('[handleWithdraw] 🔴 Network or unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // ─── Tab Change ─────────────────────────────────────────────────────────────

  const handleTabChange = (tab: 'wallet' | 'credits') => {
    console.log('[TabBar] Switching to tab:', tab);
    setActiveTab(tab);
  };

  // ─── Modal Toggles (logged) ─────────────────────────────────────────────────

  const openCouponModal = () => {
    console.log('[Modal] Opening Coupon modal');
    setCouponModalVisible(true);
  };

  const openCreditPacksModal = () => {
    console.log('[Modal] Opening Credit Packs modal. Packs available:', creditPacks.length);
    setCreditPacksModalVisible(true);
  };

  const openSubscriptionModal = () => {
    console.log('[Modal] Opening Subscription Plans modal. Plans available:', subscriptionPlans.length);
    setSubscriptionModalVisible(true);
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const amt = parseFloat(item.amount);
    const isCredit = amt >= 0;
    return (
      <View style={styles.transactionItem}>
        <Icon
          name={isCredit ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
          size={28}
          color="#111111"
          style={{ marginRight: 16 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.transactionDesc}>
            {item.description || item.source || item.transaction_type}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: '#111111' }]}>
          {isCredit ? '+' : ''}₹{Math.abs(amt).toFixed(0)}
        </Text>
      </View>
    );
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
  console.log('[WalletScreen] Rendering main UI. balance:', balance, 'creditBalance:', creditBalance, 'activeTab:', activeTab);

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { console.log('[Header] Back button pressed'); navigation.goBack(); }}>
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.tabActive]}
          onPress={() => handleTabChange('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
            Money Wallet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'credits' && styles.tabActive]}
          onPress={() => handleTabChange('credits')}
        >
          <Text style={[styles.tabText, activeTab === 'credits' && styles.tabTextActive]}>
            Credits
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#111111']} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── WALLET TAB ── */}
        {activeTab === 'wallet' && (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>WALLET BALANCE</Text>
              <Text style={styles.balanceAmount}>₹ {parseFloat(balance).toFixed(0)}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.withdrawBtn} onPress={initiateWithdraw}>
                  <Icon name="bank-transfer" size={22} color="#FFFFFF" />
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
              </View>

              {/* Coupon Row */}
              <TouchableOpacity
                style={styles.couponRow}
                onPress={openCouponModal}
              >
                <Icon name="ticket-percent-outline" size={18} color="#111111" />
                <Text style={styles.couponRowText}>Redeem a Coupon Code</Text>
                <Icon name="chevron-right" size={18} color="#AAAAAA" />
              </TouchableOpacity>
            </View>

            {/* Recent Transactions */}
            <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
            {wallet?.transactions?.length > 0 ? (
              <FlatList
                data={wallet.transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="history" size={60} color="#AAAAAA" />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            )}

            {/* Pending Withdrawals */}
            {withdrawals.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>PENDING WITHDRAWALS</Text>
                {withdrawals.map((w) => (
                  <View key={w.id} style={styles.withdrawalItem}>
                    <View>
                      <Text style={styles.withdrawalAmount}>
                        ₹{parseFloat(w.amount).toFixed(0)}
                      </Text>
                      {w.account_holder_name_snapshot && (
                        <Text style={styles.withdrawalBank}>
                          {w.account_holder_name_snapshot} ••••
                          {w.account_number_snapshot?.slice(-4)}
                        </Text>
                      )}
                      <Text style={styles.withdrawalDate}>{formatDate(w.created_at)}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        w.status === 'approved' && styles.statusApproved,
                        w.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      <Text style={styles.statusText}>{w.status.toUpperCase()}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── CREDITS TAB ── */}
        {activeTab === 'credits' && (
          <>
            {/* Credit Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>CREDIT BALANCE</Text>
              <Text style={styles.balanceAmount}>{creditBalance}</Text>
              <Text style={styles.creditSubLabel}>credits available</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.addMoneyBtn}
                  onPress={openCreditPacksModal}
                >
                  <Icon name="package-variant" size={22} color="#111111" />
                  <Text style={styles.actionText}>Buy Credits</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={openSubscriptionModal}
                >
                  <Icon name="crown-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.withdrawText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
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

            {/* Subscription Plans Preview */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>SUBSCRIPTION PLANS</Text>
              <TouchableOpacity onPress={openSubscriptionModal}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {subscriptionPlans.slice(0, 2).map((plan) => {
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

            {/* Credit Packs Preview */}
            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>CREDIT PACKS</Text>
              <TouchableOpacity onPress={openCreditPacksModal}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {creditPacks.slice(0, 3).map((pack) => (
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
      </ScrollView>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Withdraw Amount Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { console.log('[Modal] Withdraw modal closed via back press'); setWithdrawModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw to Bank</Text>
            {selectedBank && (
              <View style={styles.selectedBankPreview}>
                <Icon name="bank" size={28} color="#111111" />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={styles.bankName}>{selectedBank.account_holder_name}</Text>
                  <Text style={styles.bankNumber}>
                    •••• •••• •••• {selectedBank.account_number.slice(-4)}
                  </Text>
                  <Text style={styles.bankIfsc}>IFSC: {selectedBank.ifsc_code}</Text>
                </View>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="#AAAAAA"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={(val) => { console.log('[WithdrawModal] Amount changed:', val); setWithdrawAmount(val); }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { console.log('[WithdrawModal] Cancel pressed'); setWithdrawModalVisible(false); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleWithdraw}>
                <Text style={styles.confirmText}>Request Withdrawal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Selection Modal */}
      <Modal
        visible={bankSelectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { console.log('[Modal] Bank select modal closed via back press'); setBankSelectModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: width * 0.9 }]}>
            <Text style={styles.modalTitle}>Select Bank Account</Text>
            <Text style={styles.modalSubtitle}>Choose the account for withdrawal</Text>
            <FlatList
              data={bankDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankSelectItem}
                  onPress={() => selectBank(item)}
                >
                  <Icon
                    name="bank"
                    size={26}
                    color="#111111"
                    style={{ marginRight: 16 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankSelectName}>{item.account_holder_name}</Text>
                    <Text style={styles.bankSelectNumber}>
                      •••• •••• •••• {item.account_number.slice(-4)}
                    </Text>
                    <Text style={styles.bankSelectIfsc}>IFSC: {item.ifsc_code}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => { console.log('[BankSelectModal] Cancel pressed'); setBankSelectModalVisible(false); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addNewBank}
              onPress={() => {
                console.log('[BankSelectModal] "Add New Bank" pressed → navigating to PaymentInfoScreen');
                setBankSelectModalVisible(false);
                navigation.navigate('PaymentInfoScreen');
              }}
            >
              <Text style={styles.addNewBankText}>+ Add New Bank Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Coupon Modal */}
      <Modal
        visible={couponModalVisible}
        transparent
        animationType="slide"
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
            <TextInput
              style={styles.input}
              placeholder="Enter coupon code (e.g. WELCOME50)"
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

      {/* Credit Packs Modal */}
      <Modal
        visible={creditPacksModalVisible}
        transparent
        animationType="slide"
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

      {/* Subscription Plans Modal */}
      <Modal
        visible={subscriptionModalVisible}
        transparent
        animationType="slide"
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
    </SafeAreaView>
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
});