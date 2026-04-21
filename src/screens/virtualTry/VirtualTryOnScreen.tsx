// src/screens/VirtualTryOnScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const USER_IMAGE_KEY = 'VIRTUAL_TRYON_USER_IMAGE';
const GARMENT_IMAGE_KEY = 'VIRTUAL_TRYON_GARMENT_IMAGE';

const categories = [
  { label: 'Tops', value: 'top clothes' },
  { label: 'Bottoms', value: 'bottom clothes' },
  { label: 'Dress', value: 'dress' },
];

export default function VirtualTryOnScreen() {
  console.debug('[Screen 1] VirtualTryOnScreen mounted');

  const navigation = useNavigation();
  const route = useRoute();

  const [userImage, setUserImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    console.debug('[Screen 1] Loading stored images from AsyncStorage');
    loadStoredImages();
  }, []);

  useEffect(() => {
    // Auto-load garment image from route params (when navigating from HomeScreen)
    if (route.params?.garmentImage) {
      console.debug('[Screen 1] Auto-loading garment image from HomeScreen');
      setGarmentImage(route.params.garmentImage);
      AsyncStorage.setItem(GARMENT_IMAGE_KEY, route.params.garmentImage).catch(err =>
        console.error('[Screen 1] Failed to save auto-loaded garment:', err)
      );
    }
  }, [route.params?.garmentImage]);

  const loadStoredImages = async () => {
    console.debug('[Screen 1] Fetching images from storage');
    try {
      const user = await AsyncStorage.getItem(USER_IMAGE_KEY);
      const garment = await AsyncStorage.getItem(GARMENT_IMAGE_KEY);
      if (user) setUserImage(user);
      if (garment) setGarmentImage(garment);
    } catch (err) {
      console.error('[Screen 1] Failed to load images:', err);
    }
  };

  const pickImage = (setter: any, key: string, type: string) => {
    console.debug(`[Screen 1] Opening picker for ${type}`);
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, async response => {
      if (response.didCancel) return console.debug(`[Screen 1] ${type} cancelled`);
      if (response.errorCode) return console.error(`[Screen 1] ${type} error:`, response.errorMessage);

      const uri = response.assets?.[0]?.uri;
      if (uri) {
        console.debug(`[Screen 1] ${type} selected → uri: ${uri.substring(0, 60)}...`);
        setter(uri);
        await AsyncStorage.setItem(key, uri);
        console.debug(`[Screen 1] ${type} saved`);
      }
    });
  };

  const removeImage = async (key: string, setter: any, type: string) => {
    console.debug(`[Screen 1] Removing ${type}`);
    setter(null);
    try {
      await AsyncStorage.removeItem(key);
      Toast.show({ type: 'info', text1: `${type} removed` });
    } catch (err) {
      console.error(`[Screen 1] Failed to remove ${type}:`, err);
    }
  };

  const toggleCategory = (value: string) => {
    setSelectedCategory(value);
    setCategoryModalVisible(false);
  };

  const clearImages = async () => {
    console.debug('[Screen 1] clearImages called from Screen 2 after success');
    setUserImage(null);
    setGarmentImage(null);
    try {
      await AsyncStorage.multiRemove([USER_IMAGE_KEY, GARMENT_IMAGE_KEY]);
    } catch (err) {
      console.error('[Screen 1] Failed to clear images:', err);
    }
  };

  const handleNext = () => {
    if (!userImage || !garmentImage) {
      Toast.show({ type: 'error', text1: 'Please upload both images' });
      return;
    }
    if (!selectedCategory) {
      Toast.show({ type: 'error', text1: 'Please select a type' });
      return;
    }
    navigation.navigate('VirtualTryOnDetails', {
      userImage,
      garmentImage,
      selectedCategory,
      onSuccess: clearImages,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" /> */}
      {/* Header */}
      <View style={[styles.header]}>
        <Text style={styles.logo}>Virtual Try</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Garment Type</Text>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory && styles.categoryButtonActive]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Icon name="hanger" size={20} color={selectedCategory ? '#f8ac1b' : '#666666'} />
            <Text style={[styles.categoryButtonText, selectedCategory && styles.categoryButtonTextActive]}>
              {selectedCategory
                ? categories.find(c => c.value === selectedCategory)?.label
                : 'Select a garment type'}
            </Text>
            <Icon name="chevron-right" size={20} color={selectedCategory ? '#f8ac1b' : '#AAAAAA'} />
          </TouchableOpacity>
        </View>

        {/* Images Preview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Images</Text>
            <TouchableOpacity onPress={() => setShowInstructions(true)}>
              <Icon name="information-outline" size={20} color="#f8ac1b" />
            </TouchableOpacity>
          </View>

          {/* Instructions Button */}
          {/* <View style={styles.buttonRowContainer}>
            <TouchableOpacity
              style={styles.instructionBtn}
              onPress={() => setShowInstructions(true)}
            >
              <Icon name="information-outline" size={22} color="#111111" />
              <Text style={styles.instructionText}>Instructions</Text>
            </TouchableOpacity>
          </View> */}

          {/* One-Below-Another Layout when both images are uploaded */}
          {garmentImage && userImage ? (
            <View>
              {/* Garment Image */}
              <View>
                <Text style={styles.imageLabel}>Garment</Text>
                <View style={[styles.uploadCard, { height: 280, position: 'relative' }]}>
                  <Image source={{ uri: garmentImage }} style={styles.uploadImageDisplay} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeIconButton}
                    onPress={() => removeImage(GARMENT_IMAGE_KEY, setGarmentImage, 'Garment')}
                  >
                    <Icon name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.secondaryBtn, { marginTop: 12 }]}
                  onPress={() => pickImage(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
                >
                  <Icon name="pencil" size={18} color="#111111" />
                  <Text style={styles.actionBtnText}>Change Garment</Text>
                </TouchableOpacity>
              </View>

              {/* User Photo */}
              <View style={{ marginTop: 24 }}>
                <Text style={styles.imageLabel}>Your Photo</Text>
                <View style={[styles.uploadCard, { height: 280, position: 'relative' }]}>
                  <Image source={{ uri: userImage }} style={styles.uploadImageDisplay} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeIconButton}
                    onPress={() => removeImage(USER_IMAGE_KEY, setUserImage, 'Photo')}
                  >
                    <Icon name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.secondaryBtn, { marginTop: 12 }]}
                  onPress={() => pickImage(setUserImage, USER_IMAGE_KEY, 'Photo')}
                >
                  <Icon name="pencil" size={18} color="#111111" />
                  <Text style={styles.actionBtnText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Single Upload - Garment */}
              {!garmentImage ? (
                <TouchableOpacity
                  style={styles.uploadCard}
                  onPress={() => pickImage(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
                >
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="hanger" size={56} color="#f8ac1b" />
                    <Text style={styles.uploadPlaceholderText}>Upload garment</Text>
                    <Text style={styles.uploadSubtext}>Front view, plain background</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadCard, { position: 'relative' }]}>
                  <Image source={{ uri: garmentImage }} style={styles.uploadImageDisplay} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.removeIconButton}
                    onPress={() => removeImage(GARMENT_IMAGE_KEY, setGarmentImage, 'Garment')}
                  >
                    <Icon name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Single Upload - User Photo */}
              {!userImage ? (
                <TouchableOpacity
                  style={[styles.uploadCard, styles.uploadCardMarginTop]}
                  onPress={() => pickImage(setUserImage, USER_IMAGE_KEY, 'User Photo')}
                >
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="account-box-outline" size={56} color="#f8ac1b" />
                    <Text style={styles.uploadPlaceholderText}>Upload your photo</Text>
                    <Text style={styles.uploadSubtext}>Face camera, good lighting</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadCard, styles.uploadCardMarginTop, { position: 'relative' }]}>
                  <Image source={{ uri: userImage }} style={styles.uploadImageDisplay} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.removeIconButton}
                    onPress={() => removeImage(USER_IMAGE_KEY, setUserImage, 'Photo')}
                  >
                    <Icon name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
        <View style={{ paddingHorizontal: 20 , paddingBottom: 120 , paddingTop: 12 }}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!userImage || !garmentImage || !selectedCategory) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!userImage || !garmentImage || !selectedCategory}
          >
            <Text style={styles.nextText}>Try On</Text>
            <Icons name="auto-awesome" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Instructions Modal */}
      <Modal visible={showInstructions} animationType="slide" transparent onRequestClose={() => setShowInstructions(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to Use Virtual Try-On</Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)}>
                <Icon name="close" size={28} color="#111111" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.stepTitle}>Step 1: Select Type</Text>
              <Text style={styles.stepDesc}>Choose from Tops, Bottoms, or Dress using the buttons above.</Text>

              <Text style={styles.stepTitle}>Step 2: Upload Your Photo</Text>
              <Text style={styles.stepDesc}>
                • Stand straight, face the camera{'\n'}
                • Full body visible (head to feet){'\n'}
                • Plain background{'\n'}
                • Good lighting{'\n'}
                • No group or mirror selfies
              </Text>

              <Text style={styles.sampleLabel}>Example Images</Text>

              <Image
                source={require('../../assets/images/instruct1.jpg')}
                style={styles.fullSampleImage}
                resizeMode="contain"
              />
              <Text style={styles.imageCaption}>Good full-body photo</Text>

              <Image
                source={require('../../assets/images/instruct2.jpg')}
                style={styles.fullSampleImage}
                resizeMode="contain"
              />
              <Text style={styles.imageCaption}>Good garment photo</Text>

              <Text style={styles.stepTitle}>Step 3: Upload Garment</Text>
              <Text style={styles.stepDesc}>
                • Front view{'\n'}
                • Plain background preferred{'\n'}
                • Full garment visible{'\n'}
                • High quality{'\n'}
                • One garment per photo
              </Text>

              <Text style={styles.stepTitle}>Step 4: Select Details</Text>
              <Text style={styles.stepDesc}>On the next page select generation category, garment size, and body size.</Text>

              <Text style={styles.stepTitle}>Step 5: Generate</Text>
              <Text style={styles.stepDesc}>Click Generate to see the result.</Text>

              <Image
                source={require('../../assets/images/instruct3.jpg')}
                style={styles.fullSampleImage}
                resizeMode="contain"
              />

              <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity style={styles.gotItButton} onPress={() => setShowInstructions(false)}>
              <Text style={styles.gotItText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal visible={categoryModalVisible} animationType="fade" transparent onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.categoryModalOverlay}>
          <View style={styles.categoryModalContent}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>Select Garment Type</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color="#111111" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.categoryCard, selectedCategory === cat.value && styles.categoryCardActive]}
                  onPress={() => toggleCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryName,
                      selectedCategory === cat.value && styles.categoryNameActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'red',
  },
  scrollContent: {
    paddingBottom: 300,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#111111',
    height: 'auto',
    letterSpacing: -0.5,
  },

  /* Sections */
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    fontWeight: '700',
  },
  sectionSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
  },

  /* Dropdown Picker */
  dropdownContainer: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
  },
  dropdownPicker: {
    height: 50,
    color: '#111111',
  },

  /* Image Label */
  imageLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    fontWeight: '600',
    marginBottom: 8,
  },

  /* Remove Icon Button */
  removeIconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  /* Type Selection Grid */
  typeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  typeCardActive: {
    backgroundColor: '#FFF8E7',
    borderColor: '#f8ac1b',
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIconActive: {
    backgroundColor: 'rgba(248, 172, 27, 0.1)',
  },
  typeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#666666',
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#f8ac1b',
    fontWeight: '700',
  },

  /* Upload Card */
  uploadCard: {
    height: 260,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderStyle: 'dashed',
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadImageDisplay: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderText: {
    marginTop: 12,
    color: '#111111',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
  },
  uploadSubtext: {
    marginTop: 6,
    color: '#AAAAAA',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },

  /* Half-Half Layout */
  halfHalfContainer: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 16,
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  halfCard: {
    flex: 1,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  halfImage: {
    width: '100%',
    height: '100%',
  },
  halfLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    gap: 6,
  },
  halfLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
  },

  uploadCardMarginTop: {
    marginTop: 12,
  },

  /* Action Buttons */
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  secondaryBtn: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    fontWeight: '600',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  nextButton: {
    backgroundColor: '#111111',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonDisabled: {
    backgroundColor: '#DCDCDC',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8'
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalScrollContent: {
    paddingBottom: 100
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginTop: 20,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
  },
  sampleLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textAlign: 'center',
    marginVertical: 24,
    fontWeight: '700',
  },
  fullSampleImage: {
    width: '100%',
    height: 480,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F5F5F5',
  },
  imageCaption: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  gotItButton: {
    backgroundColor: '#f8ac1b',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#f8ac1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gotItText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
  },

  /* Category Button */
  categoryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryButtonActive: {
    backgroundColor: '#FFF8E7',
    borderColor: '#f8ac1b',
  },
  categoryButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  categoryButtonTextActive: {
    color: '#111111',
    fontWeight: '600',
  },

  /* Category Selection Modal */
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '85%',
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxHeight: '80%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 12,
  },
  categoryCard: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  categoryCardActive: {
    backgroundColor: '#FFF8E7',
    borderColor: '#f8ac1b',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconActive: {
    backgroundColor: 'rgba(248, 172, 27, 0.1)',
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#666666',
    textAlign: 'center',
    fontWeight: '600',
  },
  categoryNameActive: {
    color: '#f8ac1b',
    fontWeight: '700',
  },
});