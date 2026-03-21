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
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.lastUpdated}>Last updated: February 25, 2025</Text>

          <Text style={styles.paragraph}>
            At FeelVie, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our mobile application and website.
          </Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We may collect:{'\n'}
            • Personal identification information (name, email, phone number){'\n'}
            • Profile picture and address details{'\n'}
            • Payment information (processed securely via third-party gateways){'\n'}
            • Device information and usage data{'\n'}
            • Location data (with your permission)
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use your information to:{'\n'}
            • Provide and maintain the Service{'\n'}
            • Process transactions and deliveries{'\n'}
            • Send order updates, promotions, and support messages{'\n'}
            • Improve app features and user experience{'\n'}
            • Prevent fraud and ensure platform safety
          </Text>

          <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
          <Text style={styles.paragraph}>
            We may share your information with:{'\n'}
            • Sellers/Buyers (only necessary details for transaction){'\n'}
            • Payment processors and logistics partners{'\n'}
            • Legal authorities when required by law
          </Text>

          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal data. However, no method of transmission over the internet is 100% secure.
          </Text>

          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:{'\n'}
            • Access, update, or delete your personal information{'\n'}
            • Withdraw consent where applicable{'\n'}
            • Lodge a complaint with the relevant data protection authority
          </Text>

          <Text style={styles.sectionTitle}>6. Cookies & Tracking</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar technologies to enhance user experience, analyze usage, and show personalized content/ads.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
          </Text>

          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy, please contact us at:{'\n'}
            support@feelvie.in
          </Text>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
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