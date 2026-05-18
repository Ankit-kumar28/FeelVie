// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { useAuth } from '../context/AuthContext';

// Auth screens
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingScreen2 from '../screens/OnboardingScreen2';
import SignUpScreen from '../screens/auth/SignUpScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// App screens (protected)
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import AddressScreen from '../screens/AddressScreen';
import PaymentInfoScreen from '../screens/PaymentInfoScreen';
import ProductDetailScreen from '../screens/ProductScreen';
import SellOptionsScreen from '../screens/sell/SellOptionsScreen';
import SellProductScreen from '../screens/sell/SellProductScreen';
import RentProductScreen from '../screens/sell/RentProductScreen';
import CartScreen from '../screens/cart/CartScreen';
import VirtualTryOnScreen from '../screens/virtualTry/VirtualTryOnScreen';
import TryOn404Screen from '../screens/virtualTry/TryOn404Screen';
import MyWishListScreen from '../screens/MyWishList';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import FAQsScreen from '../screens/FAQsScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import EditAddressScreen from '../screens/EditAddressScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import SearchScreen from '../screens/SearchScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import SplashScreen from '../screens/SplashScreen';
import TryOnResult from '../screens/virtualTry/TryOnResult';
import VirtualTryOnDetails from '../screens/virtualTry/VirtualTryOnDetails';
import ImageScoreValidationScreen from '../screens/virtualTry/ImageScoreValidationScreen';
import DetailedUserInfoScreen from '../screens/virtualTry/DetailedUserInfoScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import WalletScreen from '../screens/Wallet';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VirtualTryOnHistoryScreen from '../screens/virtualTry/VirtualTryOnHistoryScreen';

console.log("SearchScreen imported in AppNavigator:", !!SearchScreen);
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
       <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />

      {/* Sell flow */}
      <Stack.Screen name="SellOptions" component={SellOptionsScreen} />
      <Stack.Screen name="SellProduct" component={SellProductScreen} />
      <Stack.Screen name="RentProduct" component={RentProductScreen} />

      {/* Other protected screens */}
      <Stack.Screen name="CartScreen" component={CartScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="PersonalInfoScreen" component={PersonalInfoScreen} />
      <Stack.Screen name="AddressScreen" component={AddressScreen} />
      <Stack.Screen name="PaymentInfoScreen" component={PaymentInfoScreen} />
      <Stack.Screen name="VirtualTryOn" component={VirtualTryOnScreen} />
      <Stack.Screen name="TryOn404" component={TryOn404Screen} />
      <Stack.Screen name="MyWishList" component={MyWishListScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="FAQs" component={FAQsScreen} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen name="EditAddress" component={EditAddressScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="TryOnResult" component={TryOnResult} />
      <Stack.Screen name="VirtualTryOnDetails" component={VirtualTryOnDetails} />
      <Stack.Screen name="ImageScoreValidation" component={ImageScoreValidationScreen} />
      <Stack.Screen name="DetailedUserInfo" component={DetailedUserInfoScreen} />
      <Stack.Screen name="VirtualTryOnHistory" component={VirtualTryOnHistoryScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />

      <Stack.Screen name="WalletScreen" component={WalletScreen} />



      {/* You can add more screens here later */}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <SafeAreaView style={{  flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#B03385" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#555' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{  flex: 1, backgroundColor: '#FFFFFF' }}>
      <NavigationContainer>
        {token ? <AppStack /> : <AuthStack />}
        {/* Toast at root level – recommended */}
        <Toast />
      </NavigationContainer>
    </SafeAreaView>
  );
}