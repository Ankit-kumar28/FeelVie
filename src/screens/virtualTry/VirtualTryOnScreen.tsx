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

const { width,height } = Dimensions.get('window');

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
      console.debug('[Screen 1] userImage:', user ? 'found' : 'not found');
      console.debug('[Screen 1] garmentImage:', garment ? 'found' : 'not found');

      if (user) setUserImage(user);
      if (garment) setGarmentImage(garment);
    } catch (err) {
      console.error('[Screen 1] Failed to load images:', err);
    }
  };

  const pickImage = (setter, key, type) => {
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

  const removeImage = async (key, setter, type) => {
    console.debug(`[Screen 1] Removing ${type}`);
    setter(null);
    try {
      await AsyncStorage.removeItem(key);
      console.debug(`[Screen 1] ${type} removed from storage`);
      Toast.show({ type: 'info', text1: `${type} removed` });
    } catch (err) {
      console.error(`[Screen 1] Failed to remove ${type}:`, err);
    }
  };

  const toggleCategory = (value) => {
    console.debug(`[Screen 1] Type tapped: ${value} (current: ${selectedCategory})`);
    if (selectedCategory === value) {
      setSelectedCategory(null);
      console.debug('[Screen 1] Type deselected');
    } else {
      setSelectedCategory(value);
      console.debug('[Screen 1] Type selected');
    }
  };

  // Callback function to clear images (called from Screen 2 after success)
  const clearImages = async () => {
    console.debug('[Screen 1] clearImages called from Screen 2 after success');
    setUserImage(null);
    setGarmentImage(null);
    try {
      await AsyncStorage.multiRemove([USER_IMAGE_KEY, GARMENT_IMAGE_KEY]);
      console.debug('[Screen 1] Both images cleared from state and AsyncStorage');
    } catch (err) {
      console.error('[Screen 1] Failed to clear images:', err);
    }
  };

  const handleNext = () => {
    console.debug('[Screen 1] Next button pressed');
    if (!userImage || !garmentImage) {
      Toast.show({ type: 'error', text1: 'Please upload both images' });
      return;
    }
    if (!selectedCategory) {
      Toast.show({ type: 'error', text1: 'Please select a type' });
      return;
    }
    console.debug('[Screen 1] All required → navigating to details with clear callback');
    navigation.navigate('VirtualTryOnDetails', {
      userImage,
      garmentImage,
      selectedCategory,
      onSuccess: clearImages, // Pass the clear function
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
          <Text style={styles.typeTitle}>Select Type</Text>

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
        <TouchableOpacity
          style={styles.instructionBtn}
          onPress={() => setShowInstructions(true)}
        >
          <Icon name="information" size={20} color="#B03385" />
          <Text style={styles.instructionText}>Instructions</Text>
        </TouchableOpacity>

      
        {/* Upload Garment */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadTitle}>Upload Your Garment </Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}>
            {garmentImage ? (
              <Image source={{ uri: garmentImage }} style={styles.uploadImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="tshirt-crew-outline" size={48} color="#B03385" />
                <Text style={styles.placeholderText}>Tap to upload</Text>
              </View>
            )}


          </TouchableOpacity>

          {garmentImage && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={() => removeImage(GARMENT_IMAGE_KEY, setGarmentImage, 'Garment')}
              >
                <Text style={styles.actionText}>Remove</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.changeBtn]}
                onPress={() => pickImage(setGarmentImage, GARMENT_IMAGE_KEY, 'Garment')}
              >
                <Text style={styles.actionText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>


          {/* Upload Your Photo */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadTitle}>Upload Your Photo </Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setUserImage, USER_IMAGE_KEY, 'User Photo')}>
            {userImage ? (
              <Image source={{ uri: userImage }} style={styles.uploadImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="account-plus-outline" size={48} color="#B03385" />
                <Text style={styles.placeholderText}>Tap to upload</Text>
              </View>
            )}
          </TouchableOpacity>

          {userImage && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={() => removeImage(USER_IMAGE_KEY, setUserImage, 'Photo')}
              >
                <Text style={styles.actionText}>Remove</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.changeBtn]}
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
          <Icon name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>

      {/* Instructions Modal */}
      <Modal visible={showInstructions} animationType="slide" transparent onRequestClose={() => setShowInstructions(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to Use Virtual Try-On</Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.stepTitle}>Step 1: Select Type</Text>
              <Text style={styles.stepDesc}>Choose from Tops, Bottoms, or One-Pieces using the buttons at the top.</Text>

              <Text style={styles.stepTitle}>Step 2: Upload Your Image</Text>
              <Text style={styles.stepDesc}>
                • Stand straight, face the camera{'\n'}
                • Full body visible (head to feet){'\n'}
                • Plain background{'\n'}
                • Good lighting{'\n'}
                • No group or mirror selfies
              </Text>

              <Text style={styles.sampleLabel}>Top Images Examples</Text>

              <Image
                source={require('../../assets/images/instruct1.jpg')}
                style={styles.fullSampleImage}
                resizeMode="contain"
              />
              <Text style={styles.imageCaption}>Sample: Good full-body photo</Text>

              <Image
                source={require('../../assets/images/instruct2.jpg')}
                style={styles.fullSampleImage}
                resizeMode="contain"
              />
              <Text style={styles.imageCaption}>Sample: Good garment photo</Text>

              <Text style={styles.stepTitle}>Step 3: Upload Garment</Text>
              <Text style={styles.stepDesc}>
                • Front view{'\n'}
                • Plain background preferred{'\n'}
                • Full garment visible{'\n'}
                • High quality{'\n'}
                • One garment per photo
              </Text>

              <Text style={styles.stepTitle}>Step 4: Select Details</Text>
              <Text style={styles.stepDesc}>On next page select generation category, garment size, body size.</Text>

              <Text style={styles.stepTitle}>Step 5: Generate</Text>
              <Text style={styles.stepDesc}>Click Generate on next page to see result.</Text>
              
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 140 },

  header: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#B03385' },

  typeSection: { paddingHorizontal: 20, paddingVertical: 16 },
  typeTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12, textAlign: 'left' },
  typeBox: {
    flexDirection: 'row',
    backgroundColor: '#f9f9ff',
    borderWidth: 1,
    borderColor: '#d0c0ff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#d0c0ff',
  },
  typeOptionActive: { backgroundColor: '#B03385' },
  typeOptionText: { fontSize: 15, fontWeight: '600', color: '#333' },
  typeOptionTextActive: { color: '#fff' },

  instructionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  instructionText: { color: '#B03385', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  uploadSection: { paddingHorizontal: 20, marginBottom: 24 },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  uploadBox: {
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d0c0ff',
    borderStyle: 'dashed',
    backgroundColor: '#fafaff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 12, color: '#666', fontSize: 15 },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  removeBtn: { backgroundColor: '#ef4444' },
  changeBtn: { backgroundColor: '#B03385' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 100,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nextButton: {
    backgroundColor: '#B03385',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#ccc' },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modalContent: { 
    backgroundColor: '#fff', 
    marginHorizontal: 20, 
    marginVertical: 40, 
    borderRadius: 16, 
    maxHeight: height * 0.85,
    overflow: 'hidden' 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#B03385' },
  modalScroll: { paddingHorizontal: 20, paddingTop: 10 },
  modalScrollContent: { paddingBottom: 100 },
  stepTitle: { fontSize: 17, fontWeight: '700', marginTop: 24, color: '#333' },
  stepDesc: { fontSize: 15, color: '#555', marginTop: 8, lineHeight: 24 },
  sampleLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B03385',
    textAlign: 'center',
    marginVertical: 20,
  },
  fullSampleImage: {
    width: '100%',
    height: 520,
    marginVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#ffffff',
  },
  imageCaption: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: -8, marginBottom: 24 },
  gotItButton: { backgroundColor: '#B03385', paddingVertical: 16, margin: 20, borderRadius: 12, alignItems: 'center' },
  gotItText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});