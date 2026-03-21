import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AddressForm = {
  id?: number;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type Errors = Partial<Record<keyof AddressForm, string>>;

const initialForm: AddressForm = {
  name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
};

type Props = {
  navigation: any;
  route: any;
};

export default function EditAddressScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();

  const isEditMode = !!route?.params?.address;
  const passedAddress = route?.params?.address as AddressForm | undefined;

  const [form, setForm] = useState<AddressForm>(
    passedAddress || initialForm
  );
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: 'Edit Address' });
    } else {
      navigation.setOptions({ title: 'Add New Address' });
    }
  }, [isEditMode, navigation]);

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!form.name.trim()) newErrors.name = 'Full name is required';
    if (!form.phone.trim()) newErrors.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.phone.trim()))
      newErrors.phone = 'Enter valid 10-digit number';

    if (!form.line1.trim()) newErrors.line1 = 'Address line 1 is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';
    if (!form.postal_code.trim()) newErrors.postal_code = 'PIN code is required';
    else if (!/^\d{6}$/.test(form.postal_code.trim()))
      newErrors.postal_code = 'Enter valid 6-digit PIN';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setApiError(null);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Session expired. Please login.');

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2?.trim() || '',
        city: form.city.trim(),
        state: form.state.trim(),
        postal_code: form.postal_code.trim(),
        country: form.country.trim(),
      };

      const url = isEditMode
        ? `https://feelvie.yaytech.in/api/auth/addresses/${form.id}/`
        : 'https://feelvie.yaytech.in/api/auth/addresses/';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.detail ||
          data.message ||
          data.non_field_errors?.[0] ||
          Object.values(data)?.[0]?.[0] ||
          `Server error (${response.status})`;
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigation.goBack();
      }, 1400);
    } catch (err: any) {
      setApiError(err.message || 'Failed to save address');
      console.log('Save address error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof AddressForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Address' : 'Add New Address'}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {apiError && (
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="your Name"
              value={form.name}
              onChangeText={text => handleChange('name', text)}
              autoCapitalize="words"
               placeholderTextColor="#ccc"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="98765xxxxx"
              keyboardType="phone-pad"
              maxLength={10}
               placeholderTextColor="#ccc"
              value={form.phone}
              onChangeText={text => handleChange('phone', text)}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Address Line 1 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Flat / House / Street *</Text>
            <TextInput
              style={[styles.input, errors.line1 && styles.inputError]}
              placeholder="123, Green Park"
              value={form.line1}
              onChangeText={text => handleChange('line1', text)}
              placeholderTextColor="#ccc"
            />
            {errors.line1 && <Text style={styles.errorText}>{errors.line1}</Text>}
          </View>

          {/* Address Line 2 (optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark / Area (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Near Metro Station"
              value={form.line2}
               placeholderTextColor="#ccc"
              onChangeText={text => handleChange('line2', text)}
            />
          </View>

          {/* City + State */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder="Lucknow"
                value={form.city}
                 placeholderTextColor="#ccc"
                onChangeText={text => handleChange('city', text)}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                placeholder="Uttar Pradesh"
                value={form.state}
                 placeholderTextColor="#ccc"
                onChangeText={text => handleChange('state', text)}
              />
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
            </View>
          </View>

          {/* PIN Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN Code *</Text>
            <TextInput
              style={[styles.input, errors.postal_code && styles.inputError]}
              placeholder="226001"
              keyboardType="numeric"
              maxLength={6}
               placeholderTextColor="#ccc"
              value={form.postal_code}
              onChangeText={text => handleChange('postal_code', text)}
            />
            {errors.postal_code && (
              <Text style={styles.errorText}>{errors.postal_code}</Text>
            )}
          </View>

          {/* Country (fixed) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <View style={[styles.input, styles.disabledInput]}>
              <Text style={styles.disabledText}>India</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update Address' : 'Save Address'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {success && (
        <View style={styles.successToast}>
          <Icon name="check-circle" size={24} color="#fff" />
          <Text style={styles.successToastText}>
            {isEditMode ? 'Address updated' : 'Address saved'} successfully
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // paddingTop: Platform.select({ ios: 4, android: 40 }),
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B03385',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
  },
  disabledText: {
    color: '#6b7280',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  apiErrorContainer: {
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  apiErrorText: {
    color: '#b91c1c',
    textAlign: 'center',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#B4338A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successToast: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  successToastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
});