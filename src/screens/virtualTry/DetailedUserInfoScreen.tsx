// src/screens/virtualTry/DetailedUserInfoScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

interface DetailedUserInfoParams {
  userImage: string;
  garmentImage: string;
  selectedCategory: string;
  imageScore: any;
}

const CATEGORIES = ['Male', 'Female', 'Kids'];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function DetailedUserInfoScreen({ route, navigation }) {
  const { userImage, garmentImage, selectedCategory, imageScore } = route.params as DetailedUserInfoParams;

  const [category, setCategory] = useState<string | null>(null);
  const [bodySize, setBodySize] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [waistSize, setWaistSize] = useState('');

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const handleSkipDetails = () => {
    console.debug('[DetailedUserInfo] User chose to skip details');
    // Navigate directly to VirtualTryOnDetails with default values
    navigation.navigate('VirtualTryOnDetails', {
      userImage,
      garmentImage,
      selectedCategory,
      imageScore,
      userDetails: {
        category: 'auto',
        bodySize: 'M',
        height: 'auto',
        waistSize: 'auto',
      },
    });
  };

  const handleGeneratePhoto = () => {
    console.debug('[DetailedUserInfo] Validating form before generation');

    if (!category) {
      Toast.show({ type: 'error', text1: 'Please select a category' });
      return;
    }
    if (!bodySize) {
      Toast.show({ type: 'error', text1: 'Please select a body size' });
      return;
    }
    if (!height.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your height' });
      return;
    }
    if (!waistSize.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your waist size' });
      return;
    }

    console.debug('[DetailedUserInfo] All details provided, navigating to generation');
    navigation.navigate('VirtualTryOnDetails', {
      userImage,
      garmentImage,
      selectedCategory,
      imageScore,
      userDetails: {
        category,
        bodySize,
        height,
        waistSize,
      },
    });
  };

  const isFormComplete = category && bodySize && height.trim() && waistSize.trim();

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Details</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={styles.infoBox}>
          <Icon name="information-outline" size={24} color="#000" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Personalize Your Try-On</Text>
            <Text style={styles.infoText}>
              Provide your details for a more accurate virtual try-on experience
            </Text>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setCategoryModalVisible(true)}
          >
            <View style={styles.selectButtonContent}>
              <Icon
                name="account"
                size={20}
                color={category ? '#000' : '#999999'}
              />
              <Text
                style={[
                  styles.selectButtonText,
                  category && styles.selectButtonTextActive,
                ]}
              >
                {category || 'Select category'}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Body Size Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Body Size</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSizeModalVisible(true)}
          >
            <View style={styles.selectButtonContent}>
              <Icon
                name="human"
                size={20}
                color={bodySize ? '#000' : '#999999'}
              />
              <Text
                style={[
                  styles.selectButtonText,
                  bodySize && styles.selectButtonTextActive,
                ]}
              >
                {bodySize || 'Select size'}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Height Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Height (cm or inches)</Text>
          <View style={styles.inputContainer}>
            <Icon name="ruler" size={20} color="#999999" />
            <TextInput
              style={styles.input}
              placeholder="E.g., 170 or 5'8"
              placeholderTextColor="#CCCCCC"
              value={height}
              onChangeText={setHeight}
              keyboardType="default"
            />
          </View>
        </View>

        {/* Waist Size Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Waist Size (inches or cm)</Text>
          <View style={styles.inputContainer}>
            <Icon name="format-line-spacing" size={20} color="#999999" />
            <TextInput
              style={styles.input}
              placeholder="E.g., 32 or 81"
              placeholderTextColor="#CCCCCC"
              value={waistSize}
              onChangeText={setWaistSize}
              keyboardType="default"
            />
          </View>
        </View>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setShowSkipConfirm(true)}
        >
          <Icon name="skip-forward" size={20} color="#000" />
          <Text style={styles.skipButtonText}>Skip & Auto-Generate</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            !isFormComplete && styles.primaryBtnDisabled,
          ]}
          onPress={handleGeneratePhoto}
          disabled={!isFormComplete}
        >
          <Text style={styles.primaryBtnText}>Generate Photo</Text>
          <Icons name="auto-awesome" size={22} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color="#111111" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalOption,
                    category === cat && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryModalVisible(false);
                  }}
                >
                  <View
                    style={[
                      styles.optionCheckbox,
                      category === cat && styles.optionCheckboxActive,
                    ]}
                  >
                    {category === cat && (
                      <Icon name="check" size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.modalOptionText,
                      category === cat && styles.modalOptionTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Size Modal */}
      <Modal
        visible={sizeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSizeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Body Size</Text>
              <TouchableOpacity onPress={() => setSizeModalVisible(false)}>
                <Icon name="close" size={28} color="#111111" />
              </TouchableOpacity>
            </View>
            <View style={styles.sizeGrid}>
              {SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeOption,
                    bodySize === size && styles.sizeOptionActive,
                    { display: 'flex',    flexDirection: 'row',    alignItems: 'center',    justifyContent: 'center',    gap: 6 , height: 50, width: 60},
                  ]}
                  onPress={() => {
                    setBodySize(size);
                    setSizeModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sizeOptionText,
                      bodySize === size && styles.sizeOptionTextActive,
                      { display: 'flex',    flexDirection: 'row',    alignItems: 'center',    justifyContent: 'center',    gap: 6 },
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Skip Confirmation Modal */}
      <Modal
        visible={showSkipConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSkipConfirm(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Icon name="help-circle" size={48} color="#000" />
            <Text style={styles.confirmModalTitle}>Skip Details?</Text>
            <Text style={styles.confirmModalText}>
              Auto-generation will use default values. You can always adjust your preferences later.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowSkipConfirm(false)}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmConfirmBtn}
                onPress={() => {
                  setShowSkipConfirm(false);
                  handleSkipDetails();
                }}
              >
                <Text style={styles.confirmConfirmBtnText}>Skip</Text>
              </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 180,
  },
  infoBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '400',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 10,
  },
  selectButton: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 12,
    fontWeight: '500',
  },
  selectButtonTextActive: {
    color: '#111111',
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    marginLeft: 12,
    padding: 0,
    fontWeight: '500',
  },
  skipButton: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  secondaryBtn: {
    flex: 0.35,
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  primaryBtn: {
    flex: 0.65,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },
  modalOptions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  modalOptionActive: {
    backgroundColor: '#FFF3E0',
  },
  optionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckboxActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 12,
  },
  modalOptionTextActive: {
    color: '#111111',
    fontWeight: '600',
  },
  sizeGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  sizeOption: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  sizeOptionActive: {
    borderColor: '#000',
    backgroundColor: '#FFF8E1',

  },
  sizeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  sizeOptionTextActive: {
    color: '#000',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginTop: 16,
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  confirmConfirmBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
