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
  Modal,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

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

const API_BASE = 'https://api.feelvie.com'; // ← replace with your base URL

const fetchHistory = async (): Promise<HistoryItem[]> => {
  const response = await fetch(`${API_BASE}/api/secure/vton/history/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Add auth header here if needed:
      // 'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.json();
};

// ── Category badge colour map ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  tops: { bg: '#111111', text: '#FFFFFF' },
  bottoms: { bg: '#444444', text: '#FFFFFF' },
  'one-pieces': { bg: '#777777', text: '#FFFFFF' },
};

const categoryColor = (cat: string) =>
  CATEGORY_COLORS[cat.toLowerCase()] ?? { bg: '#DDDDDD', text: '#111111' };

// ── Sub-components ────────────────────────────────────────────────────────────

interface HistoryCardProps {
  item: HistoryItem;
  onPress: (item: HistoryItem) => void;
}

const HistoryCard = React.memo(({ item, onPress }: HistoryCardProps) => {
  const { bg, text } = categoryColor(item.category);

  // Parse request_meta JSON if possible
  let meta: Record<string, string> = {};
  try {
    meta = JSON.parse(item.request_meta);
  } catch {
    // keep empty
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      {/* Result image */}
      <View style={styles.cardImageWrapper}>
        <Image
          source={{ uri: toImageUri(item.output_image_base64) }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Category badge */}
        <View style={[styles.categoryBadge, { backgroundColor: bg }]}>
          <Text style={[styles.categoryBadgeText, { color: text }]}>
            {cap(item.category)}
          </Text>
        </View>
      </View>

      {/* Card info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>

        {/* Meta pills (garment size, body size, etc. if present) */}
        {Object.keys(meta).length > 0 && (
          <View style={styles.metaRow}>
            {Object.entries(meta)
              .slice(0, 3)
              .map(([k, v]) => (
                <View key={k} style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    {cap(k)}: {v}
                  </Text>
                </View>
              ))}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetail}>View result</Text>
          <Icon name="arrow-right" size={15} color="#111111" />
        </View>
      </View>
    </TouchableOpacity>
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

interface DetailModalProps {
  item: HistoryItem | null;
  onClose: () => void;
}

const DetailModal = ({ item, onClose }: DetailModalProps) => {
  if (!item) return null;

  let meta: Record<string, string> = {};
  try {
    meta = JSON.parse(item.request_meta);
  } catch {}

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Try-On Result</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={26} color="#111111" />
            </TouchableOpacity>
          </View>

          {/* Full result image */}
          <Image
            source={{ uri: toImageUri(item.output_image_base64) }}
            style={styles.modalImage}
            resizeMode="contain"
          />

          {/* Details */}
          <View style={styles.modalDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{cap(item.category)}</Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Generated</Text>
              <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
            </View>

            {Object.keys(meta).length > 0 && (
              <>
                <View style={styles.detailDivider} />
                {Object.entries(meta).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{cap(k)}</Text>
                      <Text style={styles.detailValue}>{v}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                  </React.Fragment>
                ))}
              </>
            )}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function VirtualTryOnHistoryScreen() {
  console.debug('[HistoryScreen] mounted');

  const navigation = useNavigation();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

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
    setSelectedItem(item);
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <HistoryCard item={item} onPress={handleCardPress} />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
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

      {/* Count subtitle */}
      {!loading && !error && items.length > 0 && (
        <View style={styles.subHeader}>
          <Text style={styles.subHeaderText}>
            {items.length} result{items.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

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
          ItemSeparatorComponent={renderSeparator}
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

      {/* Detail Modal */}
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

// Portrait ratio matching a full-body try-on result (similar to TryOnResult screen)
const CARD_IMAGE_HEIGHT = width * 1.15;

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
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 20,
    marginVertical: 8,
  },

  /* Card */
  card: {
    marginHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardImageWrapper: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaPill: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaPillText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#444444',
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

  /* Detail Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.90,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
  },
  modalImage: {
    width: '100%',
    height: height * 0.50,
    backgroundColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  modalDetails: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#AAAAAA',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111111',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  closeBtn: {
    backgroundColor: '#111111',
    margin: 20,
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
