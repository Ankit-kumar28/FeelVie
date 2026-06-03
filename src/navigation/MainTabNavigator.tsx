import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VirtualTryOnScreen from '../screens/virtualTry/VirtualTryOnScreen';

const Tab = createBottomTabNavigator();

// ── Black & White Theme (matches reference image) ──
const BG_COLOR     = '#FFFFFF';   // tab bar background
const ACTIVE_COLOR = '#000000';   // bold black for active
const INACTIVE_COLOR = '#94a3b8'; // slate for inactive
const BORDER_COLOR = '#f1f5f9';   // subtle border
const INDICATOR_COLOR = '#f8ac1b'; // Brand gold for indicators

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { height: 0 },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {/* ── DEMO MODE: Only 2 tabs active ── */}
      <Tab.Screen name="Home"        component={HomeScreen} />
      <Tab.Screen name="TryOn"   component={VirtualTryOnScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />

      {/* ── Restore these for full app ──
      
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Cart"        component={CartScreen} />
      */}
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarContainer}>
      {/* Clean white background with subtle top border */}
      <View style={styles.background} />

      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = getIconName(route.name);
          const label    = getLabel(route.name);

          // ── SPECIAL CASE: Center Try-On Button ──
          if (route.name === 'TryOn') {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.9}
                style={styles.centerItem}
              >
                <View style={[styles.centerCircle, isFocused && styles.activeCenterCircle]}>
                  {/* Outer glowing border ring */}
                  <View style={styles.glowRing} />
                  <Ionicons
                    name={iconName.replace('-outline', '')}
                    size={26}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[
                  styles.label, 
                  { 
                    color: isFocused ? '#000000' : INACTIVE_COLOR, 
                    marginTop: 40,
                    fontWeight: '700',
                    fontSize: 11
                  }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              {/* Active top indicator bar */}
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: isFocused ? INDICATOR_COLOR : 'transparent' },
                ]}
              />

              {/* Icon */}
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
                style={styles.icon}
              />

              {/* Label */}
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
                    fontWeight: isFocused ? '700' : '400' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function getIconName(name: string) {
  switch (name) {
    case 'TryOn':   return 'shirt-outline';
    case 'Profile': return 'person-outline';
    case 'Home':        return 'home-outline';
    // case 'Marketplace': return 'tag-outline';
    // case 'Cart':        return 'shopping-bag-outline';
    default: return 'circle-outline';
  }
}

function getLabel(name: string) {
  switch (name) {
    case 'TryOn':   return 'Try On';
    case 'Profile': return 'Me';
    default: return name;
  }
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 74;

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: TAB_BAR_HEIGHT,
    // Crisp shadow matching reference image style
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 8,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BG_COLOR,
    // borderTopWidth: 1,
    // borderTopColor: BORDER_COLOR,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    height: TAB_BAR_HEIGHT,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  centerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
  },
  centerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111111', 
    position: 'absolute',
    top: -20, 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#f8ac1b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  activeCenterCircle: {
    backgroundColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    transform: [{ scale: 1.05 }]
  },
  glowRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(248, 172, 27, 0.4)',
    top: -4,
    left: -4,
  },
  activeIndicator: {
    width: 24,
    height: 2,
    // borderRadius: 1,
    marginBottom: 6,
    marginTop: 0,
  },
  icon: {
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    // Use a clean system serif/sans — matches the thin stroke style in image
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'Poppins-Regular',
  },
});