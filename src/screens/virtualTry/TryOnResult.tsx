// src/screens/TryOnResult.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export default function TryOnResult({ route, navigation }) {
  console.debug('[TryOnResult] Screen mounted');

  const { resultBase64 } = route.params;

  console.debug('[TryOnResult] Received resultBase64 length:', resultBase64?.length || 'missing');

  const [isSaving, setIsSaving] = useState(false);

  const getSavePermissionStatus = async () => {
    if (Platform.OS === 'ios') return RESULTS.GRANTED;
    const permission =
      Platform.Version >= 33
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
    return await check(permission);
  };

  const requestSavePermission = async () => {
    if (Platform.OS === 'ios') return true;
    const permission =
      Platform.Version >= 33
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
    const result = await request(permission);
    return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
  };

  const saveToGallery = async () => {
    if (!resultBase64) {
      Alert.alert('Error', 'No image to save');
      return;
    }

    setIsSaving(true);

    try {
      const status = await getSavePermissionStatus();
      if (status !== RESULTS.GRANTED && status !== RESULTS.LIMITED) {
        const granted = await requestSavePermission();
        if (!granted) {
          Alert.alert('Permission Required', 'Please allow access to save images.', [{ text: 'OK' }]);
          return;
        }
      }

      const uri = `data:image/jpeg;base64,${resultBase64}`;
      await CameraRoll.saveAsset(uri, { type: 'photo' });

      Alert.alert('Success', 'Image saved to your Photos / Gallery!');
    } catch (error) {
      console.error('[TryOnResult] Save failed:', error);
      Alert.alert('Save Failed', error.message || 'Could not save the image.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}> Try-On Result</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Virtual Try-On</Text>

        {resultBase64 ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: `data:image/png;base64,${resultBase64}` }}
              style={styles.resultImage}
              resizeMode="contain"
            />

            {/* Improved professional Download button */}
            {/* <TouchableOpacity
              style={[
                styles.downloadButton,
                isSaving && styles.downloadButtonLoading,
              ]}
              onPress={saveToGallery}
              disabled={isSaving}
              activeOpacity={0.82}
              accessibilityLabel="Save try-on image to gallery"
              accessibilityHint="Downloads the generated image to your device photos"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="download-circle" size={28} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.downloadText}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity> */}
          </View>
        ) : (
          <Text style={styles.noResultText}>No result available</Text>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'TryOn' })}
        >
          <Text style={styles.backText}>Try Another Outfit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 46,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B03385',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#B03385',
    marginBottom: 24,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#fafafa',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  resultImage: {
    width: '100%',
    height: 480,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noResultText: {
    fontSize: 18,
    color: '#888',
    marginVertical: 60,
    textAlign: 'center',
  },

  // ── Professional Download Button ──
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B03385',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 50,               // pill shape
    marginTop: 28,
    width: '85%',
    shadowColor: '#B03385',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  downloadButtonLoading: {
    backgroundColor: '#c266a8',
  },
  buttonIcon: {
    marginRight: 12,
  },
  downloadText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  backButton: {
    backgroundColor: '#f0e6ff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    width: '85%',
    borderWidth: 1,
    borderColor: '#d0c0ff',
  },
  backText: {
    color: '#B03385',
    fontSize: 17,
    fontWeight: '700',
  },
});