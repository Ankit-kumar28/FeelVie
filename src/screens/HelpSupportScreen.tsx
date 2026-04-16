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
      screen: 'ContactSupport',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 26 }} />
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
                <Icon name={item.icon} size={24} color="#111111" />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <Icon name="chevron-right" size={22} color="#AAAAAA" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 50, android: 40 }),
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    letterSpacing: -0.3,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },

  /* Card with Menu Items */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#e2dcdc',
    shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
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
    fontFamily: 'Poppins-Regular',
    color: '#111111',
    marginLeft: 16,
  },
});