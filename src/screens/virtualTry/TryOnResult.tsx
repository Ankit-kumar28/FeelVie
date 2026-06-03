// src/screens/TryOnResult.tsx
import React, { useRef, useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import ViewShot, { captureRef } from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const normalizeImageUri = (value?: string) => {
  if (!value) return '';
  if (value.startsWith('http') || value.startsWith('file') || value.startsWith('data:')) {
    return value;
  }
  return `data:image/png;base64,${value.replace(/^data:image\/\w+;base64,/, '')}`;
};

export default function TryOnResult({ route, navigation }) {
  console.debug('[TryOnResult] Screen mounted');
  const insets = useSafeAreaInsets();

  const { resultBase64, isUrl, category, timestamp, metadata } = route.params ?? {};
  console.debug('[TryOnResult] Received result:', isUrl ? 'URL' : 'Base64 length ' + (resultBase64?.length || 'missing'));
  
  const resultImageUri = isUrl ? resultBase64 : normalizeImageUri(resultBase64);
  const saveShotRef = useRef<ViewShot | null>(null);
  const shareShotRef = useRef<ViewShot | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shapeStyle, setShapeStyle] = useState('rounded'); // 'rounded', 'square', 'circle'
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(3 / 4);
  const [showLowCreditModal, setShowLowCreditModal] = useState(false);
  const [currentCredit, setCurrentCredit] = useState<string>('0');
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [isPromptingForSub, setIsPromptingForSub] = useState(false);

  useEffect(() => {
    checkWalletBalance();
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`https://api.feelvie.com/api/wallet/subscriptions/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Assuming subscription data is an array as per user prompt
        const active = Array.isArray(data) && data.some(s => s.status === 'active');
        setHasActiveSub(active);
      }
    } catch (error) {
      console.error('[TryOnResult] Failed to check subscription:', error);
    }
  };

  const checkWalletBalance = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`https://api.feelvie.com/api/wallet/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentCredit(data.credit_balance || '0');
        const creditBalance = parseFloat(data.credit_balance || '0');
        if (creditBalance < 5) {
          setShowLowCreditModal(true);
        }
      }
    } catch (error) {
      console.error('[TryOnResult] Failed to check wallet balance:', error);
    }
  };

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
              {!hasActiveSub && (
                <View style={styles.watermarkWrapper}>
                  <Image
                    source={require('../../assets/images/watermark.png')}
                    style={styles.watermarkInner}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.watermarkCloseBtn}
                    onPress={() => {
                      setIsPromptingForSub(true);
                      setShowLowCreditModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icons name="close" size={10} color="#111111" />
                  </TouchableOpacity>
                </View>
              )}
              {/* <Image
                source={require('../../assets/images/bottom.png')}
                style={styles.bottomBanner}
                resizeMode="contain"
              /> */}

              {/* <Image
                source={require('../../assets/images/qr.png')}
                style={styles.orLogo}
                resizeMode="contain"
              /> */}
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
              {!hasActiveSub && (
                <Image
                  source={require('../../assets/images/watermark.png')}
                  style={styles.watermark}
                  resizeMode="contain"
                />
              )}
              {/* <Image
                source={require('../../assets/images/bottom.png')}
                style={styles.bottomBanner}
                resizeMode="contain"
              /> */}

              <Image
                source={require('../../assets/images/qr.png')}
                style={styles.orLogo}
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
              {/* <Image
                source={require('../../assets/images/bottom.png')}
                style={styles.bottomBanner}
                resizeMode="contain"
              /> */}

              <Image
                source={require('../../assets/images/qr.png')}
                style={styles.orLogo}
                resizeMode="contain"
              />
            </ViewShot>
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

      {/* Low Credit Modal */}
      <Modal
        visible={showLowCreditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLowCreditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={() => setShowLowCreditModal(false)}
            >
              <Icons name="close" size={24} color="#111111" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Icon name={isPromptingForSub ? "star-outline" : "wallet-outline"} size={40} color="#111111" />
            </View>
            <Text style={styles.modalTitle}>{isPromptingForSub ? "Premium Plan" : "Low Credit"}</Text>
            {!isPromptingForSub && <Text style={styles.creditLeftText}>Remaining Credit: {currentCredit}</Text>}
            <Text style={styles.modalMessage}>
              {isPromptingForSub 
                ? "Get an active subscription plan to remove watermarks and unlock unlimited virtual try-ons!"
                : "Your credit balance is low. Please purchase credits to try on more outfits!"}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowLowCreditModal(false);
                navigation.navigate('WalletScreen');
              }}
            >
              <Text style={styles.modalButtonText}>{isPromptingForSub ? "Get a Plan" : "Top Up Now"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
        borderRadius: 12,
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
    // borderRadius: 12,
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
  bottomBanner: {
    position: 'absolute',
    top: "100%",
    transform: [{ translateY: "-100%" }],
    width: '100%',
    height : 60,
    objectFit: "fill", 
    backgroundColor : "#787878a8",
  },
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
    // transform: [{ translateY: "-30%" }],
    right: 0,
    width: 60,
    height: 60,
    opacity: 0.95,
    borderTopLeftRadius:6,
  },

  /* Watermark Styles */
  watermarkWrapper: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    borderWidth: 1.5,
    borderColor: '#111111',
    borderStyle: 'dotted',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  watermarkInner: {
    width: 70,
    height: 40,
    opacity: 0.6,
  },
  watermarkCloseBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
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

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  closeIconButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
    fontFamily: 'serif',
  },
  creditLeftText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8ac1b',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: 'Poppins-Regular',
  },
  modalButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
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