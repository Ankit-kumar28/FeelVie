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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { BASE_URL } from '../../config/env';

const { width, height } = Dimensions.get('window');

// Generation categories
const generationCategories = ['Kids', 'Women', 'Men'];

// Common garment sizes (used for all)
const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

// Common Age Groups
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

// Kids Measurement Chart values
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

  const isWomenSelected = genCategory === 'Women';
  const isMenSelected = genCategory === 'Men';
  const isKidsSelected = genCategory === 'Kids';

  const isReady = genCategory && garmentSize && bodySize && !isGenerating;

  const handleGenerate = async () => {
    // ... (exact same logic - unchanged)
    if (!isReady) {
      Toast.show({ type: 'error', text1: 'Please select all required details' });
      return;
    }

    setIsGenerating(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Please login first' });
        return;
      }

      const formData = new FormData();
      formData.append('person_image', { uri: userImage, type: 'image/jpg', name: 'person.jpg' } as any);
      formData.append('garment_image', { uri: garmentImage, type: 'image/jpg', name: 'garment.jpg' } as any);
      formData.append('category', selectedCategory);

      const response = await fetch(`${BASE_URL}/api/secure/vton/try-on/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (onSuccess) onSuccess();

      navigation.navigate('TryOnResult', {
        resultBase64: data.output_image,
        userImage,
        garmentImage,
        selectedCategory,
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Try-on generated' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to generate try-on', text2: 'Please try again' });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderDropdown = (title: string, value: any, options: string[], isOpen: boolean, setOpen: any, setValue: any) => (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.dropdownField}
        onPress={() => setOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownValue}>{value || 'Select option'}</Text>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color="#111111" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111111" />
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
        {renderDropdown('Age Group', ageGroup, ageGroups, showAgeDropdown, setShowAgeDropdown, setAgeGroup)}
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
            <Icon name="auto-fix" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
          )}
        </TouchableOpacity>
      </View>

      {/* Lottie loading overlay */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
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
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { 
    fontSize: 19, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111',
    letterSpacing: -0.3,
  },

  content: { 
    padding: 20, 
    paddingBottom: 120 
  },

  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  previewContainer: {
    width: '48%',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewSmall: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F7F7F7',
  },

  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginTop: 32,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  /* Dropdown Styles */
  dropdownContainer: { 
    marginBottom: 26 
  },
  dropdownTitle: { 
    fontSize: 14, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginBottom: 8 
  },
  dropdownField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownValue: { 
    fontSize: 16, 
    color: '#111111',
    fontFamily: 'Poppins-Regular',
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  dropdownOptionSelected: { 
    backgroundColor: '#F7F7F7' 
  },
  optionText: { 
    fontSize: 16, 
    color: '#111111',
    fontFamily: 'Poppins-Regular',
  },
  optionTextSelected: { 
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },

  generateBtn: {
    backgroundColor: '#111111',
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: '#AAAAAA',
  },
  generateText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
  },

  /* Loading Overlay */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  lottieAnimation: {
    width: width * 0.65,
    height: width * 0.65,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#111111',
    textAlign: 'center',
  },
});