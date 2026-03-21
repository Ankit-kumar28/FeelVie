// EditProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function EditProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={[styles.container, { paddingBottom: 65 }]} >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This screen has been split into three separate screens:</Text>
          <Text style={{marginTop: 10}}>- Personal Info</Text>
          <Text>- Address</Text>
          <Text>- Payment Info</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

  scrollContent: { padding: 16 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  helper: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '500',
  },

  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    marginBottom: 16,
  },

  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#9ca3af',
  },

  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  countryCode: {
    fontSize: 16,
    color: '#374151',
    marginRight: 12,
  },

  disabledPhone: {
    fontSize: 16,
    color: '#9ca3af',
  },

  savePersonalBtn: {
    backgroundColor: '#B03385',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },

  savePersonalText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  newAddressForm: {
    marginTop: 8,
  },

  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B03385',
    marginBottom: 12,
  },

  saveAddressBtn: {
    backgroundColor: '#B03385',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },

  saveAddressText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  disabledBtn: {
    backgroundColor: '#9ca3af',
  },

  saveBankBtn: {
    backgroundColor: '#B03385',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },

  saveBankText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});