import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, TouchableOpacity, View, StatusBar,Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export default function AboutUsScreen() {
  const navigation = useNavigation();
  return (
      <SafeAreaView style={[styles.container, { paddingBottom: 65 }]} >
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>About Us</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.paragraph}>
          FeelVie is India's fastest growing platform for buying, selling, and renting fashion products.
          We aim to make fashion accessible, sustainable, and affordable for everyone.
        </Text>
        <Text style={styles.paragraph}>
          Founded in 2024, our mission is to connect buyers and sellers in a trusted environment with secure payments and fast support.
        </Text>
        {/* Add more paragraphs, mission, vision, team, etc. */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  title: { fontSize: 22, fontWeight: '700' },
  content: { padding: 20 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#444', marginBottom: 16 },
});