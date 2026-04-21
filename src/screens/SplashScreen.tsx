// src/screens/SplashScreen.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  Animated,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  // ... other screens
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { token, isLoading } = useAuth();

  // Fade animation for logo + text
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto navigate after delay
    const timer = setTimeout(() => {
      // Check if user is logged in
      if (token) {
        // User is logged in → navigate to MainTabs
        navigation.replace('MainTabs');
      } else {
        // User is NOT logged in → navigate to Onboarding (Get Started)
        navigation.replace('Onboarding');
      }
    }, 2800); // 2.8 seconds

    return () => clearTimeout(timer);
  }, [navigation, token]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#f5f5f7" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/feelvie-splash.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* <Text style={styles.appName}>FeelVie</Text> */}

        {/* <Text style={styles.tagline}>Beauty. Reimagined.</Text> */}
      </Animated.View>

      {/* Optional: small version / copyright at bottom */}
      <Text style={styles.footer}>© 2026 FeelVie</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: SCREEN_WIDTH * 0.90,     
    height: SCREEN_WIDTH * 0.90,
  },
  appName: {
    fontSize: 54,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.92,
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    color: '#000',
    fontSize: 13,
    opacity: 0.6,
    fontWeight: '400',
  },
});