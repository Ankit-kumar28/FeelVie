// RentProductScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const clothingCategories = [
  'Ethnic Wear', 'Western Wear', 'Party Wear', 'Wedding Lehenga',
  'Saree', 'Gown', 'Suit', 'Kurta Set', 'Indo-Western', 'Accessories'
];

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const conditions = ['Brand New', 'Like New', 'Gently Used', 'Good Condition'];

const rentalPeriods = ['Per Day', 'Per Week', 'Per Event'];

export default function RentProductScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1 - Product Info
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [condition, setCondition] = useState<string | null>(null);
  const [rentalPrice, setRentalPrice] = useState('');
  const [rentalPeriod, setRentalPeriod] = useState('Per Day');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 - Availability & Address
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  // Step 3
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const colors = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Gold', hex: '#d4af37' },
    { name: 'Silver', hex: '#c0c0c0' },
    { name: 'Multi', hex: '#000000' },
  ];

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev =>
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const openImageOptions = () => {
    Alert.alert('Add Photo', '', [
      { text: 'Camera', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.9 }, handleImage) },
      { text: 'Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', selectionLimit: 6 }, handleImage) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImage = (res: any) => {
    if (res.didCancel || res.errorCode) return;
    if (res.assets) {
      const newUris = res.assets.map((a: any) => a.uri || '');
      setImages([...images, ...newUris].slice(0, 6));
    }
  };

  const canGoNext = () => {
    if (step === 1) {
      return (
        title.trim().length >= 8 &&
        images.length >= 3 &&
        category &&
        selectedSizes.length > 0 &&
        selectedColors.length > 0 &&
        condition &&
        rentalPrice.trim() !== '' &&
        securityDeposit.trim() !== ''
      );
    }
    if (step === 2) {
      return street.trim() && city.trim() && stateName.trim() && pincode.length === 6;
    }
    if (step === 3) {
      return !!selectedPayment;
    }
    return false;
  };

  const handlePost = () => {
    Alert.alert(
      'Product Submitted for Review',
      'Your rental listing has been successfully submitted!\n\nOur team will review it shortly. Once approved (usually 24–48 hours), it will appear in the "Rent" section and renters can start booking.\n\nYou will get a notification when it goes live.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getStepTitle = () => {
    if (step === 1) return 'Item Details';
    if (step === 2) return 'Availability & Location';
    return 'Review & List';
  };

  const progress = (step / totalSteps) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => (step === 1 ? navigation.goBack() : setStep(step - 1))}>
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getStepTitle()}</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <>
            <Text style={styles.label}>Product Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Red Anarkali Gown with Dupatta - Size M"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Photos (min 3 suggested) *</Text>
            <TouchableOpacity style={styles.photoBox} onPress={openImageOptions}>
              <Icon name="camera-plus" size={36} color="#2563eb" />
              <Text style={styles.photoText}>Add Photos</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <ScrollView horizontal style={styles.previewRow}>
                {images.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.previewImg} />
                ))}
              </ScrollView>
            )}

            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal style={styles.chipRow}>
              {clothingCategories.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, category === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Sizes Available *</Text>
            <ScrollView horizontal style={styles.chipRow}>
              {sizes.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, selectedSizes.includes(s) && styles.chipActive]}
                  onPress={() => toggleSize(s)}
                >
                  <Text style={[styles.chipText, selectedSizes.includes(s) && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Colors *</Text>
            <ScrollView horizontal style={styles.chipRow}>
              {colors.map(c => (
                <TouchableOpacity
                  key={c.name}
                  style={styles.colorChip}
                  onPress={() => toggleColor(c.name)}
                >
                  <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
                  <Text style={styles.colorName}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Condition *</Text>
            <View style={styles.rowChips}>
              {conditions.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.smallChip, condition === c && styles.smallChipActive]}
                  onPress={() => setCondition(c)}
                >
                  <Text style={[styles.smallChipText, condition === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Rental Price *</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Daily price"
                keyboardType="numeric"
                value={rentalPrice}
                onChangeText={setRentalPrice}
              />
              <Text style={styles.periodText}>/{rentalPeriod}</Text>
            </View>

            <Text style={styles.label}>Security Deposit *</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Refundable deposit"
                keyboardType="numeric"
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
              />
            </View>

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Fabric, occasion, wash care, any special notes..."
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.label}>Available From - To</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={styles.dateInput}
                placeholder="DD/MM/YYYY"
                value={availableFrom}
                onChangeText={setAvailableFrom}
              />
              <Text style={styles.toText}>to</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="DD/MM/YYYY"
                value={availableTo}
                onChangeText={setAvailableTo}
              />
            </View>

            <Text style={styles.label}>Pickup Address *</Text>
            <TextInput style={styles.input} placeholder="Flat / House / Street" value={street} onChangeText={setStreet} />
            <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="State" value={stateName} onChangeText={setStateName} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Pincode" keyboardType="numeric" maxLength={6} value={pincode} onChangeText={setPincode} />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.label}>Preferred Payment Method</Text>
            {paymentMethods.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.paymentOption, selectedPayment === m && styles.paymentActive]}
                onPress={() => setSelectedPayment(m)}
              >
                <Icon name={selectedPayment === m ? 'radiobox-marked' : 'radiobox-blank'} size={24} color="#2563eb" />
                <Text style={styles.paymentText}>{m}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Listing Preview</Text>
              <Text style={styles.previewTitle}>{title || 'No title'}</Text>
              <Text style={styles.previewPrice}>₹{rentalPrice || '—'} / {rentalPeriod}</Text>
              <Text style={styles.previewDeposit}>Deposit: ₹{securityDeposit || '—'}</Text>
              <Text style={styles.previewLocation}>{city || '—'}, {stateName || '—'}</Text>
            </View>
          </>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.btn, !canGoNext() && styles.btnDisabled]}
          disabled={!canGoNext()}
          onPress={() => (step < 3 ? setStep(step + 1) : handlePost())}
        >
          <Text style={styles.btnText}>{step === 3 ? 'List for Rent' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

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
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#111' },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  progressBg: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 4 },
  progressText: { marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#2563eb' },

  scrollContent: { padding: 20 },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
    marginBottom: 12,
  },

  textarea: { minHeight: 100, textAlignVertical: 'top' },

  photoBox: {
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9ca3af',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
  },
  photoText: { marginTop: 8, color: '#2563eb', fontWeight: '600' },

  previewRow: { marginBottom: 20 },
  previewImg: { width: 90, height: 90, borderRadius: 12, marginRight: 10 },

  chipRow: { marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 10,
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#374151', fontWeight: '500' },

  colorChip: { alignItems: 'center', marginRight: 16 },
  colorDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#d1d5db', marginBottom: 6 },
  colorName: { fontSize: 13, color: '#374151' },

  rowChips: { flexDirection: 'row', flexWrap: 'wrap' },
  smallChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  smallChipActive: { backgroundColor: '#2563eb' },
  smallChipText: { color: '#374151' },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  rupee: { fontSize: 20, fontWeight: '600', color: '#2563eb', marginRight: 6 },
  priceInput: { flex: 1, fontSize: 17, paddingVertical: 14 },
  periodText: { color: '#6b7280', fontWeight: '500' },

  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dateInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d1d5db' },
  toText: { marginHorizontal: 12, color: '#6b7280', fontSize: 16 },

  row: { flexDirection: 'row' },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
  },
  paymentActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  paymentText: { marginLeft: 12, fontSize: 16, color: '#111827' },

  summaryCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  summaryTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  previewPrice: { fontSize: 20, fontWeight: '700', color: '#2563eb', marginBottom: 4 },
  previewDeposit: { fontSize: 15, color: '#4b5563', marginBottom: 4 },
  previewLocation: { fontSize: 15, color: '#6b7280' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  btn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});