// src/screens/SearchScreen.tsx
// (sirf suggestion wali FlatList part change hua hai, baaki same)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT = 10;

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      const saved = jsonValue ? JSON.parse(jsonValue) : [];
      setRecentSearches(saved);
    } catch (e) {
      console.error('Error loading recent:', e);
    }
  };

  const saveRecentSearch = async (term) => {
    if (!term.trim()) return;
    try {
      const trimmed = term.trim();
      const newList = [trimmed, ...recentSearches.filter(item => item !== trimmed)];
      const updated = newList.slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      console.error('Error saving recent:', e);
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (e) {
      console.error('Error clearing recent:', e);
    }
  };

  const handleSearchSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
      navigation.navigate('SearchResults', { query: trimmed });
      setQuery('');
      setSuggestions([]);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    setQuery(suggestion);
    saveRecentSearch(suggestion);
    navigation.navigate('SearchResults', { query: suggestion });
    setSuggestions([]);
  };

  const handleRecentPress = (term) => {
    setQuery(term);
    saveRecentSearch(term);
    navigation.navigate('SearchResults', { query: term });
  };

  const fetchSuggestions = async (text) => {
    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `https://api.feelvie.com/api/catalog/products/search_suggestions/?q=${encodeURIComponent(text.trim())}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('API failed');

      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Suggestions error:', err);
      setSuggestions([]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={28} color="#111111" />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#AAAAAA" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Search products..."
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              fetchSuggestions(text);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus
            placeholderTextColor="#AAAAAA"
          />
        </View>
      </View>

      {/* Suggestions List with Arrow */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSuggestionPress(item)}>
              <View style={styles.suggestionRow}>
                <Icon name="search" size={18} color="#AAAAAA" style={{ marginRight: 12 }} />
                <Text style={styles.suggestionText}>{item}</Text>
                <Icon 
                  name="chevron-right" 
                  size={20} 
                  color="#f8ac1b" 
                  style={styles.arrowIcon} 
                />
              </View>
            </TouchableOpacity>
          )}
          style={styles.suggestionsList}
        />
      )}

      {/* Recent Searches */}
      <ScrollView style={styles.content}>
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chipsRow}>
              {recentSearches.map((item) => (
                <TouchableOpacity key={item} style={styles.chip} onPress={() => handleRecentPress(item)}>
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {recentSearches.length === 0 && (
          <Text style={styles.emptyRecent}>No recent searches yet</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: { padding: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginLeft: 8,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'Poppins-Regular', color: '#111111' },
  suggestionsList: { maxHeight: 220, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  suggestionItem: { 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F9F9F9' 
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  suggestionText: { 
    flex: 1, 
    fontSize: 16,
    fontFamily: 'Poppins-Regular', 
    color: '#444444' 
  },
  arrowIcon: {
    marginLeft: 12,
  },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '800',
    color: '#111111',
  },
  clearText: { color: '#f8ac1b', fontWeight: '600', fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    backgroundColor: '#FFF6E3',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F6DCA6',
  },
  chipText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#111111', fontWeight: '500' },
  emptyRecent: { textAlign: 'center', color: '#AAAAAA', fontSize: 16, fontFamily: 'Poppins-Regular', marginTop: 40 },
});