import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { PermissionsAndroid } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

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
      case 'success':
        return <Icon name="check-circle" size={64} color="#10b981" />;
      case 'error':
        return <Icon name="alert-circle" size={64} color="#ef4444" />;
      case 'warning':
        return <Icon name="alert" size={64} color="#f59e0b" />;
      case 'info':
      default:
        return <Icon name="information" size={64} color="#3b82f6" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
      default:
        return '#3b82f6';
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
              onPress={() => {
                onClose();
                onConfirm?.();
              }}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SellProductScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [colors, setColors] = useState<{ id: number; name: string; hex_code?: string }[]>([]);
  const [sizes, setSizes] = useState<{ id: number; size: string; size_display?: string }[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [productType, setProductType] = useState<'new' | 'used' | 'rental'>('new');
  const [showProductTypeDropdown, setShowProductTypeDropdown] = useState(false);

  const [images, setImages] = useState<{ uri: string; fileName?: string; type?: string }[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSizeStrings, setSelectedSizeStrings] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const [condition, setCondition] = useState<string | null>(null);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);

  const [originalPrice, setOriginalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');

  // Rental fields
  const [rentalPricePerDay, setRentalPricePerDay] = useState('');
  const [lateReturnPenalty, setLateReturnPenalty] = useState('');
  const [damageProtectionFee, setDamageProtectionFee] = useState('');
  const [rentalFrom, setRentalFrom] = useState('');
  const [rentalTo, setRentalTo] = useState('');
  const [minRentalDays, setMinRentalDays] = useState('');
  const [maxRentalDays, setMaxRentalDays] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Pickup address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [addressErrors, setAddressErrors] = useState<any>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    type: 'info',
    title: '',
    message: '',
  });

  const conditions = ['new', 'gently_used', 'worn_3_4', 'fair'];

  const steps = [
    { id: 1, label: 'Details' },
    { id: 2, label: 'Address' },
    { id: 3, label: 'Review' },
  ];

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
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          showModal(
            'warning',
            'Login Required',
            'Please login to continue listing your product.',
            () => navigation.navigate('Login')
          );
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const [catRes, colorRes, sizeRes, addrRes] = await Promise.all([
          fetch('https://feelvie.yaytech.in/api/catalog/categories/', { headers }),
          fetch('https://feelvie.yaytech.in/api/catalog/colors/', { headers }),
          fetch('https://feelvie.yaytech.in/api/catalog/sizes/', { headers }),
          fetch('https://feelvie.yaytech.in/api/auth/addresses/', { headers }),
        ]);

        if (catRes.ok) setCategories((await catRes.json()) || []);
        if (colorRes.ok) setColors((await colorRes.json()) || []);
        if (sizeRes.ok) setSizes((await sizeRes.json()) || []);

        if (addrRes.ok) {
          const addrData = await addrRes.json();
          const sorted = addrData.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setSavedAddresses(sorted);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        showModal('error', 'Failed to Load', 'Could not load categories, sizes or colors.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleSize = (size: string) => {
    setSelectedSizeStrings(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev =>
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const openGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      showModal('warning', 'Permission Required', 'Gallery access is needed to upload photos.');
      return;
    }

    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 6, quality: 0.9 },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showModal('error', 'Image Picker Error', response.errorMessage || 'Failed to open gallery');
          return;
        }
        if (response.assets?.length) {
          const newImages = response.assets.map(asset => ({
            uri: asset.uri || '',
            fileName: asset.fileName,
            type: asset.type,
          }));
          setImages(prev => [...prev, ...newImages].slice(0, 6));
        }
      }
    );
  };

  const validateAddressForm = () => {
    const errors: any = {};
    if (!addressForm.line1.trim()) errors.line1 = 'Street address is required';
    if (!addressForm.city.trim()) errors.city = 'City is required';
    if (!addressForm.state.trim()) errors.state = 'State is required';
    if (!addressForm.postal_code.trim()) errors.postal_code = 'Pincode is required';
    else if (!/^\d{6}$/.test(addressForm.postal_code.trim()))
      errors.postal_code = 'Enter valid 6-digit pincode';

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveNewAddress = async () => {
    if (!validateAddressForm()) {
      showModal('warning', 'Incomplete Form', 'Please correct the errors in the address form.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Session expired');

      const payload = {
        line1: addressForm.line1.trim(),
        line2: addressForm.line2?.trim() || '',
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postal_code: addressForm.postal_code.trim(),
        country: 'India',
        is_default: true,
      };

      const res = await fetch('https://feelvie.yaytech.in/api/auth/addresses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to save address');
      }

      const saved = await res.json();

      setSavedAddresses(prev => [saved, ...prev]);
      setStreet(saved.line1 || '');
      setCity(saved.city || '');
      setStateName(saved.state || '');
      setPincode(saved.postal_code || '');

      setShowAddressForm(false);
      setAddressForm({ line1: '', line2: '', city: '', state: '', postal_code: '' });
      setAddressErrors({});

      showModal(
        'success',
        'Address Saved',
        'New address saved and selected for this listing!',
        () => {
          if (canGoNext()) handleNext();
        },
        'Continue'
      );
    } catch (err: any) {
      showModal('error', 'Save Failed',  'Could not save address. Try again.');
    }
  };

  const useSavedAddress = (addr: any) => {
    setStreet(addr.line1 || '');
    setCity(addr.city || '');
    setStateName(addr.state || '');
    setPincode(addr.postal_code || '');
    setShowAddressForm(false);

    if (canGoNext()) {
      handleNext();
    } else {
      showModal('warning', 'Incomplete', 'Please fill all required fields before continuing.');
    }
  };

  const submitProduct = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Please login first');

      if (!selectedCategory || selectedSizeStrings.length === 0 || selectedColors.length === 0) {
        throw new Error('Category, sizes and colors are required');
      }
      if (productType !== 'new' && !condition) {
        throw new Error('Condition is required for used/rental items');
      }
      if (!description.trim()) {
        throw new Error('Product description is required');
      }

      const formData = new FormData();

      formData.append('category', String(selectedCategory));
      formData.append('name', title.trim() || 'Untitled');
      formData.append('description', description.trim());
      formData.append('product_type', productType);

      if (sellingPrice.trim() && !isNaN(Number(sellingPrice))) {
        formData.append('selling_price', String(Number(sellingPrice.trim())));
      }

      formData.append('currency', 'INR');

      if (productType !== 'new') {
        formData.append('condition', condition || '');
      }

      formData.append('status', 'published');
      formData.append('shipping_option', 'pickup');
      formData.append('base_sku', `SKU-${Date.now()}`);
      formData.append('stock_quantity', String(Number(stock.trim())));
      formData.append('is_active', 'true');

      if (originalPrice.trim() && !isNaN(Number(originalPrice))) {
        formData.append('original_price', String(Number(originalPrice.trim())));
      }

      if (productType === 'rental') {
        if (rentalPricePerDay.trim()) formData.append('rental_price_per_day', rentalPricePerDay.trim());
        if (lateReturnPenalty.trim()) formData.append('late_return_penalty', lateReturnPenalty.trim());
        if (damageProtectionFee.trim()) formData.append('damage_protection_fee', damageProtectionFee.trim());
        if (rentalFrom) formData.append('rental_from', rentalFrom);
        if (rentalTo) formData.append('rental_to', rentalTo);
        if (minRentalDays.trim()) formData.append('min_rental_days', minRentalDays.trim());
        if (maxRentalDays.trim()) formData.append('max_rental_days', maxRentalDays.trim());
      }

      const pickupAddress = {
        line1: street.trim(),
        city: city.trim(),
        state: stateName.trim(),
        postal_code: pincode.trim(),
        country: 'India',
        name: '',
        phone: '',
        line2: '',
        is_default: true,
      };
      formData.append('pickup_address', JSON.stringify(pickupAddress));

      const variants = selectedColors
        .map(colorName => {
          const colorObj = colors.find(c => c.name === colorName);
          return selectedSizeStrings.map(sizeStr => {
            const sizeObj = sizes.find(s => s.size === sizeStr);
            if (!sizeObj) return null;
            return {
              color: colorObj?.id || 0,
              size: sizeObj.id,
              sku: `VAR-${colorName}-${sizeStr}-${Date.now().toString().slice(-6)}`,
              quantity: 1,
              price_override: null,
              is_active: true,
            };
          }).filter(Boolean);
        })
        .flat();

      variants.forEach((variant: any, index: number) => {
        formData.append(`variants[${index}]color_id`, String(variant.color));
        formData.append(`variants[${index}]size_id`, String(variant.size));
        formData.append(`variants[${index}]sku`, variant.sku);
        formData.append(`variants[${index}]quantity`, String(variant.quantity));
        formData.append(`variants[${index}]is_active`, 'true');
      });

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img?.uri) continue;
        const uri = Platform.OS === 'android' ? img.uri : img.uri.replace('file://', '');
        const fileName = img.fileName || `photo_${Date.now()}_${i}.jpg`;
        const type = img.type || 'image/jpeg';

        formData.append(`images[${i}]image`, { uri, name: fileName, type } as any);
        formData.append(`images[${i}]alt_text`, `Product image ${i + 1}`);
        formData.append(`images[${i}]sort_order`, String(i));
      }

      const response = await fetch('https://feelvie.yaytech.in/api/catalog/products/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const text = await response.text();

      if (!response.ok) {
        console.log('Backend error:', text);
        throw new Error(text || 'Failed to create product');
      }

      const data = JSON.parse(text);

      showModal(
        'success',
        'Product Published!',
        `Your product has been successfully listed (ID: ${data.id})`,
        () => navigation.goBack(),
        'Done'
      );
    } catch (err: any) {
      console.error('Submission error:', err);
      showModal('error', 'Upload Failed', 'Could not publish product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) {
      const baseValid =
        title.trim().length >= 5 &&
        images.length > 0 &&
        selectedCategory !== null &&
        selectedSizeStrings.length > 0 &&
        selectedColors.length > 0 &&
        stock.trim() !== '' &&
        Number(stock) >= 1 &&
        description.trim() !== '' &&
        sellingPrice.trim() !== '' &&
        !isNaN(Number(sellingPrice));

      const rentalValid =
        productType === 'rental'
          ? rentalPricePerDay.trim() !== '' &&
            lateReturnPenalty.trim() !== '' &&
            damageProtectionFee.trim() !== '' &&
            rentalFrom !== '' &&
            rentalTo !== '' &&
            minRentalDays.trim() !== '' &&
            maxRentalDays.trim() !== ''
          : true;

      const conditionValid = productType === 'new' || !!condition;

      return baseValid && rentalValid && conditionValid;
    }
    if (step === 2) {
      return street.trim() && city.trim() && stateName.trim() && pincode.length === 6;
    }
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      showModal('warning', 'Incomplete', 'Please fill all required fields to continue.');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      submitProduct();
    }
  };

  // ────────────────────────────────────────────────
  //   renderStepOne, renderStepTwo, renderStepThree functions
  //   (kept almost the same - only minor style name adjustments)
  // ────────────────────────────────────────────────

  const renderStepOne = () => {
    if (dataLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B03385" />
          <Text style={styles.loadingText}>Loading options...</Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>Product Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Nike Air Max 90 Black Size 9"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          placeholderTextColor="#ccc"
        />

        <Text style={styles.sectionTitle}>Product Type *</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowProductTypeDropdown(!showProductTypeDropdown)}
        >
          <Text style={productType ? styles.dropdownText : styles.dropdownPlaceholder}>
            {productType === 'new' ? 'New' : productType === 'used' ? 'Used' : 'Rental'}
          </Text>
          <Icon name="chevron-down" size={24} color="#6b7280" />
        </TouchableOpacity>

        {showProductTypeDropdown && (
          <View style={styles.dropdownList}>
            {['new', 'used', 'rental'].map(pt => (
              <TouchableOpacity
                key={pt}
                style={styles.dropdownItem}
                onPress={() => {
                  setProductType(pt as any);
                  setShowProductTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>
                  {pt === 'new' ? 'New' : pt === 'used' ? 'Used' : 'Rental'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Photos (up to 6) *</Text>
        <TouchableOpacity style={styles.imageUploadBox} onPress={openGallery}>
          <Icon name="camera-plus" size={32} color="#B03385" />
          <Text style={styles.uploadText}>Add Photos</Text>
          <Text style={styles.uploadSubText}>Camera or Gallery</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
            {images.map((img, index) => (
              <View key={index} style={styles.previewWrapper}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImages(images.filter((_, i) => i !== index))}
                >
                  <Icon name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Available Sizes *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {sizes.map(sizeObj => (
            <TouchableOpacity
              key={sizeObj.id}
              style={[
                styles.sizeChip,
                selectedSizeStrings.includes(sizeObj.size) && styles.sizeChipActive,
              ]}
              onPress={() => toggleSize(sizeObj.size)}
            >
              <Text
                style={[
                  styles.sizeText,
                  selectedSizeStrings.includes(sizeObj.size) && styles.sizeTextActive,
                ]}
              >
                {sizeObj.size_display || sizeObj.size}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Available Colors *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {colors.map(color => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorChip,
                selectedColors.includes(color.name) && styles.colorChipActive,
              ]}
              onPress={() => toggleColor(color.name)}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex_code || '#000000' },
                ]}
              />
              <Text
                style={[
                  styles.colorText,
                  selectedColors.includes(color.name) && styles.colorTextActive,
                ]}
              >
                {color.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {productType !== 'new' && (
          <>
            <Text style={styles.sectionTitle}>Condition *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowConditionDropdown(!showConditionDropdown)}
            >
              <Text style={condition ? styles.dropdownText : styles.dropdownPlaceholder}>
                {condition || 'Select condition'}
              </Text>
              <Icon name="chevron-down" size={24} color="#6b7280" />
            </TouchableOpacity>

            {showConditionDropdown && (
              <View style={styles.dropdownList}>
                {conditions.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCondition(c);
                      setShowConditionDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{c.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.sectionTitle}>Original Price</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                placeholder="999"
                keyboardType="numeric"
                style={styles.priceTextInput}
                value={originalPrice}
                onChangeText={setOriginalPrice}
                placeholderTextColor="#ccc"
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Selling Price *</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                placeholder="799"
                keyboardType="numeric"
                style={styles.priceTextInput}
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholderTextColor="#ccc"
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Stock *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 10"
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
          placeholderTextColor="#ccc"
        />

        <Text style={styles.sectionTitle}>Description *</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Describe condition, fit, materials, care instructions..."
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          placeholderTextColor="#ccc"
        />

        {productType === 'rental' && (
          <>
            <Text style={styles.sectionTitle}>Rental Details</Text>

            <Text style={styles.fieldLabel}>Rental Price per Day *</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceTextInput}
                placeholder="e.g. 200"
                keyboardType="numeric"
                value={rentalPricePerDay}
                onChangeText={setRentalPricePerDay}
                placeholderTextColor="#ccc"
              />
            </View>

            <Text style={styles.fieldLabel}>Late Return Penalty (per day) *</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceTextInput}
                placeholder="e.g. 50"
                keyboardType="numeric"
                value={lateReturnPenalty}
                onChangeText={setLateReturnPenalty}
                placeholderTextColor="#ccc"
              />
            </View>

            <Text style={styles.fieldLabel}>Damage Protection Fee *</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceTextInput}
                placeholder="e.g. 100"
                keyboardType="numeric"
                value={damageProtectionFee}
                onChangeText={setDamageProtectionFee}
                placeholderTextColor="#ccc"
              />
            </View>

            <Text style={styles.fieldLabel}>Available From *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowFromPicker(true)}>
              <Text style={rentalFrom ? styles.dateText : styles.datePlaceholder}>
                {rentalFrom || 'Select date'}
              </Text>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={rentalFrom ? new Date(rentalFrom) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFromPicker(Platform.OS === 'ios');
                  if (selectedDate) setRentalFrom(selectedDate.toISOString().split('T')[0]);
                }}
              />
            )}

            <Text style={styles.fieldLabel}>Available To *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowToPicker(true)}>
              <Text style={rentalTo ? styles.dateText : styles.datePlaceholder}>
                {rentalTo || 'Select date'}
              </Text>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={rentalTo ? new Date(rentalTo) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowToPicker(Platform.OS === 'ios');
                  if (selectedDate) setRentalTo(selectedDate.toISOString().split('T')[0]);
                }}
              />
            )}

            <Text style={styles.fieldLabel}>Minimum Rental Days *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1"
              keyboardType="numeric"
              value={minRentalDays}
              onChangeText={setMinRentalDays}
              placeholderTextColor="#ccc"
            />

            <Text style={styles.fieldLabel}>Maximum Rental Days *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 30"
              keyboardType="numeric"
              value={maxRentalDays}
              onChangeText={setMaxRentalDays}
              placeholderTextColor="#ccc"
            />
          </>
        )}
      </>
    );
  };

  const renderStepTwo = () => {
    const recentAddress = savedAddresses[0];

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.sectionTitle}>Pickup Address *</Text>

          {loadingAddress ? (
            <View style={styles.addressLoading}>
              <ActivityIndicator size="small" color="#B03385" />
              <Text style={{ marginLeft: 12, color: '#64748b' }}>Loading saved addresses...</Text>
            </View>
          ) : recentAddress && !showAddressForm ? (
            <View style={styles.savedAddressCard}>
              <View style={styles.cardHeader}>
                <Icon name="map-marker-check" size={24} color="#B03385" />
                <Text style={styles.cardTitle}>Saved Address</Text>
              </View>

              <Text style={styles.addressLine}>{recentAddress.line1}</Text>
              {recentAddress.line2 && <Text style={styles.addressLine}>{recentAddress.line2}</Text>}
              <Text style={styles.addressCity}>
                {recentAddress.city}, {recentAddress.state} - {recentAddress.postal_code}
              </Text>
              <Text style={styles.addressCountry}>{recentAddress.country}</Text>

              <View style={styles.addressActions}>
                <TouchableOpacity style={styles.useThisBtn} onPress={() => useSavedAddress(recentAddress)}>
                  <Text style={styles.useThisText}>Use this address</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowAddressForm(true)}>
                  <Text style={styles.addNewText}>Add new address</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionSubtitle}>
                {savedAddresses.length > 0 ? 'Add a new pickup address' : 'Add your pickup address'}
              </Text>

              <Text style={styles.fieldLabel}>Street Address *</Text>
              <TextInput
                style={[styles.input, addressErrors.line1 && styles.inputError]}
                placeholder="House/Flat, Street name"
                value={addressForm.line1}
                onChangeText={t => setAddressForm({ ...addressForm, line1: t })}
                placeholderTextColor="#ccc"
              />
              {addressErrors.line1 && <Text style={styles.errorText}>{addressErrors.line1}</Text>}

              <Text style={styles.fieldLabel}>Address Line 2 (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Landmark, nearby area"
                value={addressForm.line2}
                onChangeText={t => setAddressForm({ ...addressForm, line2: t })}
                placeholderTextColor="#ccc"
              />

              <Text style={styles.fieldLabel}>City *</Text>
              <TextInput
                style={[styles.input, addressErrors.city && styles.inputError]}
                placeholder="e.g. Delhi"
                value={addressForm.city}
                onChangeText={t => setAddressForm({ ...addressForm, city: t })}
                placeholderTextColor="#ccc"
              />
              {addressErrors.city && <Text style={styles.errorText}>{addressErrors.city}</Text>}

              <View style={styles.priceRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.fieldLabel}>State *</Text>
                  <TextInput
                    style={[styles.input, addressErrors.state && styles.inputError]}
                    placeholder="e.g. Uttar Pradesh"
                    value={addressForm.state}
                    onChangeText={t => setAddressForm({ ...addressForm, state: t })}
                    placeholderTextColor="#ccc"
                  />
                  {addressErrors.state && <Text style={styles.errorText}>{addressErrors.state}</Text>}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Pincode *</Text>
                  <TextInput
                    style={[styles.input, addressErrors.postal_code && styles.inputError]}
                    placeholder="6 digits"
                    keyboardType="numeric"
                    maxLength={6}
                    value={addressForm.postal_code}
                    onChangeText={t => setAddressForm({ ...addressForm, postal_code: t })}
                    placeholderTextColor="#ccc"
                  />
                  {addressErrors.postal_code && <Text style={styles.errorText}>{addressErrors.postal_code}</Text>}
                </View>
              </View>

              <View style={styles.addressFormActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowAddressForm(false);
                    setAddressForm({ line1: '', line2: '', city: '', state: '', postal_code: '' });
                    setAddressErrors({});
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={saveNewAddress}>
                  <Text style={styles.saveText}>Save & Use</Text>
                </TouchableOpacity>
              </View>

              {savedAddresses.length > 0 && (
                <TouchableOpacity
                  style={styles.useSavedLink}
                  onPress={() => setShowAddressForm(false)}
                >
                  <Icon name="history" size={18} color="#2563eb" />
                  <Text style={styles.useSavedText}>Back to saved addresses</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderStepThree = () => {
    const orig = Number(originalPrice) || 0;
    const sell = Number(sellingPrice) || 0;
    const discount = orig > sell && orig > 0 ? Math.round(((orig - sell) / orig) * 100) : 0;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Product Preview</Text>
        <Text style={styles.summaryCardSubtitle}>Review before publishing</Text>

        <View style={styles.imagesSection}>
          <Text style={styles.sectionLabel}>Product Images ({images.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.length > 0 ? (
              images.map((img, index) => (
                <View key={index} style={styles.previewImageContainer}>
                  <Image
                    source={{ uri: img.uri }}
                    style={styles.previewImageLarge}
                    resizeMode="cover"
                  />
                </View>
              ))
            ) : (
              <View style={styles.noImagePlaceholder}>
                <Icon name="image-off" size={40} color="#d1d5db" />
                <Text style={styles.noImageText}>No images</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Title</Text>
          <Text style={styles.detailValue}>{title.trim() || '—'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>
            {categories.find(c => c.id === selectedCategory)?.name || '—'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Sizes</Text>
          <Text style={styles.detailValue}>
            {selectedSizeStrings.length > 0 ? selectedSizeStrings.join(', ') : '—'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Colors</Text>
          <Text style={styles.detailValue}>
            {selectedColors.length > 0 ? selectedColors.join(', ') : '—'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Variants</Text>
          <Text style={[styles.detailValue, { color: '#B03385' }]}>
            {selectedColors.length * selectedSizeStrings.length || '—'}
          </Text>
        </View>

        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.priceValue}>₹{sellingPrice || '—'}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.discountRow}>
              <Text style={styles.originalPrice}>₹{originalPrice}</Text>
              <Text style={styles.discountBadge}>{discount}% OFF</Text>
            </View>
          )}

          {productType === 'rental' && rentalPricePerDay && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Rental / Day</Text>
              <Text style={styles.rentalPrice}>₹{rentalPricePerDay}</Text>
            </View>
          )}
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stock</Text>
          <Text style={styles.detailValue}>{stock || '—'} pieces</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Condition</Text>
          <Text style={styles.detailValue}>
            {productType === 'new' ? 'New' : condition?.replace('_', ' ') || '—'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pickup Location</Text>
          <Text style={styles.detailValue}>
            {city || '—'}, {stateName || '—'} {pincode ? `(${pincode})` : ''}
          </Text>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.descriptionText}>
            {description.trim() || 'No description provided'}
          </Text>
        </View>

        <Text style={styles.finalNote}>
          Once posted, buyers will see this preview. Double-check before publishing!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => (step === 1 ? navigation.goBack() : setStep(step - 1))}>
          <Icon name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Sell Your Product</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar - same style as Cart */}
      <View style={styles.progressBarContainer}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.stepCircle,
                  s.id < step && styles.stepCompleted,
                  s.id === step && styles.stepActive,
                  s.id > step && styles.stepFuture,
                ]}
              >
                {s.id < step ? (
                  <Icon name="check" size={16} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      s.id === step && styles.stepNumberActive,
                    ]}
                  >
                    {s.id}
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  s.id <= step && styles.stepLabelActive,
                ]}
              >
                {s.label}
              </Text>
            </View>

            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  s.id < step && styles.stepConnectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && renderStepOne()}
          {step === 2 && renderStepTwo()}
          {step === 3 && renderStepThree()}
          <View style={{ height: 160 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 16 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canGoNext() || submitting) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canGoNext() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextText}>
              {step === 3 ? 'Post Product' : 'Continue'}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#B03385',
  },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 1,  
  },

  stepWrapper: {
    alignItems: 'center',
    width: 80,
  },

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

  stepCompleted: {
    backgroundColor: '#B03385',
    borderColor: '#B03385',
  },

  stepActive: {
    backgroundColor: '#ffffff',
    borderColor: '#B03385',
    borderWidth: 2.5,
  },

  stepFuture: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },

  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },

  stepNumberActive: {
    color: '#B03385',
    fontWeight: '700',
  },

  stepLabel: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },

  stepLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },

  stepConnector: {
    height: 2,
    width: 80,
    backgroundColor: '#e5e7eb',
    marginHorizontal: -10,
    marginBottom: 14,
  },

  stepConnectorCompleted: {
    backgroundColor: '#B03385',
  },

  scrollContent: {
    padding: 20,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  nextBtn: {
    backgroundColor: '#B03385',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },

  nextBtnDisabled: {
    backgroundColor: '#94a3b8',
  },

  nextText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },

  fieldLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '500',
  },

  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    fontSize: 16,
  },

  inputError: {
    borderColor: '#ef4444',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
  },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },

  dropdownPlaceholder: {
    color: '#94a3b8',
    fontSize: 16,
  },

  dropdownText: {
    color: '#0f172a',
    fontSize: 16,
  },

  dropdownList: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
  },

  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  dropdownItemText: {
    fontSize: 16,
    color: '#0f172a',
  },

  imageUploadBox: {
    height: 130,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B03385',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdf2f8',
    marginBottom: 16,
  },

  uploadText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#B03385',
  },

  uploadSubText: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
  },

  imagePreviewScroll: {
    marginBottom: 20,
  },

  previewWrapper: {
    position: 'relative',
    marginRight: 12,
  },

  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 12,
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 10,
  },

  categoryActive: {
    backgroundColor: '#B03385',
  },

  categoryText: {
    color: '#334155',
    fontWeight: '500',
  },

  categoryTextActive: {
    color: 'white',
  },

  sizeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 10,
    minWidth: 60,
    alignItems: 'center',
  },

  sizeChipActive: {
    backgroundColor: '#B03385',
  },

  sizeText: {
    color: '#334155',
    fontWeight: '500',
  },

  sizeTextActive: {
    color: 'white',
  },

  colorChip: {
    alignItems: 'center',
    marginRight: 14,
  },

  colorCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },

  colorText: {
    fontSize: 13,
    color: '#334155',
  },

  colorTextActive: {
    color: '#B03385',
    fontWeight: '600',
  },

  priceRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },

  rupee: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B03385',
    marginRight: 6,
  },

  priceTextInput: {
    flex: 1,
    fontSize: 16,
  },

  textarea: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 24,
  },

  dateText: {
    fontSize: 16,
    color: '#0f172a',
  },

  datePlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  loadingText: {
    marginTop: 16,
    color: '#475569',
    fontSize: 16,
  },

  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },

  savedAddressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },

  addressLine: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 4,
  },

  addressCity: {
    fontSize: 15,
    color: '#334155',
  },

  addressCountry: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },

  addressActions: {
    flexDirection: 'row',
    marginTop: 20,
  },

  useThisBtn: {
    flex: 1,
    backgroundColor: '#B03385',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },

  useThisText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  addNewBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },

  addNewText: {
    color: '#B03385',
    fontWeight: '600',
    fontSize: 15,
  },

  sectionSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
  },

  addressFormActions: {
    flexDirection: 'row',
    marginTop: 24,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
  },

  cancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: '#B03385',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  saveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  useSavedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  useSavedText: {
    color: '#B03385',
    fontSize: 14,
    marginLeft: 8,
  },

  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  summaryCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  summaryCardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },

  imagesSection: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },

  imagesScroll: {
    marginLeft: -8,
    marginRight: -8,
  },

  previewImageContainer: {
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },

  previewImageLarge: {
    width: 140,
    height: 140,
  },

  noImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },

  noImageText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 8,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  detailLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },

  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  priceSection: {
    marginVertical: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },

  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  originalPrice: {
    fontSize: 15,
    color: '#6b7280',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },

  discountBadge: {
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  rentalPrice: {
    fontSize: 16,
    color: '#B03385',
    fontWeight: '600',
  },

  descriptionSection: {
    marginTop: 20,
    marginBottom: 24,
  },

  descriptionText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },

  finalNote: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: width * 0.82,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },

  modalIconContainer: {
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },

  modalMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },

  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 12,
  },

  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 120,
  },

  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    minWidth: 120,
  },

  modalCancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});