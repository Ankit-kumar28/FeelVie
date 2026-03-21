// src/screens/VirtualTryOnDetails.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const BASE_URL = 'https://feelvie.yaytech.in';

// Generation categories
const generationCategories = ['Kids', 'Women', 'Men'];

// Common garment sizes (used for all)
const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

// Common Age Groups (shown for all categories)
const ageGroups = ['0-2', '3-5', '6-8', '9-12', '13-18', '19-25', '26-35', '36-45', '46-60', '60+'];

// Women's Measurement Chart values
const womenBustOptions = ['32', '34', '36', '38', '40', '42'];
const womenWaistOptions = ['26', '28', '30', '32', '34', '36'];
const womenHipOptions = ['34', '36', '38', '40', '42', '44'];
const womenShoulderOptions = ['13.5', '14', '14.5', '15', '15.5', '16'];
const womenKurtiLengthOptions = ['42', '44', '46'];

// Men's Measurement Chart values
const menChestOptions = ['38', '40', '42', '44', '46'];
const menWaistOptions = ['32', '34', '36', '38', '40'];
const menHipOptions = ['38', '40', '42', '44', '46'];
const menShoulderOptions = ['17', '18', '19', '20', '21'];
const menShirtLengthOptions = ['28', '29', '30', '31', '32'];

// Kids Measurement Chart values (2-14 years)
const kidsAgeOptions = ['2-3 Y', '3-4 Y', '5-6 Y', '7-8 Y', '9-10 Y', '11-12 Y', '13-14 Y'];
const kidsChestOptions = ['21', '22', '24', '26', '28', '30', '32'];
const kidsWaistOptions = ['20', '21', '22', '23', '24', '25', '26'];
const kidsHipOptions = ['22', '23', '25', '27', '29', '31', '33'];
const kidsShoulderOptions = ['9', '9.5', '10.5', '11.5', '12.5', '13.5', '14.5'];
const kidsHeightOptions = ['36', '39', '44', '48', '52', '56', '60'];

export default function VirtualTryOnDetails({ route, navigation }) {
  console.debug('[Screen 2] VirtualTryOnDetails mounted');

  const { userImage, garmentImage, selectedCategory, onSuccess } = route.params;

  console.debug('[Screen 2] Received from Screen 1:', {
    userImageExists: !!userImage,
    garmentImageExists: !!garmentImage,
    selectedCategory,
  });

  const [genCategory, setGenCategory] = useState(null);
  const [garmentSize, setGarmentSize] = useState(null);
  const [bodySize, setBodySize] = useState(null);
  const [ageGroup, setAgeGroup] = useState(null);

  // Women's optional measurements
  const [bust, setBust] = useState(null);
  const [waist, setWaist] = useState(null);
  const [hip, setHip] = useState(null);
  const [shoulder, setShoulder] = useState(null);
  const [kurtiLength, setKurtiLength] = useState(null);

  // Men's optional measurements
  const [chest, setChest] = useState(null);
  const [menWaist, setMenWaist] = useState(null);
  const [menHip, setMenHip] = useState(null);
  const [menShoulder, setMenShoulder] = useState(null);
  const [shirtLength, setShirtLength] = useState(null);

  // Kids optional measurements
  const [kidsChest, setKidsChest] = useState(null);
  const [kidsWaist, setKidsWaist] = useState(null);
  const [kidsHip, setKidsHip] = useState(null);
  const [kidsShoulder, setKidsShoulder] = useState(null);
  const [height, setHeight] = useState(null);

  const [showGenDropdown, setShowGenDropdown] = useState(false);
  const [showGarmentDropdown, setShowGarmentDropdown] = useState(false);
  const [showBodyDropdown, setShowBodyDropdown] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);

  // Dropdown visibility for women's measurements
  const [showBustDropdown, setShowBustDropdown] = useState(false);
  const [showWaistDropdown, setShowWaistDropdown] = useState(false);
  const [showHipDropdown, setShowHipDropdown] = useState(false);
  const [showShoulderDropdown, setShowShoulderDropdown] = useState(false);
  const [showKurtiLengthDropdown, setShowKurtiLengthDropdown] = useState(false);

  // Dropdown visibility for men's measurements
  const [showChestDropdown, setShowChestDropdown] = useState(false);
  const [showMenWaistDropdown, setShowMenWaistDropdown] = useState(false);
  const [showMenHipDropdown, setShowMenHipDropdown] = useState(false);
  const [showMenShoulderDropdown, setShowMenShoulderDropdown] = useState(false);
  const [showShirtLengthDropdown, setShowShirtLengthDropdown] = useState(false);

  // Dropdown visibility for kids measurements
  const [showKidsChestDropdown, setShowKidsChestDropdown] = useState(false);
  const [showKidsWaistDropdown, setShowKidsWaistDropdown] = useState(false);
  const [showKidsHipDropdown, setShowKidsHipDropdown] = useState(false);
  const [showKidsShoulderDropdown, setShowKidsShoulderDropdown] = useState(false);
  const [showHeightDropdown, setShowHeightDropdown] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  // Determine which category is selected
  const isWomenSelected = genCategory === 'Women';
  const isMenSelected = genCategory === 'Men';
  const isKidsSelected = genCategory === 'Kids';

  const isReady = genCategory && garmentSize && bodySize && !isGenerating;

  const handleGenerate = async () => {
    console.debug('[Screen 2] Generate button pressed');
    if (!isReady) {
      console.warn('[Screen 2] Missing required fields');
      Toast.show({ type: 'error', text1: 'Please select all required details' });
      return;
    }

    setIsGenerating(true);
    console.debug('[Screen 2] Starting real API call');

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.warn('[Screen 2] No access token found');
        Toast.show({ type: 'error', text1: 'Please login first' });
        return;
      }

      const formData = new FormData();

      console.debug('[Screen 2] Building FormData');
      formData.append('person_image', {
        uri: userImage,
        type: 'image/jpg',
        name: 'person.jpg',
      } as any);

      formData.append('garment_image', {
        uri: garmentImage,
        type: 'image/jpg',
        name: 'garment.jpg',
      } as any);

      formData.append('category', selectedCategory);
      // formData.append('timeout', '300');

      
      console.debug('[Screen 2] FormData ready, sending request...');

      const response = await fetch(`${BASE_URL}/api/secure/vton/try-on/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.debug('[Screen 2] API response received, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Screen 2] API error:', response.status, errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.debug('[Screen 2] API success - response keys:', Object.keys(data));

      if (!data.output_image) {
        console.warn('[Screen 2] No output_image in response');
        throw new Error('No try-on result received from server');
      }

      console.debug('[Screen 2] Success - output_image length:', data.output_image.length);

      // Clear images from first screen after success
      if (onSuccess) {
        console.debug('[Screen 2] Calling onSuccess to clear images');
        onSuccess();
      }

      navigation.navigate('TryOnResult', {
        resultBase64: data.output_image,
        userImage,
        garmentImage,
        selectedCategory,
      });

      console.debug('[Screen 2] Navigated to TryOnResult');
      Toast.show({ type: 'success', text1: 'Success', text2: 'Try-on generated' });

    } catch (err) {
      console.error('[Screen 2] Try-on failed:', err.message || err);
      Toast.show({
        type: 'error',
        text1: 'Failed to generate try-on',
        text2: 'Please try again',
      });
    } finally {
      setIsGenerating(false);
      console.debug('[Screen 2] Generation process finished');
    }
  };

  const renderDropdown = (title, value, options, isOpen, setOpen, setValue) => (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.dropdownField}
        onPress={() => setOpen(!isOpen)}
      >
        <Text style={styles.dropdownValue}>{value || 'Select'}</Text>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#B03385" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.dropdownOption,
                value === opt && styles.dropdownOptionSelected,
              ]}
              onPress={() => {
                setValue(opt);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  value === opt && styles.optionTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Try-On Details</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewRow}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Your Photo</Text>
            <Image source={{ uri: userImage }} style={styles.previewSmall} />
          </View>

          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Your Garment</Text>
            <Image source={{ uri: garmentImage }} style={styles.previewSmall} />
          </View>
        </View>

        {renderDropdown('Generation Category', genCategory, generationCategories, showGenDropdown, setShowGenDropdown, setGenCategory)}
        {renderDropdown('Age Group ', ageGroup, ageGroups, showAgeDropdown, setShowAgeDropdown, setAgeGroup)}
        {renderDropdown('Garment Size', garmentSize, commonSizes, showGarmentDropdown, setShowGarmentDropdown, setGarmentSize)}
        {renderDropdown('Your Body Size', bodySize, commonSizes, showBodyDropdown, setShowBodyDropdown, setBodySize)}

        {/* Women's optional measurements */}
        {genCategory === 'Women' && (
          <>
            <Text style={styles.sectionTitle}>Women's Measurements (Optional)</Text>
            {renderDropdown('Bust (inches)', bust, womenBustOptions, showBustDropdown, setShowBustDropdown, setBust)}
            {renderDropdown('Waist (inches)', waist, womenWaistOptions, showWaistDropdown, setShowWaistDropdown, setWaist)}
            {renderDropdown('Hip (inches)', hip, womenHipOptions, showHipDropdown, setShowHipDropdown, setHip)}
            {renderDropdown('Shoulder (inches)', shoulder, womenShoulderOptions, showShoulderDropdown, setShowShoulderDropdown, setShoulder)}
            {renderDropdown('Kurti Length (inches)', kurtiLength, womenKurtiLengthOptions, showKurtiLengthDropdown, setShowKurtiLengthDropdown, setKurtiLength)}
          </>
        )}

        {/* Men's optional measurements */}
        {genCategory === 'Men' && (
          <>
            <Text style={styles.sectionTitle}>Men's Measurements (Optional)</Text>
            {renderDropdown('Chest (inches)', chest, menChestOptions, showChestDropdown, setShowChestDropdown, setChest)}
            {renderDropdown('Waist (inches)', menWaist, menWaistOptions, showMenWaistDropdown, setShowMenWaistDropdown, setMenWaist)}
            {renderDropdown('Hip (inches)', menHip, menHipOptions, showMenHipDropdown, setShowMenHipDropdown, setMenHip)}
            {renderDropdown('Shoulder (inches)', menShoulder, menShoulderOptions, showMenShoulderDropdown, setShowMenShoulderDropdown, setMenShoulder)}
            {renderDropdown('Shirt Length (inches)', shirtLength, menShirtLengthOptions, showShirtLengthDropdown, setShowShirtLengthDropdown, setShirtLength)}
          </>
        )}

        {/* Kids optional measurements */}
        {genCategory === 'Kids' && (
          <>
            <Text style={styles.sectionTitle}>Kids Measurements (Optional)</Text>
            {renderDropdown('Chest (inches)', kidsChest, kidsChestOptions, showKidsChestDropdown, setShowKidsChestDropdown, setKidsChest)}
            {renderDropdown('Waist (inches)', kidsWaist, kidsWaistOptions, showKidsWaistDropdown, setShowKidsWaistDropdown, setKidsWaist)}
            {renderDropdown('Hip (inches)', kidsHip, kidsHipOptions, showKidsHipDropdown, setShowKidsHipDropdown, setKidsHip)}
            {renderDropdown('Shoulder (inches)', kidsShoulder, kidsShoulderOptions, showKidsShoulderDropdown, setShowKidsShoulderDropdown, setKidsShoulder)}
            {renderDropdown('Height (inches)', height, kidsHeightOptions, showHeightDropdown, setShowHeightDropdown, setHeight)}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.generateBtn,
            (!isReady || isGenerating) && styles.generateBtnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!isReady || isGenerating}
        >
          <Text style={styles.generateText}>
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </Text>
          {!isGenerating && (
            <Icon name="auto-fix" size={22} color="#fff" style={{ marginLeft: 10 }} />
          )}
        </TouchableOpacity>
      </View>

      {/* Lottie loading overlay */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <LottieView
            source={require('../../assets/animations/loading.json')} // ← Change this path to your actual Lottie file
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.loadingText}>Creating your virtual try-on...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#B03385' },

  content: { padding: 20, paddingBottom: 100 },

  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  previewContainer: {
    width: '48%',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B03385',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewSmall: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 25,
    marginBottom: 12,
    textAlign: 'center',
  },

  dropdownContainer: { marginBottom: 24 },
  dropdownTitle: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 8 },
  dropdownField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#d0c0ff',
    borderRadius: 12,
    backgroundColor: '#f9f9ff',
  },
  dropdownValue: { fontSize: 16, color: '#333' },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d0c0ff',
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3,
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionSelected: { backgroundColor: '#f0e6ff' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextSelected: { color: '#B03385', fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },

  generateBtn: {
    backgroundColor: '#B03385',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: '#f79bc6',
  },
  generateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Lottie Loading Overlay ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  lottieAnimation: {
    width: width * 0.60,
    height: width * 0.60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#B03385',
  },
});