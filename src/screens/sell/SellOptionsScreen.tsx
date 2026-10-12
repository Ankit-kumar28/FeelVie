import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenHeader from '../../components/ScreenHeader';

interface Option {
  route: string;
  icon: string;
  title: string;
  subtitle: string;
}

const OPTIONS: Option[] = [
  {
    route: 'SellProduct',
    icon: 'cash-multiple',
    title: 'Sell Your Dress',
    subtitle: 'List it once and earn as soon as it sells',
  },
  {
    route: 'RentProduct',
    icon: 'hanger',
    title: 'Rent Your Dress',
    subtitle: 'Keep the dress, earn from it every day',
  },
];

export default function SellOptionsScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScreenHeader
        title="Start Earning"
        right={
          <TouchableOpacity onPress={() => navigation.navigate('MyListings')}>
            <Text style={styles.headerLink}>My Listings</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Turn your wardrobe into income</Text>
        <Text style={styles.subHeading}>Choose how you want to list your outfit</Text>

        {OPTIONS.map(option => (
          <TouchableOpacity
            key={option.route}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(option.route)}
          >
            <View style={styles.iconContainer}>
              <Icon name={option.icon} size={24} color="#FFFFFF" />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardSub}>{option.subtitle}</Text>
            </View>

            <Icon name="chevron-right" size={22} color="#AAAAAA" />
          </TouchableOpacity>
        ))}

        <View style={styles.noteBox}>
          <Icon name="information-outline" size={18} color="#111111" />
          <Text style={styles.noteText}>
            Listings are reviewed before they appear in the marketplace. You can track
            their status any time under My Listings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerLink: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#f8ac1b',
  },
  container: {
    padding: 20,
    paddingTop: 28,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '800',
    color: '#111111',
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 14,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#111111',
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 3,
    color: '#666666',
  },
  noteBox: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFF6E3',
    borderWidth: 1,
    borderColor: '#F6DCA6',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#444444',
    lineHeight: 18,
  },
});
