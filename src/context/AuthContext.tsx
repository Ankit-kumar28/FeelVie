import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children  }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [tokenData, userData] = await AsyncStorage.multiGet([
          'access_token',
          'user_data',
        ]);

        if (tokenData[1] && userData[1]) {
          setToken(tokenData[1]);
          setUser(JSON.parse(userData[1]));
        }
      } catch (e) {
        console.log('Auth load error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = async (newToken: string, newUser: any) => {
    try {
      await AsyncStorage.multiSet([
        ['access_token', newToken],
        ['user_data', JSON.stringify(newUser)],
      ]);
      setToken(newToken);
      setUser(newUser);
      console.log('Logged in successfully:', newUser.email);
    } catch (e) {
      console.log('Login save error:', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'user_data']);
      setToken(null);
      setUser(null);
      console.log('Logged out');
    } catch (e) {
      console.log('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};