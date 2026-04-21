// src/screens/TryOnResult.tsx
import React, { useRef, useState } from 'react';
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
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import ViewShot, { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const normalizeImageUri = (value?: string) => {
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  return `data:image/png;base64,${value.replace(/^data:image\/\w+;base64,/, '')}`;
};

export default function TryOnResult({ route, navigation }) {
  console.debug('[TryOnResult] Screen mounted');
  const insets = useSafeAreaInsets();

  const { resultBase64, category, timestamp, metadata } = route.params ?? {};
  console.debug('[TryOnResult] Received resultBase64 length:', resultBase64?.length || 'missing');
  const resultImageUri = normalizeImageUri(resultBase64);
  const saveShotRef = useRef<ViewShot | null>(null);
  const shareShotRef = useRef<ViewShot | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shapeStyle, setShapeStyle] = useState('rounded'); // 'rounded', 'square', 'circle'
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(3 / 4);

  const captureResultImage = async (withQr: boolean) => {
    const targetRef = withQr ? shareShotRef : saveShotRef;
    if (!targetRef.current) {
      throw new Error('Result image is not ready yet');
    }

    return await captureRef(targetRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  };

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
    if (!resultImageUri) {
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

      const capturedUri = await captureResultImage(false);
      await CameraRoll.saveAsset(capturedUri, { type: 'photo' });

      Alert.alert('Success', 'Image saved to your Photos / Gallery!');
    } catch (error) {
      console.error('[TryOnResult] Save failed:', error);
      Alert.alert('Save Failed', error.message || 'Could not save the image.');
    } finally {
      setIsSaving(false);
    }
  };

  const shareImage = async () => {
    if (!resultImageUri) {
      Alert.alert('Error', 'No image to share');
      return;
    }

    setIsSharing(true);

    try {
      const capturedUri = await captureResultImage(true);
      await Share.open({
        url: capturedUri,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error) {
      console.error('[TryOnResult] Share failed:', error);
      Alert.alert('Share Failed', error.message || 'Could not share the image.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icons name="arrow-back" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Try-On Result</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Your Look {" "}
            <Text style={styles.subtitle}>is Perfect!</Text>
          </Text>
        </View>

        {(category || timestamp || metadata) && (
          <View style={styles.resultMetaCard}>
            {category ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>{String(category)}</Text>
              </View>
            ) : null}

            {timestamp ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Generated</Text>
                <Text style={styles.metaValue}>{new Date(timestamp).toLocaleString()}</Text>
              </View>
            ) : null}

            {metadata ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Source</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  History
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Result Image Container */}
        {resultImageUri ? (
          <View style={styles.imageWrapper}>
            <View
              style={[styles.imageContainer, { aspectRatio: imageAspectRatio }, getShapeStyle(shapeStyle)]}
            >
              <Image
                source={{ uri: resultImageUri }}
                style={[styles.resultImage, getShapeStyle(shapeStyle)]}
                resizeMode="contain"
                onLoad={(event) => {
                  const { width, height } = event.nativeEvent.source;
                  if (width && height) {
                    setImageAspectRatio(width / height);
                  }
                }}
              />
              <Image
                source={require('../../assets/images/watermark.png')}
                style={styles.watermark}
                resizeMode="contain"
              />
            </View>

            <ViewShot
              ref={saveShotRef}
              style={[styles.exportShot, { aspectRatio: imageAspectRatio }, getShapeStyle(shapeStyle)]}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
              collapsable={false}
            >
              <Image
                source={{ uri: resultImageUri }}
                style={[styles.resultImage, getShapeStyle(shapeStyle)]}
                resizeMode="contain"
              />
              <Image
                source={require('../../assets/images/watermark.png')}
                style={styles.watermark}
                resizeMode="contain"
              />
            </ViewShot>

            <ViewShot
              ref={shareShotRef}
              style={[styles.exportShot, styles.shareExportShot, { aspectRatio: imageAspectRatio }, getShapeStyle(shapeStyle)]}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
              collapsable={false}
            >
              <Image
                source={{ uri: resultImageUri }}
                style={[styles.resultImage, getShapeStyle(shapeStyle)]}
                resizeMode="contain"
              />
              <Image
                source={require('../../assets/images/watermark.png')}
                style={styles.watermark}
                resizeMode="contain"
              />
              <Image
                source={require('../../assets/images/qr.png')}
                style={styles.orLogo}
                resizeMode="contain"
              />
            </ViewShot>

            {/* Shape Options
            <View style={styles.shapeOptions}>
              <TouchableOpacity
                style={[styles.shapeBtn, shapeStyle === 'rounded' && styles.shapeBtnActive]}
                onPress={() => setShapeStyle('rounded')}
              >
                <Icon name="rounded-square" size={24} color={shapeStyle === 'rounded' ? '#f8ac1b' : '#AAAAAA'} />
                <Text style={[styles.shapeBtnText, shapeStyle === 'rounded' && styles.shapeBtnTextActive]}>
                  Rounded
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shapeBtn, shapeStyle === 'square' && styles.shapeBtnActive]}
                onPress={() => setShapeStyle('square')}
              >
                <Icon name="square" size={24} color={shapeStyle === 'square' ? '#f8ac1b' : '#AAAAAA'} />
                <Text style={[styles.shapeBtnText, shapeStyle === 'square' && styles.shapeBtnTextActive]}>
                  Square
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shapeBtn, shapeStyle === 'circle' && styles.shapeBtnActive]}
                onPress={() => setShapeStyle('circle')}
              >
                <Icon name="circle" size={24} color={shapeStyle === 'circle' ? '#f8ac1b' : '#AAAAAA'} />
                <Text style={[styles.shapeBtnText, shapeStyle === 'circle' && styles.shapeBtnTextActive]}>
                  Circle
                </Text>
              </TouchableOpacity>
            </View> */}
          </View>
        ) : (
          <Text style={styles.noResultText}>No result available</Text>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.downloadButton, isSaving && styles.downloadButtonDisabled]}
            onPress={saveToGallery}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="download" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.downloadText}>Save to Gallery</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            onPress={shareImage}
            disabled={isSharing}
            activeOpacity={0.8}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <>
                <Icon name="share-variant" size={22} color="#111111" style={{ marginRight: 10 }} />
                <Text style={styles.shareText}>Share Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>


        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getShapeStyle(shape) {
  switch (shape) {
    case 'circle':
      return {
        borderRadius: 1000,
        overflow: 'hidden',
      };
    case 'square':
      return {
        borderRadius: 0,
        overflow: 'hidden',
      };
    case 'rounded':
    default:
      return {
        borderRadius: 20,
        overflow: 'hidden',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  /* Title Section */
  titleSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#111111',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#f8ac1b',
    letterSpacing: -0.5,
    marginTop: 4,
  },

  /* Image Wrapper */
  imageWrapper: {
    marginBottom: 28,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  exportShot: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: '100%',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  shareExportShot: {
    top: -12000,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },

  /* Result Meta Card */
  resultMetaCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: '#777777',
    fontFamily: 'Poppins-Regular',
  },
  metaValue: {
    fontSize: 13,
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
    flexShrink: 1,
    textAlign: 'right',
  },

  /* Watermark */
  watermark: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    width: 80,
    height: 50,
    opacity: 0.5,
  },
  orLogo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 80,
    height: 80,
    opacity: 0.95,
  },

  /* Shape Options */
  shapeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 0,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 24,
  },
  shapeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  shapeBtnActive: {
    backgroundColor: '#FFF8E7',
    borderColor: '#f8ac1b',
  },
  shapeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
    marginTop: 6,
    fontFamily: 'Poppins-SemiBold',
  },
  shapeBtnTextActive: {
    color: '#f8ac1b',
    fontWeight: '700',
  },

  /* No Result Text */
  noResultText: {
    fontSize: 16,
    color: '#AAAAAA',
    marginVertical: 60,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },

  /* Button Container */
  buttonContainer: {
    marginBottom: 12,
    gap: 12,
  },
  downloadButton: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  downloadButtonDisabled: {
    backgroundColor: '#DCDCDC',
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
  },
  shareButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  shareButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  shareText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
  },

  /* Secondary Button */
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  secondaryButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
  },
});