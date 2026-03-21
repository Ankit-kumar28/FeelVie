// src/api/authApi.ts

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://feelvie.yaytech.in';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Automatically add token to protected requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.log('Token fetch error:', e);
  }
  return config;
});

export interface AuthResponse {
  success?: boolean;
  message?: string;
  access?: string;
  refresh?: string;
  user?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    // add more fields if backend returns them
  };
}

// REGISTER – sends first_name & last_name separately
export const registerUser = async (data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
}): Promise<AuthResponse> => {
  try {
    const response = await api.post('/api/auth/register/', data);
    console.log('[REGISTER] Success response:', response.data);
    return response.data;
  } catch (error: any) {
    console.log('[REGISTER] Error full:', error?.response?.data || error);
    throw error; // important – let screen catch it
  }
};

// LOGIN – returns user with first_name, last_name, phone
export const loginUser = async (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  try {
    const response = await api.post('/api/auth/login/', data);
    console.log('[LOGIN] Success response:', response.data);
    return response.data;
  } catch (error: any) {
    console.log('[LOGIN] Error full:', error?.response?.data || error);
    throw error;
  }
};

// Save token + full user object
export const saveAuthData = async (token: string, user: any) => {
  try {
    await AsyncStorage.multiSet([
      ['access_token', token],
      ['user_data', JSON.stringify(user)],
    ]);
    console.log('Auth data saved successfully');
  } catch (e) {
    console.log('Save auth error:', e);
  }
};

export const loadAuthData = async () => {
  try {
    const [tokenData, userData] = await AsyncStorage.multiGet([
      'access_token',
      'user_data',
    ]);
    return {
      token: tokenData[1],
      user: userData[1] ? JSON.parse(userData[1]) : null,
    };
  } catch (e) {
    console.log('Load auth error:', e);
    return { token: null, user: null };
  }
};