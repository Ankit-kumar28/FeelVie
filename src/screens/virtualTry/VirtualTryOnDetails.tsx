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

  const { userImage, garmentImage, selectedCategory, onSuccess } = route.params;

  console.debug('[Screen 2] Received from Screen 1:', {
    userImageExists: !!userImage,
    garmentImageExists: !!garmentImage,
    selectedCategory,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    console.log("Starting generation with category:", selectedCategory);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Please login first' });
        setIsGenerating(false);
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
      console.log(err);
      Toast.show({ type: 'error', text1: 'Failed to generate try-on', text2: 'Please try again' });
    } finally {
      setIsGenerating(false);
    }
  };

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

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Ready to Generate?</Text>
          <Text style={styles.infoText}>Your virtual try-on will be generated using the selected garment type: <Text style={styles.categoryBold}>{selectedCategory}</Text></Text>
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
  categoryBold: {
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