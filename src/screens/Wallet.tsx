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
const BASE_URL = 'https://feelvie.yaytech.in';

interface Transaction {
  id: number;
  transaction_type: string;
  source: string;
  amount: string;
  description: string;
  created_at: string;
}

interface Withdrawal {
  id: number;
  amount: string;
  status: string;
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

interface WalletData {
  id: number;
  balance: string;
  updated_at: string;
  transactions: Transaction[];
}

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [bankSelectModalVisible, setBankSelectModalVisible] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  console.log('[WalletScreen] Component rendered / re-rendered');

  const fetchAllData = useCallback(async () => {
    console.log('[Wallet] Starting full data fetch...');
    if (!refreshing) setLoading(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('[Wallet] No access token found → redirecting to Login');
        navigation.navigate('Login');
        return;
      }
      console.log('[Wallet] Token retrieved successfully');

      // 1. Wallet balance + transactions
      console.log('[Wallet] Fetching wallet data from /api/wallet/me/');
      const walletRes = await fetch(`${BASE_URL}/api/wallet/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (walletRes.ok) {
        const data = await walletRes.json();
        console.log('[Wallet] Wallet data fetched:', JSON.stringify(data, null, 2));
        setWallet(data);
      } else {
        console.log('[Wallet] Wallet fetch failed with status:', walletRes.status);
      }

      // 2. Withdrawals
      console.log('[Wallet] Fetching withdrawals from /api/wallet/withdrawals/');
      const withdrawRes = await fetch(`${BASE_URL}/api/wallet/withdrawals/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (withdrawRes.ok) {
        const wd = await withdrawRes.json();
        console.log('[Wallet] Withdrawals fetched:', wd);
        setWithdrawals(Array.isArray(wd) ? wd : []);
      } else {
        console.log('[Wallet] Withdrawals fetch failed:', withdrawRes.status);
      }

      // 3. Bank details (array support)
      console.log('[Wallet] Fetching bank details from /api/auth/bank-details/');
      const bankRes = await fetch(`${BASE_URL}/api/auth/bank-details/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (bankRes.ok) {
        const banks = await bankRes.json();
        console.log('[Wallet] Bank details fetched:', banks);
        const bankArray = Array.isArray(banks) ? banks : [];
        setBankDetails(bankArray);

        // Auto-select logic
        if (bankArray.length === 1) {
          console.log('[Wallet] Only 1 bank account → auto-selecting it');
          setSelectedBank(bankArray[0]);
        } else if (bankArray.length > 1) {
          console.log('[Wallet] Multiple bank accounts found → user must choose');
          setSelectedBank(null);
        } else {
          console.log('[Wallet] No bank accounts linked');
          setSelectedBank(null);
        }
      } else {
        console.log('[Wallet] Bank details fetch failed:', bankRes.status);
      }
    } catch (err) {
      console.error('[Wallet] Fetch error:', err);
    } finally {
      console.log('[Wallet] All data fetching completed');
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, refreshing]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    console.log('[Wallet] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchAllData();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ── Add Money (Razorpay) ───────────────────────────────────────────────
  const handleAddMoney = async () => {
    console.log('[AddMoney] Add money requested. Amount:', addMoneyAmount);
    const amt = parseFloat(addMoneyAmount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert('Invalid Amount', 'Minimum amount is ₹10');
      console.log('[AddMoney] Invalid amount entered');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[AddMoney] Sending add-money request to backend');
      const res = await fetch(`${BASE_URL}/api/wallet/add-money/`, {  // Adjust endpoint if needed
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: amt.toString() }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.log('[AddMoney] Add money init failed:', errText);
        throw new Error('Failed to initialize payment');
      }

      const paymentData = await res.json();
      console.log('[AddMoney] Razorpay order created:', paymentData);

      const options = {
        description: 'Add Money to Feelvie Wallet',
        currency: 'INR',
        key: paymentData.razorpay_key_id,
        amount: paymentData.amount.toString(),
        order_id: paymentData.razorpay_order_id,
        name: 'Feelvie',
        theme: { color: '#B03385' },
      };

      console.log('[AddMoney] Opening Razorpay checkout...');
      const razorpayResponse = await RazorpayCheckout.open(options);
      console.log('[AddMoney] Razorpay payment success:', razorpayResponse);

      // Verify payment
      console.log('[AddMoney] Verifying payment with backend');
      const verifyRes = await fetch(`${BASE_URL}/api/wallet/verify-add-money/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        }),
      });

      if (verifyRes.ok) {
        console.log('[AddMoney] Payment verified successfully');
        Alert.alert('Success', `₹${amt} added to your wallet!`);
        setAddMoneyModalVisible(false);
        setAddMoneyAmount('');
        fetchAllData();
      } else {
        console.log('[AddMoney] Verification failed');
        Alert.alert('Payment Failed', 'Transaction could not be verified');
      }
    } catch (err: any) {
      console.error('[AddMoney] Error during add money:', err);
      if (err.code === 'payment_cancelled') {
        Alert.alert('Cancelled', 'Payment was cancelled by user');
      } else {
        Alert.alert('Error', err.message || 'Failed to add money');
      }
    }
  };

  // ── Withdraw Flow ─────────────────────────────────────────────────────
  const initiateWithdraw = () => {
    console.log('[Withdraw] Withdraw button pressed');
    if (bankDetails.length === 0) {
      console.log('[Withdraw] No banks linked → showing alert');
      Alert.alert(
        'No Bank Account',
        'Please add your bank details first to withdraw money.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Bank',
            onPress: () => {
              console.log('[Withdraw] Navigating to PaymentInfo to add bank');
              navigation.navigate('PaymentInfoScreen');
            },
          },
        ]
      );
      return;
    }

    if (bankDetails.length === 1) {
      console.log('[Withdraw] Single bank found → auto selecting');
      setSelectedBank(bankDetails[0]);
      setWithdrawModalVisible(true);
    } else {
      console.log('[Withdraw] Multiple banks → opening bank selection modal');
      setBankSelectModalVisible(true);
    }
  };

  const selectBank = (bank: BankDetail) => {
    console.log('[BankSelect] User selected bank:', bank.id, bank.account_holder_name);
    setSelectedBank(bank);
    setBankSelectModalVisible(false);
    setWithdrawModalVisible(true);
  };

  const handleWithdraw = async () => {
    console.log('[Withdraw] Submit withdrawal request. Selected bank:', selectedBank?.id);
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      console.log('[Withdraw] Invalid withdrawal amount');
      return;
    }

    if (!selectedBank) {
      Alert.alert('No Bank Selected', 'Please select a bank account');
      console.log('[Withdraw] No bank selected');
      return;
    }

    const currentBalance = parseFloat(wallet?.balance || '0');
    if (amt > currentBalance) {
      Alert.alert('Insufficient Balance', `You have only ₹${currentBalance.toFixed(0)} available`);
      console.log('[Withdraw] Insufficient balance. Required:', amt, 'Available:', currentBalance);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[Withdraw] Sending withdrawal request to /api/wallet/withdrawals/');
      const res = await fetch(`${BASE_URL}/api/wallet/withdrawals/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          bank_details: selectedBank.id, // sending selected bank ID
        }),
      });

      if (res.ok) {
        console.log('[Withdraw] Withdrawal request submitted successfully');
        Alert.alert('Success', 'Your withdrawal request has been submitted.');
        setWithdrawModalVisible(false);
        setWithdrawAmount('');
        setBankSelectModalVisible(false);
        fetchAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.log('[Withdraw] Withdrawal API error:', errData);
        Alert.alert('Failed', errData.detail || 'Could not process withdrawal request');
      }
    } catch (err) {
      console.error('[Withdraw] Network or unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const amt = parseFloat(item.amount);
    const isCredit = amt >= 0;

    return (
      <View style={styles.transactionItem}>
        <Icon
          name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
          size={28}
          color={isCredit ? '#10b981' : '#ef4444'}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.transactionDesc}>
            {item.description || item.source || item.transaction_type}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isCredit ? '#10b981' : '#ef4444' },
          ]}
        >
          {isCredit ? '+' : ''}₹{Math.abs(amt).toFixed(0)}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B03385" />
        </View>
      </SafeAreaView>
    );
  }

  const balance = wallet?.balance || '0.00';

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#B03385', '#ec4899']}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>₹{parseFloat(balance).toFixed(0)}</Text>

          <View style={styles.actionRow}>
            {/* <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
              onPress={() => {
                console.log('[UI] Add Money button pressed');
                setAddMoneyModalVisible(true);
              }}
            >
              <Icon name="plus-circle" size={22} color="#fff" />
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#B03385' }]}
              onPress={() => {
                console.log('[UI] Withdraw button pressed');
                initiateWithdraw();
              }}
            >
              <Icon name="bank-transfer" size={22} color="#fff" />
              <Text style={styles.actionText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {wallet?.transactions?.length > 0 ? (
          <FlatList
            data={wallet.transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="history" size={60} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}

        {/* Pending Withdrawals */}
        {withdrawals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pending Withdrawals</Text>
            {withdrawals.map((w) => (
              <View key={w.id} style={styles.withdrawalItem}>
                <Text style={styles.withdrawalAmount}>₹{parseFloat(w.amount).toFixed(0)}</Text>
                <Text
                  style={[
                    styles.withdrawalStatus,
                    w.status === 'pending' && { color: '#f59e0b' },
                    w.status === 'approved' && { color: '#10b981' },
                    w.status === 'rejected' && { color: '#ef4444' },
                  ]}
                >
                  {w.status.toUpperCase()}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Money Modal */}
      <Modal
        visible={addMoneyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMoneyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount (min ₹10)"
               placeholderTextColor="#ccc"
              keyboardType="numeric"
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddMoneyModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddMoney}>
                <Text style={styles.confirmText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Amount Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw to Bank</Text>

            {selectedBank && (
              <View style={styles.selectedBankPreview}>
                <Icon name="bank" size={28} color="#B03385" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 16 }}>
                    {selectedBank.account_holder_name}
                  </Text>
                  <Text style={{ color: '#555', fontSize: 14 }}>
                    •••• •••• •••• {selectedBank.account_number.slice(-4)}
                  </Text>
                  <Text style={{ color: '#777', fontSize: 13 }}>
                    IFSC: {selectedBank.ifsc_code}
                  </Text>
                </View>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Enter amount "
              placeholderTextColor="#ada7a7"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleWithdraw}>
                <Text style={styles.confirmText}>Request </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Selection Modal (Dropdown/Overlay style) */}
      <Modal
        visible={bankSelectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBankSelectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: width * 0.8 }]}>
            <Text style={styles.modalTitle}>Select Bank Account</Text>
            <Text style={{ color: '#666', marginBottom: 16, textAlign: 'center' }}>
              Choose the account you want to withdraw to
            </Text>

            <FlatList
              data={bankDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankSelectItem}
                  onPress={() => selectBank(item)}
                >
                  <Icon name="bank" size={26} color="#B03385" style={{ marginRight: 16 }} />
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
              style={[styles.cancelBtn, { marginTop: 20 }]}
              onPress={() => setBankSelectModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => {
                console.log('[BankSelect] Navigating to add new bank');
                setBankSelectModalVisible(false);
                navigation.navigate('PaymentInfo');
              }}
            >
              <Text style={{ color: '#B03385', fontWeight: '600', fontSize: 15 }}>
                + Add New Bank Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 29,
    fontWeight: '600',
    color: '#B00385',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#c0bcbc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    // shadowRadius: 8,
  },
  balanceLabel: { fontSize: 22, color: '#4b4a4a', marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#B03385', marginBottom: 20 },

  actionRow: { flexDirection: 'row', width: '40%', gap: 16},
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 30,
    gap: 0,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  transactionDesc: { fontSize: 15, fontWeight: '600', color: '#222' },
  transactionDate: { fontSize: 13, color: '#777', marginTop: 3 },
  transactionAmount: { fontSize: 16, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, color: '#777', marginTop: 12 },

  withdrawalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  withdrawalAmount: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  withdrawalStatus: { fontSize: 14, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: width * 0.88,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f1f1f1',
    borderRadius: 30,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#B03385',
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelText: { fontWeight: '600', color: '#333' },
  confirmText: { fontWeight: '700', color: '#fff' },

  selectedBankPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },

  bankSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  bankSelectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  bankSelectNumber: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  bankSelectIfsc: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
});