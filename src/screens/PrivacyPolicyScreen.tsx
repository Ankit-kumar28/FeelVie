// src/screens/PrivacyPolicyScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
  <Text style={styles.lastUpdated}>Last updated: July 3, 2026</Text>

  <Text style={styles.paragraph}>
    Your privacy is important to us. This Privacy Policy explains what information FeelVie collects, how we use it, and how we protect it.
  </Text>

  <Text style={styles.sectionTitle}>1. Information We Collect</Text>
  <Text style={styles.paragraph}>
    When you create an account, we may collect:
    {"\n"}• Name
    {"\n"}• Email address
    {"\n"}• Password
    {"\n"}• Phone number (optional)
    {"\n\n"}
    When you use the AI Virtual Try-On feature, we collect:
    {"\n"}• Your uploaded image(s)
    {"\n"}• Clothing image(s)
    {"\n"}• AI-generated output image(s)
  </Text>

  <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
  <Text style={styles.paragraph}>
    We use your information to:
    {"\n"}• Create and manage your account.
    {"\n"}• Generate AI Virtual Try-On results.
    {"\n"}• Improve the app and user experience.
    {"\n"}• Respond to your support requests.
  </Text>

  <Text style={styles.sectionTitle}>3. AI Processing</Text>
  <Text style={styles.paragraph}>
    To generate AI Virtual Try-On results, your uploaded image and clothing image are securely sent to our third-party AI provider, Replicate.
    {"\n\n"}
    Replicate processes these images only to generate your requested result and does not retain them after processing.
  </Text>

  <Text style={styles.sectionTitle}>4. Image Storage</Text>
  <Text style={styles.paragraph}>
    • Uploaded input images are deleted after AI processing is completed.
    {"\n"}
    • AI-generated output images are securely stored on our servers so you can access them later.
  </Text>

  <Text style={styles.sectionTitle}>5. Data Sharing</Text>
  <Text style={styles.paragraph}>
    We do not sell or rent your personal information.
    {"\n\n"}
    Your uploaded images are shared only with Replicate for AI image generation. No other personal information is shared unless required by law.
  </Text>

  <Text style={styles.sectionTitle}>6. Data Security</Text>
  <Text style={styles.paragraph}>
    We use reasonable security measures to protect your information from unauthorized access, loss, or misuse. However, no internet transmission or storage method is completely secure.
  </Text>

  <Text style={styles.sectionTitle}>7. Your Rights</Text>
  <Text style={styles.paragraph}>
    You may update your account information, request account deletion, or contact us if you have questions about your personal data.
  </Text>

  <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
  <Text style={styles.paragraph}>
    FeelVie is not intended for children under the age of 13. We do not knowingly collect personal information from children.
  </Text>

  <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
  <Text style={styles.paragraph}>
    We may update this Privacy Policy from time to time. Any changes will be reflected by updating the "Last updated" date at the top of this page.
  </Text>

  <Text style={styles.sectionTitle}>10. Contact Us</Text>
  <Text style={styles.paragraph}>
    If you have any questions about this Privacy Policy, please contact us at:
    {"\n\n"}
    support@feelvie.in
  </Text>

  <View style={{ height: 60 }} />
</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9fa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 0, android: 40 }),
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111' },

  scrollView: { flex: 1 },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  lastUpdated: {
    fontSize: 13,
    color: '#777',
    marginBottom: 20,
    fontStyle: 'italic',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginTop: 28,
    marginBottom: 8,
  },

  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
});