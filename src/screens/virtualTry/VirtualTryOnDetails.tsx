// src/screens/VirtualTryOnDetails.tsx
import React, { useEffect, useState } from 'react';
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
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  useEffect(() => {
    const hydrateGeneratingStatus = async () => {
      try {
        const storedStatus = await AsyncStorage.getItem('isGenerating');
        if (storedStatus === 'true') {
          setIsGenerating(true);
        }
      } catch (error) {
        console.warn('[VirtualTryOnDetails] Failed to read generating status:', error);
      }
    };

    hydrateGeneratingStatus();
  }, []);

  // Selection States
  const [generationCategory, setGenerationCategory] = useState<string | null>(selectedCategory ?? null);

  // 'standard' | 'manual' | null
  const [selectionMode, setSelectionMode] = useState<'standard' | 'manual' | null>(null);

  // Standard mode: for Women/Men this is a size (S/M/L...), for Kids this is an age group (2-3 Y, 3-4 Y...)
  const [standardSize, setStandardSize] = useState<string | null>(null);

  // Manual mode fields (none mandatory)
  const [womenBust, setWomenBust] = useState<string | null>(null);
  const [womenWaist, setWomenWaist] = useState<string | null>(null);
  const [womenHip, setWomenHip] = useState<string | null>(null);
  const [womenShoulder, setWomenShoulder] = useState<string | null>(null);
  const [womenKurtiLength, setWomenKurtiLength] = useState<string | null>(null);

  const [menChest, setMenChest] = useState<string | null>(null);
  const [menWaist, setMenWaist] = useState<string | null>(null);
  const [menHip, setMenHip] = useState<string | null>(null);
  const [menShoulder, setMenShoulder] = useState<string | null>(null);
  const [menShirtLength, setMenShirtLength] = useState<string | null>(null);
  const [menTrouserLength, setMenTrouserLength] = useState<string | null>(null);

  const [kidsAge, setKidsAge] = useState<string | null>(null);
  const [kidsChest, setKidsChest] = useState<string | null>(null);
  const [kidsWaist, setKidsWaist] = useState<string | null>(null);
  const [kidsHip, setKidsHip] = useState<string | null>(null);
  const [kidsShoulder, setKidsShoulder] = useState<string | null>(null);
  const [kidsHeight, setKidsHeight] = useState<string | null>(null);

  // Option Constants
  const GENERATION_CATEGORIES = ['Kids', 'Women', 'Men'];
  const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

  const WOMEN_BUST_OPTIONS = ['30', '32', '34', '36', '38', '40', '42'];
  const WOMEN_WAIST_OPTIONS = ['24', '26', '28', '30', '32', '34', '36', '38', '40',];
  const WOMEN_HIP_OPTIONS = ['32', '34', '36', '38', '40', '42', '44', '46'];
  const WOMEN_SHOULDER_OPTIONS = ['13.5', '14', '14.5', '15', '15.5', '16', '16.5', '17', '17.5', '18', '18.5', '19'];
  const WOMEN_KURTI_LENGTH_OPTIONS = ['38', '40', '42', '44', '46', '48', '50'];

  const MEN_CHEST_OPTIONS = ['30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'];
  const MEN_WAIST_OPTIONS = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
  const MEN_HIP_OPTIONS = ['32', '34', '36', '38', '40', '42', '44', '46', '48'];
  const MEN_SHOULDER_OPTIONS = ['15', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
  const MEN_SHIRT_LENGTH_OPTIONS = ['26', '28', '30', '32', '34', '36', '38'];
  const MEN_TROUSER_LENGTH_OPTIONS = ['34', '36', '38', '40', '42', '44', '46'];

  const KIDS_AGE_OPTIONS = ['2-3 Y', '3-4 Y', '5-6 Y', '7-8 Y', '9-10 Y', '11-12 Y', '13-14 Y'];
  const KIDS_CHEST_OPTIONS = ['21', '22', '24', '26', '28', '30', '32'];
  const KIDS_WAIST_OPTIONS = ['20', '21', '22', '23', '24', '25', '26'];
  const KIDS_HIP_OPTIONS = ['22', '23', '25', '27', '29', '31', '33'];
  const KIDS_SHOULDER_OPTIONS = ['9', '9.5', '10.5', '11.5', '12.5', '13.5', '14.5'];
  const KIDS_HEIGHT_OPTIONS = ['36', '39', '44', '48', '52', '56', '60'];

  // Reset dependent selections when category or mode changes, so stale values
  // from a previous path are never silently submitted.
  const handleSelectCategory = (category: string) => {
    setGenerationCategory(category);
    setSelectionMode(null);
    setStandardSize(null);
  };

  const handleSelectMode = (mode: 'standard' | 'manual') => {
    setSelectionMode(mode);
    setStandardSize(null);
  };

  const handleGenerate = async () => {
    if (!generationCategory) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2: 'Please select a Category.',
      });
      return;
    }

    if (!selectionMode) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2: 'Please choose Standard Size or Manual Selection.',
      });
      return;
    }

    // Standard size (or age group for Kids) is mandatory when Standard mode is chosen.
    if (selectionMode === 'standard' && !standardSize) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2:
          generationCategory === 'Kids'
            ? 'Please select an age group.'
            : 'Please select a size.',
      });
      return;
    }

    // Manual mode: no fields are mandatory, so no further validation here.

    setGeneratedResult(null);
    setIsGenerating(true);
    await AsyncStorage.setItem('isGenerating', 'true');
    console.log('Starting generation with new API:', {
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
      if (generationCategory) formData.append('generation_category', generationCategory);
      if (selectionMode) formData.append('selection_mode', selectionMode);

      if (selectionMode === 'standard' && standardSize) {
        if (generationCategory === 'Kids') {
          formData.append('kids_age', standardSize);
        } else {
          formData.append('clothing_size', standardSize);
        }
      }

      if (selectionMode === 'manual') {
        if (generationCategory === 'Women') {
          if (womenBust) formData.append('women_bust', womenBust);
          if (womenWaist) formData.append('women_waist', womenWaist);
          if (womenHip) formData.append('women_hip', womenHip);
          if (womenShoulder) formData.append('women_shoulder', womenShoulder);
          if (womenKurtiLength) formData.append('women_kurti_length', womenKurtiLength);
        }

        if (generationCategory === 'Men') {
          if (menChest) formData.append('men_chest', menChest);
          if (menWaist) formData.append('men_waist', menWaist);
          if (menHip) formData.append('men_hip', menHip);
          if (menShoulder) formData.append('men_shoulder', menShoulder);
          if (menShirtLength) formData.append('men_shirt_length', menShirtLength);
        }

        if (generationCategory === 'Kids') {
          if (kidsAge) formData.append('kids_age', kidsAge);
          if (kidsChest) formData.append('kids_chest', kidsChest);
          if (kidsWaist) formData.append('kids_waist', kidsWaist);
          if (kidsHip) formData.append('kids_hip', kidsHip);
          if (kidsShoulder) formData.append('kids_shoulder', kidsShoulder);
          if (kidsHeight) formData.append('kids_height', kidsHeight);
        }
      }

      console.log(token);

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

      if (notifyOnCompletion) {
        setGeneratedResult({
          resultBase64: data.output_image_url,
          isUrl: true,
          userImage,
          garmentImage,
        });

        Toast.show({
          type: 'success',
          text1: 'Generation completed',
          text2: 'Your virtual try-on is ready. Tap View Result below.',
        });
      } else {
        navigation.navigate('TryOnResult', {
          resultBase64: data.output_image_url,
          isUrl: true,
          userImage,
          garmentImage,
        });

        Toast.show({ type: 'success', text1: 'Success', text2: 'Try-on generated' });
      }
    } catch (err) {
      const errors = JSON.parse(err.message.replace("Server returned 400: ", ""));
      console.log(errors);        // ["Insufficient credits."]
      console.log(errors[0]);     // "Insufficient credits."
      Toast.show({ type: 'error', text1: 'Failed to generate try-on', text2: errors[0] || 'Failed to generate try-on' });
    } finally {
      setIsGenerating(false);
      await AsyncStorage.setItem('isGenerating', 'false');
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

  // Standard-mode options depend on category: Kids -> age groups, Women/Men -> sizes
  const standardOptions = generationCategory === 'Kids' ? KIDS_AGE_OPTIONS : COMMON_SIZES;
  const standardLabel = generationCategory === 'Kids' ? 'Age Group' : 'Size';

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

        {isGenerating && notifyOnCompletion && (
          <View style={styles.backgroundNotice}>
            <Text style={styles.backgroundNoticeText}>
              We'll notify you when the images are generated. You can close this screen and come back later.
            </Text>
          </View>
        )}

        <View style={styles.formContainer}>
          {/* Step 1: Category (mandatory) */}
          <SelectionGroup
            title="Category"
            options={GENERATION_CATEGORIES}
            selectedValue={generationCategory}
            onSelect={handleSelectCategory}
            required
          />

          {/* Step 2: Standard vs Manual (mandatory, only shown once a category is picked) */}
          {generationCategory && (
            <View style={styles.selectionGroup}>
              <Text style={styles.selectionTitle}>
                Size Selection <Text style={{ color: '#B03385' }}>*</Text>
              </Text>
              <View style={styles.modeWrapper}>
                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    selectionMode === 'standard' && styles.modeCardSelected,
                  ]}
                  onPress={() => handleSelectMode('standard')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeCardTitle,
                      selectionMode === 'standard' && styles.modeCardTitleSelected,
                    ]}
                  >
                    Standard Size
                  </Text>
                  <Text
                    style={[
                      styles.modeCardSubtitle,
                      selectionMode === 'standard' && styles.modeCardSubtitleSelected,
                    ]}
                  >
                    {generationCategory === 'Kids' ? 'Pick an age group' : 'Pick S / M / L etc.'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    selectionMode === 'manual' && styles.modeCardSelected,
                  ]}
                  onPress={() => handleSelectMode('manual')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeCardTitle,
                      selectionMode === 'manual' && styles.modeCardTitleSelected,
                    ]}
                  >
                    Manual Selection
                  </Text>
                  <Text
                    style={[
                      styles.modeCardSubtitle,
                      selectionMode === 'manual' && styles.modeCardSubtitleSelected,
                    ]}
                  >
                    Enter exact measurements
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3a: Standard size / age group (mandatory when this path is chosen) */}
          {generationCategory && selectionMode === 'standard' && (
            <SelectionGroup
              title={standardLabel}
              options={standardOptions}
              selectedValue={standardSize}
              onSelect={setStandardSize}
              required
            />
          )}

          {/* Step 3b: Manual measurements (nothing mandatory) */}
          {generationCategory === 'Women' && selectionMode === 'manual' && (
            <>
              <SelectionGroup
                title="Bust"
                options={WOMEN_BUST_OPTIONS}
                selectedValue={womenBust}
                onSelect={setWomenBust}
              />
              <SelectionGroup
                title="Waist"
                options={WOMEN_WAIST_OPTIONS}
                selectedValue={womenWaist}
                onSelect={setWomenWaist}
              />
              <SelectionGroup
                title="Hip"
                options={WOMEN_HIP_OPTIONS}
                selectedValue={womenHip}
                onSelect={setWomenHip}
              />
              <SelectionGroup
                title="Shoulder"
                options={WOMEN_SHOULDER_OPTIONS}
                selectedValue={womenShoulder}
                onSelect={setWomenShoulder}
              />
              <SelectionGroup
                title="Kurti Length"
                options={WOMEN_KURTI_LENGTH_OPTIONS}
                selectedValue={womenKurtiLength}
                onSelect={setWomenKurtiLength}
              />
            </>
          )}

          {generationCategory === 'Men' && selectionMode === 'manual' && (
            <>
              <SelectionGroup
                title="Chest"
                options={MEN_CHEST_OPTIONS}
                selectedValue={menChest}
                onSelect={setMenChest}
              />
              <SelectionGroup
                title="Waist"
                options={MEN_WAIST_OPTIONS}
                selectedValue={menWaist}
                onSelect={setMenWaist}
              />
              <SelectionGroup
                title="Hip"
                options={MEN_HIP_OPTIONS}
                selectedValue={menHip}
                onSelect={setMenHip}
              />
              <SelectionGroup
                title="Shoulder"
                options={MEN_SHOULDER_OPTIONS}
                selectedValue={menShoulder}
                onSelect={setMenShoulder}
              />
              <SelectionGroup
                title="Shirt Length"
                options={MEN_SHIRT_LENGTH_OPTIONS}
                selectedValue={menShirtLength}
                onSelect={setMenShirtLength}
              />

              <SelectionGroup
                title="Trouser/Pants Length"
                options={MEN_TROUSER_LENGTH_OPTIONS}
                selectedValue={menTrouserLength}
                onSelect={setMenTrouserLength}
              />
            </>
          )}

          {generationCategory === 'Kids' && selectionMode === 'manual' && (
            <>
              <SelectionGroup
                title="Age"
                options={KIDS_AGE_OPTIONS}
                selectedValue={kidsAge}
                onSelect={setKidsAge}
              />
              <SelectionGroup
                title="Chest"
                options={KIDS_CHEST_OPTIONS}
                selectedValue={kidsChest}
                onSelect={setKidsChest}
              />
              <SelectionGroup
                title="Waist"
                options={KIDS_WAIST_OPTIONS}
                selectedValue={kidsWaist}
                onSelect={setKidsWaist}
              />
              <SelectionGroup
                title="Hip"
                options={KIDS_HIP_OPTIONS}
                selectedValue={kidsHip}
                onSelect={setKidsHip}
              />
              <SelectionGroup
                title="Shoulder"
                options={KIDS_SHOULDER_OPTIONS}
                selectedValue={kidsShoulder}
                onSelect={setKidsShoulder}
              />
              <SelectionGroup
                title="Height"
                options={KIDS_HEIGHT_OPTIONS}
                selectedValue={kidsHeight}
                onSelect={setKidsHeight}
              />
            </>
          )}

          {generatedResult && (
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>Your try-on is ready</Text>
              <Text style={styles.notificationMessage}>
                Your image has finished generating. Tap below to view the result.
              </Text>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate('TryOnResult', generatedResult)}
                activeOpacity={0.8}
              >
                <Text style={styles.notificationButtonText}>View Result</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {!isGenerating ? (
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerate}
          >
            <Text style={styles.generateText}>Generate Try-On</Text>
            <Icons name="auto-awesome" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        ) : (
          <View style={styles.generationLockedContainer}>
            <Text style={styles.generationLockedText}>
              Image generation is in progress. Please wait for completion.
            </Text>
          </View>
        )}
      </View>

      {/* Lottie loading overlay */}
      {isGenerating && !notifyOnCompletion && (
        <View style={styles.loadingOverlay}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.loadingText}>Creating your virtual try-on...</Text>
          <TouchableOpacity
            style={styles.notifyButton}
            onPress={() => {
              setNotifyOnCompletion(true);
              Toast.show({
                type: 'success',
                text1: 'Background notification enabled',
                text2: 'We will notify you when the try-on image is ready.',
              });
            }}
            activeOpacity={0.8}
          >
            <Icon
              name="bell-outline"
              size={20}
              color="#111111"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.notifyButtonText}>Notify me later</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 120,
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

  /* Standard vs Manual mode cards */
  modeWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  modeCardSelected: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  modeCardTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 4,
  },
  modeCardTitleSelected: {
    color: '#FFFFFF',
  },
  modeCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  modeCardSubtitleSelected: {
    color: '#DDDDDD',
  },

  notifyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  notifyToggleActive: {
    borderColor: '#111111',
    backgroundColor: '#F7F7F7',
  },
  notifyToggleText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  notifyToggleTextActive: {
    color: '#111111',
    fontWeight: '700',
  },

  notificationCard: {
    marginTop: 20,
    backgroundColor: '#F4F7FF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D3DAF4',
  },
  notificationTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#555555',
    marginBottom: 14,
    lineHeight: 19,
  },
  notificationButton: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#111111',
    alignItems: 'center',
  },
  notificationButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },

  notifyButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  notifyButtonActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  notifyButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#111111',
  },
  notifyButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  backgroundNotice: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#E9F2FF',
    borderWidth: 1,
    borderColor: '#C9DAF7',
  },
  backgroundNoticeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#1B4F8C',
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
    marginBottom: 26,
  },
  dropdownTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginBottom: 8,
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
    backgroundColor: '#F7F7F7',
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