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
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const USER_IMAGE_KEY = 'VIRTUAL_TRYON_USER_IMAGE';
const GARMENT_IMAGE_KEY = 'VIRTUAL_TRYON_GARMENT_IMAGE';

const categories = [
  { label: 'Tops', value: 'tops' },
  { label: 'Bottoms', value: 'bottoms' },
  { label: 'One-pieces', value: 'one-pieces' },
];

export default function VirtualTryOnScreen() {
  console.debug('[Screen 1] VirtualTryOnScreen mounted');

  const navigation = useNavigation();

  const [userImage, setUserImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    console.debug('[Screen 1] Loading stored images from AsyncStorage');
    loadStoredImages();
  }, []);

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
    if (selectedCategory === value) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(value);
    }
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Virtual Try-On</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Select Type Section */}
        <View style={styles.typeSection}>
          <Text style={styles.typeTitle}>SELECT TYPE</Text>

          <View style={styles.typeBox}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.typeOption,
                  selectedCategory === cat.value && styles.typeOptionActive,
                ]}
                onPress={() => toggleCategory(cat.value)}
              >
                <Text style={[
                  styles.typeOptionText,
                  selectedCategory === cat.value && styles.typeOptionTextActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Instructions Button */}
   <View style={styles.buttonRowContainer}>
          <TouchableOpacity
            style={styles.instructionBtn}
            onPress={() => setShowInstructions(true)}
          >
            <Icon name="information-outline" size={22} color="#111111" />
            <Text style={styles.instructionText}>Instructions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate('VirtualTryOnHistory')}
          >
            <Icon name="history" size={22} color="#111111" />
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Garment */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadTitle}>Upload Your Garment</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}>
            {garmentImage ? (
              <Image source={{ uri: garmentImage }} style={styles.uploadImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="tshirt-crew-outline" size={48} color="#AAAAAA" />
                <Text style={styles.placeholderText}>Tap to upload garment</Text>
              </View>
            )}
          </TouchableOpacity>

          {garmentImage && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeImage(GARMENT_IMAGE_KEY, setGarmentImage, 'Garment')}
              >
                <Text style={styles.actionText}>Remove</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => pickImage(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
              >
                <Text style={styles.actionText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upload Your Photo */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadTitle}>Upload Your Photo</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setUserImage, USER_IMAGE_KEY, 'User Photo')}>
            {userImage ? (
              <Image source={{ uri: userImage }} style={styles.uploadImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="account-outline" size={48} color="#AAAAAA" />
                <Text style={styles.placeholderText}>Tap to upload your photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {userImage && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeImage(USER_IMAGE_KEY, setUserImage, 'Photo')}
              >
                <Text style={styles.actionText}>Remove</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => pickImage(setUserImage, USER_IMAGE_KEY, 'User Photo')}
              >
                <Text style={styles.actionText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!userImage || !garmentImage || !selectedCategory) && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!userImage || !garmentImage || !selectedCategory}
        >
          <Text style={styles.nextText}>Next</Text>
          <Icon name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>

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
              <Text style={styles.stepDesc}>Choose from Tops, Bottoms, or One-Pieces using the buttons above.</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollContent: { 
    paddingBottom: 140 
  },

  /* Header */
  header: { 
    padding: 20, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E8E8E8' 
  },
  headerTitle: { 
    fontSize: 20, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111',
    letterSpacing: -0.2,
  },

  /* Type Selection */
  typeSection: { 
    paddingHorizontal: 20, 
    paddingVertical: 24 
  },
  typeTitle: { 
    fontSize: 13, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginBottom: 12, 
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  typeBox: {
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
  },
  typeOptionActive: { 
    backgroundColor: '#111111' 
  },
  typeOptionText: { 
    fontSize: 15, 
    fontFamily: 'Poppins-Regular', 
    color: '#111111' 
  },
  typeOptionTextActive: { 
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },

  /* Instructions */
  instructionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginVertical: 8,
    paddingVertical: 8,
  },
  instructionText: { 
    color: '#111111', 
    fontSize: 16, 
    fontFamily: 'Poppins-Regular', 
    marginLeft: 8 
  },

  /* Upload Sections */
  uploadSection: { 
    paddingHorizontal: 20, 
    marginBottom: 32 
  },
  uploadTitle: { 
    fontSize: 16, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginBottom: 12 
  },
  uploadBox: {
    height: 280,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderStyle: 'dashed',
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain' 
  },
  placeholder: { 
    alignItems: 'center' 
  },
  placeholderText: { 
    marginTop: 12, 
    color: '#AAAAAA', 
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  removeBtn: {
 flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
  },
  changeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
  },
  actionText: { 
    fontSize: 15, 
    fontFamily: 'Poppins-SemiBold',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  nextButton: {
    backgroundColor: '#111111',
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  nextButtonDisabled: { 
    backgroundColor: '#AAAAAA',
    borderColor: '#AAAAAA',
  },
  nextText: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontFamily: 'Poppins-SemiBold' 
  },

  /* Modal */
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.65)', 
    justifyContent: 'center' 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 20, 
    marginVertical: 40, 
    borderRadius: 8, 
    maxHeight: height * 0.85,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E8E8E8' 
  },
  modalTitle: { 
    fontSize: 18, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111' 
  },
  modalScroll: { 
    paddingHorizontal: 20, 
    paddingTop: 10 
  },
  modalScrollContent: { 
    paddingBottom: 100 
  },
  stepTitle: { 
    fontSize: 16, 
    fontFamily: 'Poppins-SemiBold', 
    color: '#111111', 
    marginTop: 28 
  },
  stepDesc: { 
    fontSize: 15, 
    color: '#444444', 
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
  },
  fullSampleImage: {
    width: '100%',
    height: 520,
    marginVertical: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F7F7F7',
  },
  imageCaption: { 
    fontSize: 13, 
    color: '#AAAAAA', 
    textAlign: 'center', 
    marginTop: -8, 
    marginBottom: 24,
    fontFamily: 'Poppins-Regular',
  },
  gotItButton: { 
    backgroundColor: '#111111', 
    paddingVertical: 17, 
    margin: 20, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  gotItText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontFamily: 'Poppins-SemiBold' 
  },
    /* Instructions & History Buttons */
  buttonRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 16,
    gap: 12,
  },
  instructionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  historyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  instructionText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111111',
    marginLeft: 8,
  },
  historyText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111111',
    marginLeft: 8,
  },
});