// src/screens/OnboardingScreen.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
  
  // useWindowDimensions automatically updates on screen rotation (Crucial for iPads)
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Responsive logic inside useMemo to recalculate ONLY on layout changes
  const { styles, scale, isTablet, carouselHeight } = useMemo(() => {
    const isTabletDevice = SCREEN_WIDTH >= 768;
    
    // Clamp the scale factor to a max of 1.4 so iPad fonts don't become massive
    const scale = (size: number) => {
      const scaleFactor = Math.min(SCREEN_WIDTH / 375, 1.4);
      return Math.ceil(size * scaleFactor);
    };

    // Adjust carousel height based on orientation & device
    const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;
    const carouselH = isLandscape 
      ? SCREEN_HEIGHT * 0.55 // Less vertical space in landscape
      : SCREEN_HEIGHT * (isTabletDevice ? 0.60 : 0.65); // Standard for portrait

    return {
      styles: getStyles(scale, SCREEN_WIDTH, isTabletDevice),
      scale,
      isTablet: isTabletDevice,
      carouselHeight: carouselH,
    };
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

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
  }, [currentIndex, SCREEN_WIDTH]);

  const handleCarouselScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex === slides.length - 1) {
      navigation.replace('Login');
    } else {
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

      {/* Carousel Container */}
      <View style={[styles.carouselContainer, { height: carouselHeight }]}>
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
              style={{ width: SCREEN_WIDTH, height: carouselHeight, resizeMode: 'cover' }}
            />
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.dotsOverlay}>
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
        </View>
      </View>

      {/* Bottom Content Section */}
      <View style={styles.bottomSection}>
        <ScrollView
          contentContainerStyle={styles.bottomScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.contentWrapper}>
            <View>
              <Text style={styles.title}>{slides[currentIndex].title}</Text>
              <Text style={styles.subtitle}>{slides[currentIndex].subtitle}</Text>
              <Text style={styles.description}>{slides[currentIndex].description}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => navigation.replace('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Icon name="arrow-right" size={scale(24)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Dynamic stylesheet generator to support responsive sizes
const getStyles = (scale: (size: number) => number, screenWidth: number, isTablet: boolean) => 
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    carouselContainer: {
      backgroundColor: '#FFF',
      position: 'relative',
    },
    carousel: {
      flex: 1,
    },
    dotsOverlay: {
      position: 'absolute',
      bottom: '5%',
      left: 0,
      right: 0,
      alignItems: isTablet ? 'center' : 'flex-start', // Center dots on iPad
      paddingLeft: isTablet ? 0 : '6.4%', 
    },
    dotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      // Ensure dots align with the max-width wrapper on tablets if centered
      width: isTablet ? '100%' : 'auto',
      maxWidth: 600,
      paddingHorizontal: isTablet ? '6.4%' : 0,
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
    bottomSection: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    bottomScrollContent: {
      flexGrow: 1,
      paddingTop: scale(20),
      paddingBottom: isIOS ? scale(40) : scale(24),
      alignItems: 'center', // Centers the contentWrapper on large screens
    },
    // contentWrapper caps the maximum width on iPads to prevent ultra-long text lines
    contentWrapper: {
      flex: 1,
      width: '100%',
      maxWidth: 600, 
      paddingHorizontal: '6.4%',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: "serif",
      fontSize: scale(24),
      lineHeight: scale(36),
      color: '#111111',
      letterSpacing: -0.5,
      fontWeight: '800',
      fontStyle: 'italic',
    },
    subtitle: {
      fontFamily: "serif",
      fontSize: scale(18),
      lineHeight: scale(28),
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
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: scale(24),
    },
    skipButton: {
      paddingVertical: scale(12),
      paddingRight: scale(20),
    },
    skipText: {
      fontFamily: "serif",
      fontSize: scale(16),
      color: '#111111',
      fontWeight: '600',
    },
    nextButton: {
      width: scale(56),
      height: scale(56),
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