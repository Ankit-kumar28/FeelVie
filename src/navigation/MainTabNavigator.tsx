import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path } from 'react-native-svg';

import HomeScreen from '../screens/HomeScreen';
import SellOptionsScreen from '../screens/sell/SellOptionsScreen';
import CartScreen from '../screens/cart/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VirtualTryOnScreen from '../screens/virtualTry/VirtualTryOnScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';

const Tab = createBottomTabNavigator();

// ── Theme Colors ──
const MAIN_COLOR    = '#B03385';
const ACCENT        = '#ffffff';
const INACTIVE      = '#d0cfd0';

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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="TryOn" component={VirtualTryOnScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarContainer}>
      {/* Curved background – unchanged */}
      <View style={styles.svgWrapper}>
        <Svg
          width={Dimensions.get('window').width}
          height={120}
          viewBox="0 0 400 10"
        >
          <Path
            d="
              M0 0 
              H135 
              C160 0 178 32 200 32 
              C222 32 240 0 265 0 
              H400 
              V120 
              H0 
              Z
            "
            fill={MAIN_COLOR}
          />
        </Svg>
      </View>

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

          if (route.name === 'TryOn') {
            return (
              <View key={route.key} style={styles.centerContainer}>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.85}
                  style={[
                    styles.floatingCircle,
                    isFocused && styles.floatingCircleActive,
                  ]}
                >
                  <Icon
                    name="tshirt-crew"
                    size={36}
                    color={isFocused ? ACCENT : INACTIVE}
                  />
                </TouchableOpacity>
              </View>
            );
          }

          const iconName = getIconName(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={[
                styles.tabItem,
                route.name === 'Sell' && styles.sellTabExtraSpace,
                route.name === 'Cart' && styles.cartTabExtraSpace,
                // Only add dark shadow when this tab is active
                isFocused && styles.tabItemShadowActive,
              ]}
            >
              <Icon
                name={iconName}
                size={22}
                color={isFocused ? ACCENT : INACTIVE}
              />
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? ACCENT : INACTIVE },
                ]}
              >
                {route.name}
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
    case 'Home':    return 'home-outline';
    case 'Marketplace':    return 'tag-outline';
    case 'Cart':    return 'cart-outline';
    case 'Profile': return 'account-outline';
    default:        return 'circle';
  }
}

const { width } = Dimensions.get('window');
const CENTER_SIZE = 55; // slightly bigger looks better with more space

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 100,           // increased a bit
    // marginTop:10,
  },
  svgWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 16,      // ← increased side padding
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 80,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  tabItemShadowActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.50,     // quite visible dark shadow
    shadowRadius: 10,
    elevation: 14,           // strong on Android
  },

  // Extra spacing for Sell and Cart tabs (the ones next to center)
  sellTabExtraSpace: {
    marginRight: 20,            // pushes Sell away from center
  },
  cartTabExtraSpace: {
    marginLeft: 70,             // pushes Cart away from center
  },

  centerContainer: {
    position: 'absolute',
    bottom: 40,                 // ← raised a little higher
    left: width / 2 - CENTER_SIZE / 2,
    alignItems: 'center',
  },
  floatingCircle: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: MAIN_COLOR,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.4,
    // shadowRadius: 12,
    elevation: 5,
  },
  floatingCircleActive: {
    borderColor: ACCENT,
    borderWidth: .5,
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});