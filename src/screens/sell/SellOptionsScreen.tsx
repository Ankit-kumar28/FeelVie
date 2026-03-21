import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SellProductScreen from '../ProductScreen';
import RentProductScreen from './RentProductScreen';

export default function SellOptionsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <Text style={styles.heading}> 🩷 Start Earning 🩷 </Text>
        <Text style={styles.subHeading}>
          Choose how you want to list your outfit
        </Text>

        {/* SELL CARD */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SellProduct' as never)}
        >
          <View style={styles.iconContainer}>
            <Icon name="cash-multiple" size={26} color="#fff" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Sell Your Used Dress</Text>
            <Text style={styles.cardSub}>
              List once and earn instantly
            </Text>
          </View>

          <Icon name="chevron-right" size={22} color="#1E3A8A" />
        </TouchableOpacity>

        {/* RENT CARD */}
        {/* <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('RentProduct' as never)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#2563EB' }]}>
            <Icon name="hanger" size={24} color="#fff" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Rent Your Dress</Text>
            <Text style={styles.cardSub}>
              Earn daily from your wardrobe
            </Text>
          </View>

          <Icon name="chevron-right" size={22} color="#1E3A8A" />
        </TouchableOpacity> */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8FF', // soft blue background
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#B03385', // deep blue
  },
  subHeading: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4B5563',
    marginBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,

    shadowColor: '#1E3A8A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B03385',// deep blue accent
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSub: {
    fontSize: 13,
    marginTop: 4,
    color: '#6B7280',
  },
});
