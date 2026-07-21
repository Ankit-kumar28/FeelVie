import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  KeyboardEvent,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/env';

type QueryItem = {
  id: number;
  user?: string;
  subject?: string;
  message?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
};

type ActiveTab = 'queries' | 'chat';
type ChatStep = 'idle' | 'category' | 'details' | 'done';

const ISSUE_CATEGORIES = ['Payment', 'Credits', 'Subscription', 'Image Generation', 'Other'];

export default function ChatSupportScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('queries');
  const [chatStarted, setChatStarted] = useState(false);
  const [chatStep, setChatStep] = useState<ChatStep>('idle');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const username = useMemo(() => {
    const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    return fullName || user?.username || user?.email?.split('@')?.[0] || 'there';
  }, [user]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Single source of truth for keyboard height. We do NOT also use
  // KeyboardAvoidingView, since combining both causes double
  // compensation (composer/content get pushed up twice).
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollToBottom = () => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    timersRef.current.push(timer);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, queries, activeTab]);

  const appendMessage = (role: 'bot' | 'user', text: string) => {
    setMessages((current) => [...current, { id: `${Date.now()}-${Math.random()}`, role, text }]);
  };

  const loadQueries = async () => {
    try {
      setLoadingQueries(true);
      const token = await AsyncStorage.getItem('access_token');
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/api/common/queries/`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load queries');
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setQueries(
        list.sort((a: QueryItem, b: QueryItem) => {
          const left = new Date(b.created_at || '').getTime();
          const right = new Date(a.created_at || '').getTime();
          return left - right;
        })
      );
    } catch (error) {
      console.log('Load queries error:', error);
      setQueries([]);
    } finally {
      setLoadingQueries(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const runBotSequence = (sequence: string[], onComplete?: () => void) => {
    clearTimers();

    let delay = 900;
    sequence.forEach((message, index) => {
      const typingStart = setTimeout(() => {
        setTyping(true);
      }, delay);
      timersRef.current.push(typingStart);

      delay += 1200;

      const botMessage = setTimeout(() => {
        setTyping(false);
        appendMessage('bot', message);
        if (index === sequence.length - 1 && onComplete) {
          onComplete();
        }
      }, delay);
      timersRef.current.push(botMessage);

      delay += 1800;
    });
  };

  const startConversation = () => {
    if (chatStarted) return;

    setChatStarted(true);
    setChatStep('idle');
    setMessages([]);
    setSelectedCategory('');
    setDraftMessage('');
    setTyping(false);

    runBotSequence(
      [
        `Hey ${username}, welcome to chat support.`,
        'Please select the category you are facing issue with.',
      ],
      () => {
        setChatStep('category');
      }
    );
  };

  const handleCategorySelect = (category: string) => {
    if (chatStep !== 'category' || selectedCategory || typing || submitting) return;

    setSelectedCategory(category);
    appendMessage('user', category);
    setChatStep('details');
    runBotSequence(['Sorry for the inconvenience. Please elaborate your query below.'], () => {
      setChatStep('details');
    });
  };

  const handleSend = async () => {
    const trimmedMessage = draftMessage.trim();

    if (!chatStarted) {
      Alert.alert('Start chat', 'Please tap Start Chat first.');
      return;
    }

    if (chatStep !== 'details') {
      Alert.alert('Wait for the prompt', 'Please select a category first.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Select a category', 'Please choose the issue category first.');
      return;
    }

    if (!trimmedMessage) {
      Alert.alert('Add details', 'Please elaborate on the issue before submitting.');
      return;
    }

    const userId = user?.id ?? user?.user_id ?? user?.pk;
    if (!userId) {
      Alert.alert('Account required', 'We could not find your user id. Please sign in again.');
      return;
    }

    try {
      setSubmitting(true);
      appendMessage('user', trimmedMessage);
      setDraftMessage('');

      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BASE_URL}/api/common/queries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: userId,
          subject: selectedCategory,
          message: trimmedMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Unable to create query');
      }

      runBotSequence(['Thank you. Our team will connect with you within 24-48 hours.'], () => {
        setChatStep('done');
      });

      await loadQueries();
    //   setActiveTab('queries');
    } catch (error) {
      console.log('Submit query error:', error);
      Alert.alert('Unable to submit', 'Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={26} color="#111111" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Chat Support</Text>
            {/* <Text style={styles.headerSubtitle}>We usually reply within 24-48 hours</Text> */}
          </View>
          <TouchableOpacity onPress={loadQueries} style={styles.refreshButton}>
            <Icon name="refresh" size={18} color="#f8ac1b" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'queries' && styles.tabButtonActive]} onPress={() => setActiveTab('queries')}>
            <Text style={[styles.tabText, activeTab === 'queries' && styles.tabTextActive]}>Queries</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'chat' && styles.tabButtonActive]} onPress={() => setActiveTab('chat')}>
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'queries' ? (
          <ScrollView contentContainerStyle={styles.queriesContent} showsVerticalScrollIndicator={false}>
            {loadingQueries ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#111111" />
                <Text style={styles.loadingText}>Loading your queries...</Text>
              </View>
            ) : queries.length > 0 ? (
              queries.map((item) => (
                <View key={String(item.id)} style={styles.queryCard}>
                  <View style={styles.queryTopRow}>
                    <Text style={styles.querySubject}>{item.subject || 'No subject'}</Text>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                      <Text style={styles.statusText}>{item.status || 'unknown'}</Text>
                    </View>
                  </View>
                  <Text style={styles.queryMessage}>{item.message || 'No message'}</Text>
                  <Text style={styles.queryMeta}>
                    {item.user ? `User: ${item.user} · ` : ''}
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="chat-outline" size={26} color="#8B846F" />
                <Text style={styles.emptyStateText}>No queries created yet.</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.chatWrap}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.chatContent,
                {
                  paddingBottom: 28 + Math.max(insets.bottom, 0) + (chatStarted ? 104 : 0) + keyboardHeight,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!chatStarted ? (
                <View style={styles.startCard}>
                  <View style={styles.botAvatarLarge}>
                    <Icon name="robot-happy-outline" size={28} color="#111111" />
                  </View>
                  <Text style={styles.startTitle}>Start a conversation</Text>
                  <Text style={styles.startText}>
                    Tap below to begin the support chat. We will greet you, ask for the category, then ask for the details.
                  </Text>
                  <TouchableOpacity style={styles.startButton} onPress={startConversation} activeOpacity={0.85}>
                    <Text style={styles.startButtonText}>Start Chat</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {messages.map((message) => (
                <View key={message.id} style={[styles.messageRow, message.role === 'user' ? styles.userRow : styles.botRow]}>
                  {message.role === 'bot' ? (
                    <View style={styles.botAvatar}>
                      <Icon name="robot-happy-outline" size={22} color="#111111" />
                    </View>
                  ) : null}
                  <View style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageText, message.role === 'user' ? styles.userText : styles.botText]}>
                      {message.text}
                    </Text>
                  </View>
                  {message.role === 'user' ? (
                    <View style={styles.userAvatar}>
                      <Icon name="account-circle-outline" size={22} color="#111111" />
                    </View>
                  ) : null}
                </View>
              ))}

              {typing ? (
                <View style={[styles.messageRow, styles.botRow]}>
                  <View style={styles.botAvatar}>
                    <Icon name="robot-happy-outline" size={22} color="#111111" />
                  </View>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color="#111111" />
                    <Text style={styles.typingText}>typing...</Text>
                  </View>
                </View>
              ) : null}

              {chatStarted && chatStep === 'category' ? (
                <View style={styles.categoryPanel}>
                  {ISSUE_CATEGORIES.map((category) => {
                    const active = selectedCategory === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[styles.categoryButton, active && styles.categoryButtonActive]}
                        onPress={() => handleCategorySelect(category)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <View style={{ height: 120 }} />
            </ScrollView>

            {chatStarted ? (
              <View style={[styles.composerWrap, { bottom: Math.max(insets.bottom, 0) + keyboardHeight }]}>
                <View style={[styles.composerCard]}>
                  <TextInput
                    value={draftMessage}
                    onChangeText={setDraftMessage}
                    placeholder={chatStep === 'category' ? 'Select a category first' : 'Type your message here...'}
                    placeholderTextColor="#9A958A"
                    multiline
                    editable={chatStep === 'details'}
                    style={styles.composerInput}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, submitting && styles.sendButtonDisabled, chatStep !== 'details' && styles.sendButtonMuted]}
                    onPress={handleSend}
                    disabled={submitting || chatStep !== 'details'}
                    activeOpacity={0.85}
                  >
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="send" size={18} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function getStatusStyle(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'resolved':
      return { backgroundColor: '#E5F7EE' };
    case 'pending':
      return { backgroundColor: '#FFF3D7' };
    case 'closed':
      return { backgroundColor: '#ECECEC' };
    default:
      return { backgroundColor: '#EFE8D8' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#111111',
  },
  tabText: {
    color: '#6F6F6F',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  queriesContent: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  loadingText: {
    marginTop: 8,
    color: '#666666',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  queryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  queryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  querySubject: {
    flex: 1,
    fontSize: 15,
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    color: '#111111',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'capitalize',
  },
  queryMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555555',
    marginBottom: 10,
    fontFamily: 'Poppins-Regular',
  },
  queryMeta: {
    fontSize: 11,
    color: '#888888',
    fontFamily: 'Poppins-Regular',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  emptyStateText: {
    marginTop: 10,
    color: '#777777',
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  chatWrap: {
    flex: 1,
    position: 'relative',
  },
  chatContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  startCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  botAvatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F7F4EE',
    borderWidth: 1,
    borderColor: '#E5DFD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  startTitle: {
    fontSize: 18,
    color: '#111111',
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '800',
    marginBottom: 6,
  },
  startText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#666666',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    marginBottom: 14,
  },
  startButton: {
    backgroundColor: '#f8ac1b',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  startButtonText: {
    color: '#111111',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 22,
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  botBubble: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(248,172,27,0.35)',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  botText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#111111',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderTopLeftRadius: 4,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    color: '#666666',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  categoryPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
    paddingLeft: 40,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  categoryButtonActive: {
    backgroundColor: '#f8ac1b',
    borderColor: '#f8ac1b',
  },
  categoryText: {
    color: '#111111',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  categoryTextActive: {
    color: '#111111',
  },
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    // paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    fontSize: 14,
    color: '#111111',
    fontFamily: 'Poppins-Regular',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f8ac1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonMuted: {
    backgroundColor: '#C7C7C7',
  },
});