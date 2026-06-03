import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

type RootStackParamList = {
  Onboarding: undefined;
  Onboarding2: undefined;
  SignUp: { role: string };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const roles = [
  { id: 'boutique', label: 'Boutique Owner' },
  { id: 'customer', label: 'Customer' },
  { id: 'manufacturer', label: 'Manufacturer' },
];

export default function OnboardingScreen2() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    navigation.navigate('SignUp', { role: selectedRole });
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Onboarding');
    }
  };

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F5F7" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-back" size={26} color="#1C1C1E" />
        </TouchableOpacity>

        <View style={styles.innerContent}>
          <Text style={styles.title}>Register As</Text>
          <Text style={styles.subtitle}>
            Choose how you want to use FeelVie
          </Text>

          {roles.map(role => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.optionCard,
                selectedRole === role.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedRole(role.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedRole === role.id && styles.selectedText,
                ]}
              >
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedRole && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Icon name="arrow-forward" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Already have an account? */}
          <TouchableOpacity
            style={styles.loginContainer}
            onPress={handleLoginPress}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginHighlight}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  innerContent: {
    flex: 1,
    paddingVertical: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 10,
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 48,
    lineHeight: 24,
  },
  optionCard: {
    height: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#B03385',
    backgroundColor: '#FDF5FF',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  selectedText: {
    color: '#B03385',
  },
  continueButton: {
    marginTop: 36,
    height: 58,
    backgroundColor: '#B03385',
    borderRadius: 29,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B03385',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#D8B4D9',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  loginContainer: {
    marginTop: 32,
    alignItems: 'center',
    paddingBottom: 40,
  },
  loginText: {
    fontSize: 15,
    color: '#4B5563',
  },
  loginHighlight: {
    color: '#B03385',
    fontWeight: '700',
  },
});