// src/components/ScreenHeader.tsx
//
// The shared top bar for every non-tab screen. Mirrors ProfileScreen's header
// so titles, back arrows and hairline borders line up across the app.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';

interface ScreenHeaderProps {
  title: string;
  /** Small line under the title — counts, order ids, etc. */
  subtitle?: string;
  /** Hide the back arrow (root-level screens such as a tab). */
  showBack?: boolean;
  onBack?: () => void;
  /** Rendered on the right — icon buttons, a cart badge, an action link. */
  right?: React.ReactNode;
  /** Serif-italic display style, like Home's "FeelVie" logo. */
  display?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  right,
  display = false,
  style,
}: ScreenHeaderProps) {
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, display && styles.displayTitle]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {!!right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

/** Round icon button sized to sit in a ScreenHeader's `right` slot. */
export function HeaderIconButton({
  name,
  onPress,
  badge,
  color = colors.ink,
}: {
  name: string;
  onPress: () => void;
  /** Numeric badge — hidden when 0 or undefined. */
  badge?: number;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.iconButton}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Icon name={name} size={22} color={color} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.semibold,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  displayTitle: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
});
