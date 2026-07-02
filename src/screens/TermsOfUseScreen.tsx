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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
  <Text style={styles.lastUpdated}>Last updated: July 3, 2026</Text>

  <Text style={styles.paragraph}>
    Welcome to FeelVie! By using our app, you agree to these Terms and Conditions. Please read them carefully before using our services.
  </Text>

  <Text style={styles.sectionTitle}>1. About FeelVie</Text>
  <Text style={styles.paragraph}>
    FeelVie is an AI-powered virtual try-on application that allows users to visualize clothing on themselves using images and artificial intelligence.
  </Text>

  <Text style={styles.sectionTitle}>2. Your Account</Text>
  <Text style={styles.paragraph}>
    • Provide accurate information when creating your account.{"\n"}
    • Keep your account credentials secure.{"\n"}
    • You are responsible for all activity under your account.
  </Text>

  <Text style={styles.sectionTitle}>3. Using the App</Text>
  <Text style={styles.paragraph}>
    You agree to use FeelVie only for lawful purposes. Do not misuse the app, interfere with its operation, or attempt to access features you are not authorized to use.
  </Text>

  <Text style={styles.sectionTitle}>4. Uploaded Images</Text>
  <Text style={styles.paragraph}>
    You are responsible for the images you upload. Please upload only images that you own or have permission to use. Do not upload illegal, offensive, or copyrighted content without authorization.
  </Text>

  <Text style={styles.sectionTitle}>5. AI-Generated Results</Text>
  <Text style={styles.paragraph}>
    The virtual try-on results are generated using artificial intelligence and are intended for visualization purposes only. Results may vary and may not perfectly represent the final appearance of a product.
  </Text>

  <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
  <Text style={styles.paragraph}>
    The FeelVie app, its design, logo, and technology are owned by FeelVie. You may not copy, modify, or distribute any part of the app without permission.
  </Text>

  <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
  <Text style={styles.paragraph}>
    FeelVie is provided on an "as is" basis. We do our best to provide a reliable service but cannot guarantee uninterrupted or error-free operation.
  </Text>

  <Text style={styles.sectionTitle}>8. Changes to These Terms</Text>
  <Text style={styles.paragraph}>
    We may update these Terms from time to time. Continued use of the app after changes means you accept the updated Terms.
  </Text>

  <Text style={styles.sectionTitle}>9. Contact Us</Text>
  <Text style={styles.paragraph}>
    If you have any questions about these Terms, please contact us at:
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