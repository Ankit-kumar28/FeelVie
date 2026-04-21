// src/screens/VirtualTryOnHistoryScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore - react-native-vector-icons module types
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/env';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: number;
  category: string;
  output_image_base64: string;
  request_meta: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get('window');

/** Format ISO date → e.g. "Apr 12, 2026  •  6:42 PM" */
const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

/** Match TryOnResult: always use data:image/png;base64 */
const toImageUri = (base64: string): string =>
  `data:image/png;base64,${base64.replace(/^data:image\/\w+;base64,/, '')}`;

/** Capitalise first letter */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── API ───────────────────────────────────────────────────────────────────────

const fetchHistory = async (): Promise<HistoryItem[]> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    const response = await fetch(`${BASE_URL}/api/secure/vton/history/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return response.json();
  } catch (err) {
    console.error('[HistoryScreen] fetchHistory error:', err);
    throw err;
  }
};

// ── Category badge colour map ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  tops: { bg: '#111111', text: '#FFFFFF' },
  bottoms: { bg: '#444444', text: '#FFFFFF' },
  'one-pieces': { bg: '#777777', text: '#FFFFFF' },
};

const categoryColor = (cat: string | null | undefined) => {
  if (!cat) return { bg: '#DDDDDD', text: '#111111' };
  return CATEGORY_COLORS[cat.toLowerCase()] ?? { bg: '#DDDDDD', text: '#111111' };
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface HistoryCardProps {
  item: HistoryItem;
  onPress: (item: HistoryItem) => void;
}

const HistoryCard = React.memo(({ item, onPress }: HistoryCardProps) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardImageContainer}
        activeOpacity={0.85}
        onPress={() => onPress(item)}
      >
        <Image
          source={{ uri: toImageUri(item.output_image_base64) }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.cardButton}
          activeOpacity={0.8}
          onPress={() => onPress(item)}
        >
          <Text style={styles.cardButtonText}>View</Text>
          <Icons name="auto-awesome" size={16} color="#111111" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
});

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <View style={styles.emptyContainer}>
    <Icon name="tshirt-crew-outline" size={64} color="#DDDDDD" />
    <Text style={styles.emptyTitle}>No try-ons yet</Text>
    <Text style={styles.emptyDesc}>
      Your virtual try-on results will appear here once you generate them.
    </Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onRetry}>
      <Text style={styles.emptyBtnText}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

// ── Detail Modal ──────────────────────────────────────────────────────────────

// (Navigation to TryOnResult replaces modal)

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function VirtualTryOnHistoryScreen() {
  console.debug('[HistoryScreen] mounted');

  const navigation = useNavigation();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefresh = false) => {
    console.debug(`[HistoryScreen] loadHistory called (refresh=${isRefresh})`);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const data = await fetchHistory();
      // Newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setItems(sorted);
      console.debug(`[HistoryScreen] loaded ${sorted.length} items`);
    } catch (err: any) {
      console.error('[HistoryScreen] fetch error:', err);
      setError(err.message ?? 'Failed to load history');
      Toast.show({ type: 'error', text1: 'Could not load history', text2: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleCardPress = (item: HistoryItem) => {
    // Navigate to TryOnResult with base64 image and metadata
    (navigation as any).navigate('TryOnResult', {
      resultBase64: toImageUri(item.output_image_base64),
      category: item.category,
      timestamp: item.created_at,
      metadata: item.request_meta,
    });
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <HistoryCard item={item} onPress={handleCardPress} />
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-left" size={24} color="#111111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Try-On History</Text>

        {/* Spacer to balance back arrow */}
        <View style={{ width: 24 }} />
      </View>

      

      {/* Loading */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={56} color="#DDDDDD" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadHistory()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {!loading && !error && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={
            items.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={<EmptyState onRetry={() => loadHistory()} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadHistory(true)}
              tintColor="#111111"
              colors={['#111111']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    letterSpacing: -0.2,
  },
  subHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  subHeaderText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* List */
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
  },
  separator: {
    height: 0,
  },
  columnWrapper: {
    flex: 1,
  },

  /* Card - Grid layout */
  card: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImageContainer: {
    width: '100%',
    height: 260,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardButton: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  cardButtonText: {
    color: '#111111',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.3,
  },
  cardImageWrapper: {
    width: '100%',
    height: 280,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardInfo: {
    padding: 16,
  },
  cardDate: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#777777',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  viewDetail: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    marginRight: 4,
  },

  /* Centered states */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    textAlign: 'center',
  },
  errorDesc: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#777777',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: '#111111',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
  },
  emptyDesc: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#111111',
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
  },
});
