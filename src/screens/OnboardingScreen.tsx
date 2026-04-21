// src/screens/OnboardingScreen.tsx
// Redesigned to match reference design with carousel at top and content below

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
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const isIOS = Platform.OS === 'ios';

// Responsive scaling utility
const scale = (size: number, baseWidth: number = 375) => {
  const { width } = Dimensions.get('window');
  return (width / baseWidth) * size;
};

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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      title: 'Try Before You Buy',
      subtitle: 'Instantly',
      description: 'End the uncertainty of online shopping forever',
      image: require('../assets/images/get2.png'),
      statusBarColor: '#FFFFFF',
    },
    {
      title: 'Discover Beauty',
      subtitle: 'Virtually',
      description: 'Try makeup and accessories in real-time with AR',
      image: require('../assets/images/get3.png'),
      statusBarColor: '#f9eff2',
    },
    {
      title: 'Your Fitting Room',
      subtitle: 'Anywhere',
      description: 'Look good before you buy — anytime, anywhere',
      image: require('../assets/images/get4.png'),
      statusBarColor: '#f1e7e3',
    },
  ];

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      carouselRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleCarouselScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  const handleSkip = () => {
    if (currentIndex === slides.length - 1) {
      // On last slide, navigate to Login
      navigation.replace('Login');
    } else {
      // Otherwise, go to next slide
      handleNext();
    }
  };

  const handleNext = () => {
    if (currentIndex === slides.length - 1) {
      // On last slide, navigate to Login
      navigation.replace('Login');
    } else {
      // Otherwise, go to next slide
      const nextIndex = (currentIndex + 1) % slides.length;
      carouselRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }
  };

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor={slides[currentIndex].statusBarColor} />

      {/* Carousel Container - Half Cut at Top */}
      <View style={[styles.carouselContainer, { height: SCREEN_HEIGHT * 0.65 }]}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleCarouselScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {slides.map((slide, idx) => (
            <Image
              key={idx}
              source={slide.image}
              style={[styles.carouselImage, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65 }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Pagination Dots - Positioned Over Carousel */}
        <View style={styles.dotsOverlay}>
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
      </View>

      {/* Bottom Content Section */}
      <View style={styles.bottomSection}>
        {/* Title */}
        <Text style={styles.title}>{slides[currentIndex].title}</Text>

        {/* Subtitle with Color */}
        <Text style={styles.subtitle}>{slides[currentIndex].subtitle}</Text>

        {/* Description */}
        <Text style={styles.description}>{slides[currentIndex].description}</Text>

        {/* Bottom Controls */}
        <View style={styles.controls}>
          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>
              Skip
            </Text>
          </TouchableOpacity>

          {/* Next Arrow Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Icon name="arrow-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Carousel Section
  carouselContainer: {
    flex: 0,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  curve: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
    height: '10%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  
  carousel: {
    flex: 1,
  },
  carouselImage: {
    resizeMode: 'cover',
  },

  // Dots positioned on carousel
  dotsOverlay: {
    position: 'absolute',
    bottom: '5%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingLeft: '6.4%',
    alignItems: 'center',
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#646464',
    marginHorizontal: scale(5),
  },
  dotActive: {
    width: scale(24),
    height: scale(8),
    backgroundColor: '#f8ac1b',
    borderRadius: scale(4),
  },

  // Bottom Content Section
  bottomSection: {
    flex: 1,
    paddingHorizontal: '6.4%',
    paddingTop: '4%',
    paddingBottom: isIOS ? '8%' : '6.4%',
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },

  // Typography
  title: {
    fontFamily: "serif",
    fontSize: scale(24),
    lineHeight: scale(40),
    color: '#111111',
    letterSpacing: -0.5,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: "serif",
    fontSize: scale(18),
    lineHeight: scale(28),
    writingDirection: 'ltr',
    color: '#f8ac1b',
    marginBottom: scale(8),
    letterSpacing: -0.3,
    fontWeight: '800',
  },
  description: {
    fontFamily: "serif",
    fontSize: scale(16),
    lineHeight: scale(24),
    color: '#666666',
  },

  // Controls at bottom
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(24),
  },
  skipButton: {
    paddingVertical: scale(12),
  },
  skipText: {
    fontFamily: "serif",
    fontSize: scale(16),
    color: '#111111',
  },
  nextButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(28),
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});