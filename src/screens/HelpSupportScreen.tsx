// src/screens/HelpSupportScreen.tsx
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

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  const menuItems = [
    {
      title: 'Frequently Asked Questions',
      icon: 'help-circle-outline',
      screen: 'FAQs',
    },
    {
      title: 'About Us',
      icon: 'information-outline',
      screen: 'AboutUs',
    },
    {
      title: 'Terms of Use',
      icon: 'file-outline',
      screen: 'TermsOfUse',
    },
    {
      title: 'Privacy Policy',
      icon: 'shield-lock-outline',
      screen: 'PrivacyPolicy',
    },
    {
      title: 'Contact Support',
      icon: 'email-outline',
      screen: 'ContactSupport', // ← create this screen later if needed
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Icon name={item.icon} size={26} color="#B03385" />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#c0c4cc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional quick actions / extra help */}
        {/* <View style={styles.quickHelpContainer}>
          <Text style={styles.quickHelpTitle}>Still need help?</Text>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => {
              // open chat / email / call
              console.log('Open live chat or email');
            }}
          >
            <Icon name="message-text-outline" size={20} color="#fff" />
            <Text style={styles.chatButtonText}>Chat with us</Text>
          </TouchableOpacity>
        </View> */}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 4, android: 40 }),
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },

  scrollContent: {
    // paddingHorizontal: 16,
    // paddingTop: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#ffffff',
    // borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    // marginBottom: 24,
    // shadow for iOS / android elevation
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.07,
    // shadowRadius: 8,
    // elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 16,
  },

  quickHelpContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  quickHelpTitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 12,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B03385',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});