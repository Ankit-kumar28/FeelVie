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
import Icons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { BASE_URL } from '../../config/env';

const { width, height } = Dimensions.get('window');

export default function VirtualTryOnDetails({ route, navigation }) {
  console.debug('[Screen 2] VirtualTryOnDetails mounted');

  const { userImage, garmentImage, selectedCategory, onSuccess, imageScore, userDetails } = route.params;

  console.debug('[Screen 2] Received from Screen 1:', {
    userImageExists: !!userImage,
    garmentImageExists: !!garmentImage,
    selectedCategory,
    imageScore: imageScore?.total_score,
    userDetails,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Selection States
  const [gender, setGender] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [heightRange, setHeightRange] = useState<string | null>(null);
  const [bodyBuild, setBodyBuild] = useState<string | null>(null);
  const [clothingFit, setClothingFit] = useState<string | null>(null);
  const [outfitType, setOutfitType] = useState<string | null>(null);
  const [shoppingCategory, setShoppingCategory] = useState<string | null>(null);
  const [clothingSize, setClothingSize] = useState<string | null>(null);

  // Option Constants
  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const AGE_OPTIONS = ['Kid (0–12)', 'Teen (13–17)', 'Adult (18–40)', 'Above 40'];
  const HEIGHT_OPTIONS = ['Below 4 ft', '4–5 ft', '5–5.5 ft', '5.5–6 ft', 'Above 6 ft'];
  const BUILD_OPTIONS = ['Slim', 'Regular', 'Athletic', 'Curvy', 'Broad/Heavy'];
  const FIT_OPTIONS = ['Tight Fit', 'Regular Fit', 'Relaxed Fit', 'Oversized'];
  const OUTFIT_OPTIONS = ['Casual', 'Formal', 'Traditional', 'Party Wear', 'Sportswear'];
  const CATEGORY_OPTIONS = ['Men', 'Women', 'Kids', 'Unisex'];
  const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const handleGenerate = async () => {
    if (!gender || !ageGroup) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2: 'Please select Gender, Age Group, and Shopping Category.',
      });
      return;
    }

    setIsGenerating(true);
    console.log("Starting generation with new API:", {
      userImage: !!userImage,
      garmentImage: !!garmentImage,
    });

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Please login first' });
        setIsGenerating(false);
        return;
      }

      const formData = new FormData();
      formData.append('personImage', {
        uri: userImage,
        name: 'person.jpg',
        type: 'image/jpeg',
      } as any);

      formData.append('garmentImage', {
        uri: garmentImage,
        name: 'garment.jpg',
        type: 'image/jpeg',
      } as any);

      // Add selection details
      if (gender) formData.append('gender', gender);
      if (ageGroup) formData.append('age_group', ageGroup);
      if (heightRange) formData.append('height_range', heightRange);
      if (bodyBuild) formData.append('body_build', bodyBuild);
      if (clothingFit) formData.append('clothing_fit', clothingFit);
      if (outfitType) formData.append('outfit_type', outfitType);
      if (shoppingCategory) formData.append('shopping_category', shoppingCategory);
      if (clothingSize) formData.append('clothing_size', clothingSize);

      const response = await fetch('https://api.feelvie.com/api/secure/vton/try-on/generate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (onSuccess) onSuccess();

      navigation.navigate('TryOnResult', {
        resultBase64: data.output_image_url,
        isUrl: true,
        userImage,
        garmentImage,
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Try-on generated' });
    } catch (err) {
      console.log(err);
      Toast.show({ type: 'error', text1: 'Failed to generate try-on', text2: 'Please try again' });
    } finally {
      setIsGenerating(false);
    }
  };

  const SelectionGroup = ({ title, options, selectedValue, onSelect, required = false }: any) => (
    <View style={styles.selectionGroup}>
      <Text style={styles.selectionTitle}>
        {title} {required && <Text style={{ color: '#B03385' }}>*</Text>}
      </Text>
      <View style={styles.optionsWrapper}>
        {options.map((option: string) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionChip,
              selectedValue === option && styles.optionChipSelected,
            ]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionChipText,
                selectedValue === option && styles.optionChipTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Images</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewRow}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Your Photo</Text>
            <Image source={{ uri: userImage }} style={styles.previewImage} resizeMode="cover" />
          </View>

          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Garment</Text>
            <Image source={{ uri: garmentImage }} style={styles.previewImage} resizeMode="cover" />
          </View>
        </View>

        {/* <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Ready to Generate?</Text>
          <Text style={styles.infoText}>Your virtual try-on will be generated using the images you provided. This process may take a few seconds.</Text>
        </View> */}

        <View style={styles.formContainer}>
          <SelectionGroup
            title="Gender?"
            options={GENDER_OPTIONS}
            selectedValue={gender}
            onSelect={setGender}
            required
          />

          <SelectionGroup
            title="Age Group?"
            options={AGE_OPTIONS}
            selectedValue={ageGroup}
            onSelect={setAgeGroup}
            required
          />

          <SelectionGroup
            title="Height Range?"
            options={HEIGHT_OPTIONS}
            selectedValue={heightRange}
            onSelect={setHeightRange}
          />

          <SelectionGroup
            title="Body Build?"
            options={BUILD_OPTIONS}
            selectedValue={bodyBuild}
            onSelect={setBodyBuild}
          />

          <SelectionGroup
            title="Clothing Fit?"
            options={FIT_OPTIONS}
            selectedValue={clothingFit}
            onSelect={setClothingFit}
          />


          <SelectionGroup
            title="Clothing Size"
            options={SIZE_OPTIONS}
            selectedValue={clothingSize}
            onSelect={setClothingSize}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.generateBtn,
            isGenerating && styles.generateBtnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          <Text style={styles.generateText}>
            {isGenerating ? 'Generating...' : 'Generate Try-On'}
          </Text>
          {!isGenerating && (
            <Icons name="auto-awesome" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
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
    </View>
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
    marginBottom: 32,
    gap: 12,
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F7F7F7',
  },

  infoSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: '#E8E8E8',
    paddingHorizontal: 18,
    paddingVertical: 20,
    marginTop: 12,
    marginBottom: 80,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 10,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    lineHeight: 22,
  },
  formContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  selectionGroup: {
    marginBottom: 24,
  },
  selectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 12,
    fontWeight: '600',
  },
  optionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  optionChipSelected: {
    borderColor: '#b3b3b3af',
    backgroundColor: '#b3b3b3af',
  },
  optionChipText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  optionChipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  categoryBold: {
    fontWeight: '600',
    color: '#111111',
  },
  detailsBox: {
    marginTop: 16,
    backgroundColor: 'rgba(248, 172, 27, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f8ac1b',
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8ac1b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248, 172, 27, 0.2)',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
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