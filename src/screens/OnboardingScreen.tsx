// src/screens/OnboardingScreen.tsx
// Redesigned for clean, modern black & white e-commerce aesthetic

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
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
      lottie: require('../assets/animations/animation1.json'),
    },
    {
      title: 'Try Before You Buy',
      subtitle: 'Virtually try makeup, jewelry & accessories in real-time using your camera',
      lottie: require('../assets/animations/animation2.json'),
    },
    {
      title: 'Your fitting room, anywhere.',
      subtitle: "Look good before you buy — anytime, anywhere.",
      image: require('../assets/images/onboarding1.jpg'),
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
    }, 7000);

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
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Scrollable content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, idx) => (
          <View key={idx} style={styles.slide}>
            <View style={styles.imageWrapper}>
              {'lottie' in slide ? (
                <View style={styles.lottieWrapper}>
                  <LottieView
                    source={slide.lottie}
                    autoPlay
                    loop
                    style={styles.lottieAnimation}
                  />
                </View>
              ) : (
                <Image
                  source={slide.image}
                  style={styles.onboardingImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <Animated.View style={[styles.textWrapper, { opacity: fadeAnim }]}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </Animated.View>

            {/* Extra bottom padding */}
            <View style={{ height: SCREEN_HEIGHT * 0.26 }} />
          </View>
        ))}
      </ScrollView>

      {/* Fixed bottom container */}
      <View style={styles.fixedBottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
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

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>

        {/* Subtle skip hint */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleGetStarted}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Icon name="arrow-right" size={20} color="#AAAAAA" style={styles.skipIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: SCREEN_HEIGHT * 0.08,
    backgroundColor: '#FFFFFF',
  },
  imageWrapper: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lottieWrapper: {
    width: '100%',
    height: '100%',
    // borderWidth: 1,
    // borderColor: '#E8E8E8',
    // borderRadius: 16,
    // overflow: 'hidden',
    // backgroundColor: '#f7f7f700',
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  onboardingImage: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
  },

  // Text
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 12,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    lineHeight: 34,
    color: '#111111',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15.5,
    lineHeight: 24,
    color: '#4e4e4e',
    textAlign: 'center',
    maxWidth: '92%',
  },

  // Fixed bottom area
  fixedBottomContainer: {
    position: 'absolute',
    bottom: isIOS ? 48 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 42,
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 5,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#111111',
    borderRadius: 4,
  },

  // Primary Button - Solid Black
  getStartedBtn: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111111',
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  getStartedText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    fontSize: 17,
    letterSpacing: 0.3,
  },

  // Ghost Skip Button
  skipButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: '#908f8f',
    marginRight: 6,
  },
  skipIcon: {
    marginTop: 1,
  },
});