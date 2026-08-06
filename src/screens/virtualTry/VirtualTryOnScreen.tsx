// src/screens/VirtualTryOnScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker'; // <-- Replaced image picker
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const USER_IMAGE_KEY = 'VIRTUAL_TRYON_USER_IMAGE';
const GARMENT_IMAGE_KEY = 'VIRTUAL_TRYON_GARMENT_IMAGE';
const IOS_POLICY_ACCEPTED_KEY = 'VIRTUAL_TRYON_IOS_POLICY_ACCEPTED';

export default function VirtualTryOnScreen() {
  console.debug('[Screen 1] VirtualTryOnScreen mounted');

  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [userImage, setUserImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasAcceptedPolicy, setHasAcceptedPolicy] = useState(false);

  // Re-read on focus: the screen stays mounted as a tab, and images can also be
  // picked from HomeScreen using the same storage keys.
  useFocusEffect(
    useCallback(() => {
      console.debug('[Screen 1] Loading stored images from AsyncStorage');
      loadStoredImages();
    }, [])
  );

  useEffect(() => {
    const loadPolicyAcceptance = async () => {
      if (Platform.OS !== 'ios') return;

      try {
        const storedValue = await AsyncStorage.getItem(IOS_POLICY_ACCEPTED_KEY);
        setHasAcceptedPolicy(storedValue === 'true');
      } catch (err) {
        console.error('[Screen 1] Failed to load policy acceptance:', err);
      }
    };

    loadPolicyAcceptance();
  }, []);

  useEffect(() => {
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

  // --- NEW IMAGE SELECTION LOGIC ---
  const cropConfig = {
    width: 900,
    height: 1400, // 3:4 aspect ratio (shorter than 9:16)
    cropping: true,
    mediaType: 'photo' as const,
  };

  const handleImageResult = async (image: any, setter: any, key: string, type: string) => {
    if (image?.path) {
      console.debug(`[Screen 1] ${type} selected → uri: ${image.path.substring(0, 60)}...`);
      setter(image.path);
      await AsyncStorage.setItem(key, image.path);
      console.debug(`[Screen 1] ${type} saved`);
    }
  };

  const openCamera = async (setter: any, key: string, type: string) => {
    try {
      const image = await ImagePicker.openCamera(cropConfig);
      await handleImageResult(image, setter, key, type);
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error(`[Screen 1] ${type} camera error:`, error);
        Toast.show({ type: 'error', text1: 'Failed to open camera' });
      }
    }
  };

  const openGallery = async (setter: any, key: string, type: string) => {
    try {
      const image = await ImagePicker.openPicker(cropConfig);
      await handleImageResult(image, setter, key, type);
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error(`[Screen 1] ${type} gallery error:`, error);
        Toast.show({ type: 'error', text1: 'Failed to open gallery' });
      }
    }
  };

  const selectImageSource = (setter: any, key: string, type: string) => {
    Alert.alert(
      `Upload ${type}`,
      'Choose an option to upload your image:',
      [
        { text: 'Take a Photo', onPress: () => openCamera(setter, key, type) },
        { text: 'Choose from Gallery', onPress: () => openGallery(setter, key, type) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };
  // ---------------------------------

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

  const clearImages = async () => {
    console.debug('[Screen 1] clearImages called after success');
    setUserImage(null);
    setGarmentImage(null);
    try {
      await AsyncStorage.multiRemove([USER_IMAGE_KEY, GARMENT_IMAGE_KEY]);
    } catch (err) {
      console.error('[Screen 1] Failed to clear images:', err);
    }
  };

  const handlePolicyToggle = async () => {
    if (Platform.OS !== 'ios') return;

    const nextValue = !hasAcceptedPolicy;
    setHasAcceptedPolicy(nextValue);
    try {
      await AsyncStorage.setItem(IOS_POLICY_ACCEPTED_KEY, nextValue ? 'true' : 'false');
    } catch (err) {
      console.error('[Screen 1] Failed to save policy acceptance:', err);
    }
  };

  const handleNext = async () => {
    if (!userImage || !garmentImage) {
      Toast.show({ type: 'error', text1: 'Please upload both images' });
      return;
    }

    if (Platform.OS === 'ios' && !hasAcceptedPolicy) {
      Toast.show({ type: 'error', text1: 'Please accept the privacy policy and terms first' });
      return;
    }

    navigation.navigate('VirtualTryOnDetails', {
      userImage,
      garmentImage,
      onSuccess: clearImages,
    });
  };

  const canProceed = !!userImage && !!garmentImage && (Platform.OS !== 'ios' || hasAcceptedPolicy);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header]}>
        <Text style={styles.logo}>Virtual Try</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Images</Text>
            <TouchableOpacity onPress={() => setShowInstructions(true)}>
              <Icon name="information-outline" size={20} color="#f8ac1b" />
            </TouchableOpacity>
          </View>

          <View>
            <View style={styles.previewRow}>
              {/* Garment Section */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabelSide}>Garment</Text>
                {garmentImage ? (
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: garmentImage }} style={styles.previewImageSide} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeIconButtonSmall}
                      onPress={() => removeImage(GARMENT_IMAGE_KEY, setGarmentImage, 'Garment')}
                    >
                      <Icon name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.smallUploadPlaceholder}
                    onPress={() => selectImageSource(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
                  >
                    <Icon name="hanger" size={32} color="#f8ac1b" />
                    <Text style={styles.smallUploadText}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* User Photo Section */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabelSide}>Your Photo</Text>
                {userImage ? (
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: userImage }} style={styles.previewImageSide} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeIconButtonSmall}
                      onPress={() => removeImage(USER_IMAGE_KEY, setUserImage, 'Photo')}
                    >
                      <Icon name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.smallUploadPlaceholder}
                    onPress={() => selectImageSource(setUserImage, USER_IMAGE_KEY, 'User Photo')}
                  >
                    <Icon name="account-box-outline" size={32} color="#f8ac1b" />
                    <Text style={styles.smallUploadText}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn, { flex: 1 }]}
                onPress={() => selectImageSource(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
              >
                <Icon name={garmentImage ? "pencil" : "plus"} size={16} color="#111111" />
                <Text style={[styles.actionBtnText, { fontSize: 11 }]}>{garmentImage ? 'Change' : 'Add'} Garment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn, { flex: 1 }]}
                onPress={() => selectImageSource(setUserImage, USER_IMAGE_KEY, 'Photo')}
              >
                <Icon name={userImage ? "pencil" : "plus"} size={16} color="#111111" />
                <Text style={[styles.actionBtnText, { fontSize: 11 }]}>{userImage ? 'Change' : 'Add'} Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
          {Platform.OS === 'ios' && (
            <>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={handlePolicyToggle}
                  activeOpacity={0.8}
                >
                  <Icons
                    name={hasAcceptedPolicy ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={hasAcceptedPolicy ? '#111111' : '#AAAAAA'}
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxText}>
                  By continuing, I accept the{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    Privacy Policy
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate('TermsOfUse')}
                  >
                    Terms and Conditions
                  </Text>
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              { marginBottom: 20 },
              !canProceed && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed}
          >
            <Text style={styles.nextText}>Try It On Now</Text>
            <Icons name="auto-awesome" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
          </TouchableOpacity>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Ready to Generate?</Text>
            <Text style={styles.infoText}>Your virtual try-on will be generated using the images you provided. This process may take a few seconds.</Text>
          </View>

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
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>Step 1: Select or Upload Garment Image</Text>
              <Text style={styles.stepDesc}>Choose an existing garment or upload a photo of the item you want to try on.</Text>
              {/* <Text style={styles.sampleLabel}>Example Image</Text> */}
              <Image
                source={require('../../assets/images/grment.png')}
                style={styles.fullSampleImage}
                resizeMode="cover"
              />

              <Text style={styles.stepTitle}>Step 2: Upload Your Image</Text>
              <Text style={styles.stepDesc}>
                • Stand straight{'\n'}
                • Full body visible with a plain background{'\n'}
                • Keep hands straight down by your sides{'\n'}
                • Avoid selfies (have someone take it or use a timer)
              </Text>

              {/* <Text style={styles.sampleLabel}>Example Image</Text> */}
              <Image
                source={require('../../assets/images/output.jpeg')}
                style={styles.fullSampleImage}
                resizeMode="cover"
              />
              <Text style={styles.imageCaption}>Good full-body photo</Text>

              <Text style={styles.stepTitle}>Step 3: Next</Text>
              <Text style={styles.stepDesc}>Click next to proceed to the generation settings.</Text>

              <Text style={styles.stepTitle}>Step 4: Select Category</Text>
              <Text style={styles.stepDesc}>Choose the correct category for your item. for e.g. Kids / Mens / Womens</Text>

              <Text style={styles.stepTitle}>Step 5: Select Size and Fits</Text>
              <Text style={styles.stepDesc}>Pick your preferred sizing and fit options, then click generate.</Text>

              <Text style={styles.sampleLabel}>Successfully Generated!</Text>
              <Image
                source={require('../../assets/images/boy.png')}
                style={styles.fullSampleImage}
                resizeMode="cover"
              />
              <Text style={styles.imageCaption}>Your virtual try-on result</Text>

              <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity style={styles.gotItButton} onPress={() => setShowInstructions(false)}>
              <Text style={styles.gotItText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Your original styles remain exactly the same below...
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingBottom: 300 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignContent: 'center',
    alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8E8',
  },
  logo: { fontSize: 24, fontWeight: '800', fontFamily: 'serif', fontStyle: 'italic', color: '#111111', height: 'auto', letterSpacing: -0.5 },
  section: { paddingHorizontal: 20, paddingVertical: 24, backgroundColor: '#FFFFFF', marginHorizontal: 12, marginVertical: 8, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#111111', fontWeight: '700' },
  sectionSubtext: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#AAAAAA' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  previewContainer: { flex: 1 },
  previewLabelSide: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#111111', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  previewImageSide: { width: '100%', height: 220, borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: '#F7F7F7' },
  imageWrapper: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  removeIconButtonSmall: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  smallUploadPlaceholder: { width: '100%', height: 220, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E8E8', borderStyle: 'dashed', backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
  smallUploadText: { marginTop: 8, fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#111111', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  secondaryBtn: { backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E8E8E8' },
  actionBtnText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#111111', fontWeight: '600' },
  infoSection: { backgroundColor: '#F9F9F9', borderRadius: 12, borderWidth: 0.8, borderColor: '#E8E8E8', paddingHorizontal: 18, paddingVertical: 20, marginTop: 0, marginBottom: 20 },
  infoTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#111111', marginBottom: 10, fontWeight: '600' },
  infoText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#666666', lineHeight: 22 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  checkbox: { paddingTop: 1 },
  checkboxText: { flex: 1, fontSize: 13, color: '#444444', fontFamily: 'Poppins-Regular', lineHeight: 19 },
  linkText: { color: '#111111', fontFamily: 'Poppins-SemiBold', textDecorationLine: 'underline' },
  nextButton: { backgroundColor: '#111111', paddingVertical: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: '#111111', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  nextButtonDisabled: { backgroundColor: '#DCDCDC' },
  nextText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Poppins-SemiBold', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.9, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#111111', fontWeight: '700' },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16 },
  modalScrollContent: { paddingBottom: 100 },
  stepTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#111111', marginTop: 20, fontWeight: '700' },
  stepDesc: { fontSize: 14, color: '#666666', marginTop: 8, lineHeight: 24, fontFamily: 'Poppins-Regular' },
  sampleLabel: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#111111', textAlign: 'center', marginVertical: 24, fontWeight: '700' },
  fullSampleImage: { width: '100%', height: 480, marginVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: '#F5F5F5' },
  imageCaption: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', marginTop: 4, fontFamily: 'Poppins-Regular' },
  gotItButton: { backgroundColor: '#000', paddingVertical: 16, marginHorizontal: 20, marginBottom: 20, borderRadius: 10, alignItems: 'center', shadowColor: '#f8ac1b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  gotItText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins-SemiBold', fontWeight: '700' },
});