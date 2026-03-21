// src/screens/OnboardingScreen.tsx
// ──────────────────────────────────────────────

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

type RootStackParamList = {
  Onboarding: undefined;
  Onboarding2: undefined;
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slides = [
    {
      title: 'Welcome to FeelVie',
      subtitle: 'Discover beauty like never before with virtual try-on magic',
      image: require('../assets/images/onboarding1.jpg'),
      bgColor: '#FFF5FB',
    },
    {
      title: 'Try Before You Buy',
      subtitle: 'Virtually try makeup, jewelry & accessories in real-time using your camera',
      image: require('../assets/images/onboarding2.jpg'),
      bgColor: '#FFF5FB',
    },
    {
      title: 'Shop the Looks You Love',
      subtitle: 'Explore trending products from top brands and shop instantly',
      image: require('../assets/images/onboarding3.jpg'),
      bgColor: '#FFF5FB',
    },
  ];

  // Auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentIndex < slides.length - 1) {
        scrollRef.current?.scrollTo({
          x: (currentIndex + 1) * SCREEN_WIDTH,
          animated: true,
        });
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  // Fade in text content only
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  const handleGetStarted = () => {
    navigation.replace('Onboarding2'); // or 'Login' / 'MainTabs'
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={slides[currentIndex].bgColor}
      />

      {/* Scrollable content – images + text only */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, idx) => (
          <View
            key={idx}
            style={[styles.slide, { backgroundColor: slide.bgColor }]}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={slide.image}
                style={styles.onboardingImage}
                resizeMode="contain"
              />
            </View>

            <Animated.View style={[styles.textWrapper, { opacity: fadeAnim }]}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </Animated.View>

            {/* Extra padding at bottom so content doesn't go under fixed elements */}
            <View style={{ height: SCREEN_HEIGHT * 0.28 }} />
          </View>
        ))}
      </ScrollView>

      {/* Fixed bottom container – dots + button */}
      <View style={styles.fixedBottomContainer}>
        {/* Dots – always visible, update based on currentIndex */}
        <View style={styles.dots}>
          {slides.map((_, dotIdx) => (
            <View
              key={dotIdx}
              style={[
                styles.dot,
                dotIdx === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Get Started button */}
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={handleGetStarted}
          activeOpacity={0.84}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: SCREEN_HEIGHT * 0.09,
  },
  imageWrapper: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  onboardingImage: {
    width: '100%',
    height: '100%',
  },
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F0F0F',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.92,
  },

  // ─── Fixed bottom area ───
  fixedBottomContainer: {
    position: 'absolute',
    bottom: isIOS ? 44 : 34,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: isIOS ? 10 : 0,
    zIndex: 10,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 100,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8D5E8',
    marginHorizontal: 6,
  },
  dotActive: {
    width: 14,
    backgroundColor: '#C71585',
  },
  getStartedBtn: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#C71585',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C71585',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 14,
    elevation: 10,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});