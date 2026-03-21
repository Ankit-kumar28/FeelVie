// src/screens/FAQsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export default function FAQsScreen() {
  const navigation = useNavigation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I list a product for sale?",
      answer:
        "Go to Sell/Rent Product from the profile menu, fill in the details, upload clear photos, set your price and publish.",
    },
    {
      question: "What payment methods are accepted?",
      answer:
        "We currently support UPI, Credit/Debit cards, Net Banking and Wallets (Paytm, PhonePe, Google Pay).",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Most orders are delivered within 3–7 business days depending on your location and seller.",
    },
    {
      question: "Can I return or exchange a product?",
      answer:
        "Yes, you can return or exchange within 7 days if the product is unused and in original condition.",
    },
    {
      question: "How do I contact customer support?",
      answer:
        "Use the chat option in the app or email us at support@feelvie.in",
    },
  ];

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 44 : 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-left" size={26} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>FAQs</Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {faqs.map((faq, index) => (
          <View key={index}>
            <TouchableOpacity
              style={styles.faqRow}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionText}>{faq.question}</Text>

              <Icon
                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#B03385"
              />
            </TouchableOpacity>

            {expandedIndex === index && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{faq.answer}</Text>
              </View>
            )}

            {index < faqs.length - 1 && <View style={styles.separator} />}
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop:18,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  scrollContent: {
    paddingHorizontal: 0,
  },

  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 24,
    paddingRight: 16,
  },

  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
    backgroundColor: '#fafafa',
  },
  answerText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },

  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 20,
  },
});