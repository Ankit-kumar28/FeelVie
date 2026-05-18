// src/screens/virtualTry/ImageScoreValidationScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import { validateUserImage, ImageScore } from '../../api/imageValidationApi';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

const SCORE_THRESHOLD = 75;

interface RouteParams {
  userImage: string;
  garmentImage: string;
  selectedCategory: string;
}

export default function ImageScoreValidationScreen({ route, navigation }) {
  const { userImage, garmentImage, selectedCategory } = route.params as RouteParams;

  const [isValidating, setIsValidating] = useState(true);
  const [scoreData, setScoreData] = useState<ImageScore | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);

  useEffect(() => {
    console.debug('[ImageValidationScreen] Mounted, starting validation...');
    validateImage();
  }, [validationAttempt]);

  const validateImage = async () => {
    setIsValidating(true);
    const result = await validateUserImage(userImage);
    setIsValidating(false);

    if (result) {
      setScoreData(result);
      console.debug('[ImageValidationScreen] Validation complete:', {
        status: result.status,
        score: result.total_score,
      });
    }
  };

  const handleRetryImage = () => {
    console.debug('[ImageValidationScreen] User chose to retry image');
    navigation.goBack();
  };

  const handleProceedToDetails = () => {
    console.debug('[ImageValidationScreen] Image accepted, proceeding to details screen');
    if (!scoreData) return;

    navigation.navigate('DetailedUserInfo', {
      userImage,
      garmentImage,
      selectedCategory,
      imageScore: scoreData,
    });
  };

  const handleRetryValidation = () => {
    console.debug('[ImageValidationScreen] User retrying validation');
    setValidationAttempt(prev => prev + 1);
  };

  const getStatusMessage = () => {
    if (!scoreData) return '';
    if (scoreData.status === 'accepted') {
      return 'Your photo is perfect for virtual try-on!';
    }
    return 'Your photo needs to meet these requirements';
  };

  if (isValidating || !scoreData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.loadingTitle}>Validating Your Photo</Text>
          <Text style={styles.loadingSubtitle}>Checking image quality...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAccepted = scoreData.status === 'accepted' && scoreData.total_score >= SCORE_THRESHOLD;

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleRetryImage} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Image Quality Check</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: userImage }} style={styles.previewImage} resizeMode="cover" />
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreLabel}>Quality Score</Text>
              <View style={styles.scoreDisplay}>
                <Text style={styles.scoreNumber}>{scoreData.total_score}</Text>
                <Text style={styles.scorePercent}>/100</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, isAccepted ? styles.statusBadgeAccepted : styles.statusBadgeRejected]}>
              <Icon
                name={isAccepted ? 'check-circle' : 'error'}
                size={28}
                color={isAccepted ? '#111111' : '#666666'}
              />
              <Text style={[styles.statusText, isAccepted ? styles.statusTextAccepted : styles.statusTextRejected]}>
                {isAccepted ? 'PASS' : 'FAIL'}
              </Text>
            </View>
          </View>

          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
        </View>

        {/* Detailed Scores */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Details</Text>

          <View style={styles.scoresList}>
            {Object.entries(scoreData.scores).map(([key, value]) => (
              <View key={key} style={styles.scoreItem}>
                <View style={styles.scoreItemLeft}>
                  <Text style={styles.scoreItemLabel}>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                  </Text>
                  <View style={styles.scoreBar}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          width: `${(value / 30) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.scoreItemValue}>{value}/30</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reasons/Feedback */}
        <View style={styles.reasonsSection}>
          <Text style={styles.reasonsTitle}>Feedback</Text>
          {scoreData.reason.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Icon name="check" size={18} color="#111111" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* Threshold Warning */}
        {!isAccepted && scoreData.total_score < SCORE_THRESHOLD && (
          <View style={styles.warningBox}>
            <Icon name="warning" size={20} color="#111111" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.warningTitle}>Below Minimum Score</Text>
              <Text style={styles.warningText}>
                Score: {scoreData.total_score}% (minimum: {SCORE_THRESHOLD}%). Please retake your photo.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomBar}>
        {isAccepted ? (
          <>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetryImage}>
              <Text style={styles.secondaryBtnText}>Retake Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleProceedToDetails}>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Icons name="arrow-forward" size={22} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetryImage}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRetryValidation}>
              <Text style={styles.primaryBtnText}>Retry Validation</Text>
              <Icon name="refresh" size={22} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
    paddingTop: 16,
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    height: 280,
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#111111',
  },
  scorePercent: {
    fontSize: 16,
    color: '#999999',
    marginLeft: 4,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusBadgeAccepted: {
    backgroundColor: '#F8F8F8',
    borderColor: '#E8E8E8',
  },
  statusBadgeRejected: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E8E8E8',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  statusTextAccepted: {
    color: '#111111',
  },
  statusTextRejected: {
    color: '#666666',
  },
  statusMessage: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    lineHeight: 20,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  scoresList: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scoreItemLeft: {
    flex: 1,
  },
  scoreItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },
  scoreBar: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#111111',
  },
  scoreItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    marginLeft: 12,
    minWidth: 45,
    textAlign: 'right',
  },
  reasonsSection: {
    marginBottom: 24,
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#333333',
    marginLeft: 12,
    flex: 1,
    fontWeight: '400',
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  secondaryBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  primaryBtn: {
    flex: 0.6,
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
