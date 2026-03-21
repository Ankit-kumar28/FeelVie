// src/screens/TermsOfUseScreen.tsx
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

export default function TermsOfUseScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <Text style={styles.lastUpdated}>Last updated: February 25, 2025</Text>

          <Text style={styles.paragraph}>
            Welcome to FeelVie! These Terms of Use ("Terms") govern your access to and use of the FeelVie mobile application and website (collectively, the "Service"), operated by FeelVie Private Limited.
          </Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using the Service, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you may not use our Service.
          </Text>

          <Text style={styles.sectionTitle}>2. User Accounts</Text>
          <Text style={styles.paragraph}>
            When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding your account and for any activities that occur under your account.
          </Text>

          <Text style={styles.sectionTitle}>3. Buying, Selling & Renting</Text>
          <Text style={styles.paragraph}>
            • Sellers are responsible for the accuracy of listings, quality of items, and timely delivery/rental handover.{"\n"}
            • Buyers must pay the agreed amount through the platform's secure payment system.{"\n"}
            • All transactions are subject to our cancellation and refund policies.
          </Text>

          <Text style={styles.sectionTitle}>4. Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            You agree not to: {"\n"}
            • Post counterfeit, illegal, or prohibited items{"\n"}
            • Harass, threaten, or impersonate others{"\n"}
            • Use the Service for any unlawful purpose{"\n"}
            • Attempt to interfere with the Service's functionality
          </Text>

          <Text style={styles.sectionTitle}>5. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Service and its original content (excluding user content) are owned by FeelVie and protected by copyright, trademark, and other laws.
          </Text>

          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            FeelVie is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify or replace these Terms at any time. We will provide notice of material changes by updating the "Last updated" date at the top of this page.
          </Text>

          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, please contact us at:{'\n'}
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