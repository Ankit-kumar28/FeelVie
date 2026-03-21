import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BankDetails = {
  id: number;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string;
  created_at: string;
};

type BankForm = {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
};

type Errors = Partial<Record<keyof BankForm, string>>;

const initialBank: BankForm = {
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
};

export default function PaymentInfoScreen({ navigation }) {
  const [savedBank, setSavedBank] = useState<BankDetails | null>(null);
  const [formBank, setFormBank] = useState<BankForm>(initialBank);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('https://feelvie.yaytech.in/api/auth/bank-details/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const sorted = data.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setSavedBank(sorted[0]);
      } else {
        setSavedBank(null);
      }
    } catch (err) {
      console.error('Failed to load bank details:', err);
    }
  };

  const validateForm = () => {
    const newErrors: Errors = {};

    if (!formBank.account_holder_name.trim()) newErrors.account_holder_name = 'Required';
    if (!formBank.account_number.trim()) newErrors.account_number = 'Required';
    else if (!/^\d{9,18}$/.test(formBank.account_number.trim()))
      newErrors.account_number = '9–18 digits';

    if (!formBank.ifsc_code.trim()) newErrors.ifsc_code = 'Required';
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formBank.ifsc_code.trim().toUpperCase()))
      newErrors.ifsc_code = 'Invalid IFSC';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveBankDetails = async () => {
    setApiError(null);
    if (!validateForm()) return;

    setBankLoading(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Session expired');

      const payload = {
        account_holder_name: formBank.account_holder_name.trim(),
        account_number: formBank.account_number.trim(),
        ifsc_code: formBank.ifsc_code.trim().toUpperCase(),
        upi_id: formBank.upi_id.trim() || null,
      };

      const response = await fetch('https://feelvie.yaytech.in/api/auth/bank-details/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || errData.message || 'Save failed');
      }

      setShowSuccessModal(true);
      fetchBankDetails();
      setFormBank(initialBank);
      setErrors({});
      setApiError(null);
      setShowForm(false);

      setTimeout(() => setShowSuccessModal(false), 2600);
    } catch (error: any) {
      setApiError(error.message || 'Failed to save. Try again.');
    } finally {
      setBankLoading(false);
    }
  };

  const resetForm = () => {
    setFormBank(initialBank);
    setErrors({});
    setApiError(null);
  };

  const openAddForm = () => {
    if (savedBank) {
      setShowLimitModal(true);
    } else {
      resetForm();
      setShowForm(true);
    }
  };

  const maskedAccount = savedBank
    ? `••••••••${savedBank.account_number.slice(-4)}`
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Info</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {savedBank ? (
          <View style={styles.savedCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconCircle}>
                  <Icon name="bank-outline" size={26} color="#ffffff" />
                </View>
                <Text style={styles.cardTitle}>Bank Account</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.holderName}>{savedBank.account_holder_name}</Text>
            <Text style={styles.accountNumber}>{maskedAccount}</Text>
            <Text style={styles.ifsc}>IFSC: {savedBank.ifsc_code}</Text>
            {savedBank.upi_id && (
              <Text style={styles.upi}>UPI: {savedBank.upi_id}</Text>
            )}

            <View style={styles.activeLabelContainer}>
              <Text style={styles.activeLabel}>ACTIVE</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="bank-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Bank Details Added</Text>
            <Text style={styles.emptySubtitle}>
              Add your bank account to receive rent payouts securely
            </Text>

            <TouchableOpacity
              style={styles.addBankButton}
              onPress={openAddForm}
              activeOpacity={0.85}
            >
              <Icon name="plus-circle-outline" size={26} color="#ffffff" style={{ marginRight: 12 }} />
              <Text style={styles.addBankButtonText}>Add Bank Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB - only shown when bank is already saved */}
      {savedBank && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddForm}
          activeOpacity={0.82}
        >
          <Icon name="plus" size={30} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Add Form Overlay */}
      {showForm && (
        <View style={styles.formOverlay}>
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Icon name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Add Bank Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {apiError && (
              <View style={styles.apiErrorContainer}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formContent}>
                <Text style={styles.inputLabel}>Account Holder Name *</Text>
                <TextInput
                  style={[styles.input, errors.account_holder_name && styles.inputError]}
                  placeholder="Name as in bank account"
                  placeholderTextColor="#9ca3af"
                  value={formBank.account_holder_name}
                  onChangeText={(t) => {
                    setFormBank({ ...formBank, account_holder_name: t });
                    if (errors.account_holder_name) setErrors({ ...errors, account_holder_name: undefined });
                  }}
                />
                {errors.account_holder_name && <Text style={styles.errorText}>{errors.account_holder_name}</Text>}

                <Text style={styles.inputLabel}>Account Number *</Text>
                <TextInput
                  style={[styles.input, errors.account_number && styles.inputError]}
                  placeholder="Bank account number"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                  value={formBank.account_number}
                  onChangeText={(t) => {
                    setFormBank({ ...formBank, account_number: t });
                    if (errors.account_number) setErrors({ ...errors, account_number: undefined });
                  }}
                />
                {errors.account_number && <Text style={styles.errorText}>{errors.account_number}</Text>}

                <Text style={styles.inputLabel}>IFSC Code *</Text>
                <TextInput
                  style={[styles.input, errors.ifsc_code && styles.inputError]}
                  placeholder="e.g. SBIN0001234"
                  autoCapitalize="characters"
                  placeholderTextColor="#9ca3af"
                  value={formBank.ifsc_code}
                  onChangeText={(t) => {
                    setFormBank({ ...formBank, ifsc_code: t });
                    if (errors.ifsc_code) setErrors({ ...errors, ifsc_code: undefined });
                  }}
                />
                {errors.ifsc_code && <Text style={styles.errorText}>{errors.ifsc_code}</Text>}

                <Text style={styles.inputLabel}>UPI ID (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="yourname@upi"
                  placeholderTextColor="#9ca3af"
                  value={formBank.upi_id}
                  onChangeText={(t) => setFormBank({ ...formBank, upi_id: t })}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, bankLoading && styles.disabledBtn]}
                  onPress={saveBankDetails}
                  disabled={bankLoading}
                >
                  {bankLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Save Bank Details</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <View style={styles.successIconCircle}>
              <Icon name="check-circle" size={64} color="#ffffff" />
            </View>
            <Text style={styles.successTitle}>Saved Successfully!</Text>
            <Text style={styles.successMessage}>Your bank account is ready for payouts.</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Can't add more accounts modal */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.limitModalOverlay}>
          <View style={styles.limitModalContainer}>
            <Icon name="information-outline" size={56} color="#B03385" style={{ marginBottom: 16 }} />
            <Text style={styles.limitModalTitle}>Limit Reached</Text>
            <Text style={styles.limitModalMessage}>
              You can only add one bank account at this time. Contact support if you need to update or change your details.
            </Text>
            <TouchableOpacity
              style={styles.limitModalButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={styles.limitModalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B03385',
  },

  scrollContent: {
    padding: 0,
    paddingBottom: 140,
  },

  // ── Saved Bank Card ──────────────────────────────────────
  savedCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B03385',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  holderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  accountNumber: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#1e293b',
    marginBottom: 12,
  },
  ifsc: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 6,
  },
  upi: {
    fontSize: 15,
    color: '#4b5563',
  },
  activeLabelContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },

  // ── Empty State ──────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 160,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 28,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  addBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B03385',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: '#B03385',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 8,
  },
  addBankButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#B03385',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 10,
  },

  // ── Form Overlay ─────────────────────────────────────────
  formOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 20,
  },
  formContainer: { flex: 1 },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  formContent: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#B03385',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
  },
  saveText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#9ca3af',
  },
  apiErrorContainer: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    margin: 20,
  },
  apiErrorText: {
    color: '#b91c1c',
    fontSize: 15,
    textAlign: 'center',
  },

  // ── Success Modal ────────────────────────────────────────
  successModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  successModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 36,
    width: '84%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  successIconCircle: {
    backgroundColor: '#10b981',
    borderRadius: 999,
    padding: 24,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successButton: {
    backgroundColor: '#B03385',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 16,
  },
  successButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },

  // ── Limit Reached Modal ──────────────────────────────────
  limitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '82%',
    alignItems: 'center',
  },
  limitModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  limitModalMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  limitModalButton: {
    backgroundColor: '#B03385',
    paddingVertical: 14,
    paddingHorizontal: 56,
    borderRadius: 16,
  },
  limitModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});