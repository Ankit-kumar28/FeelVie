// src/hooks/useCartCount.ts
//
// Server-backed cart size, used for the badge on the Home / Marketplace
// header icons. Refetches whenever the screen using it regains focus so the
// badge stays honest after add-to-cart or checkout.

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/env';

export default function useCartCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setCount(0);
        return;
      }

      const res = await fetch(`${BASE_URL}/api/cart/items/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.results || [];
      setCount(items.length);
    } catch {
      // A badge is not worth surfacing an error for — leave the last count.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { count, refresh };
}
