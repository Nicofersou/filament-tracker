import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { STATUS_LABELS, type SpoolStatus } from '../features/spools/types';
import { radius, spacing, useTheme, type Colors } from '../theme';

export function Screen({ children }: { children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

type TextVariant = 'title' | 'heading' | 'body' | 'caption';
type TextTone = 'default' | 'secondary' | 'danger' | 'accent';

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: TextProps & { variant?: TextVariant; tone?: TextTone }) {
  const { colors } = useTheme();
  const color =
    tone === 'secondary'
      ? colors.textSecondary
      : tone === 'danger'
        ? colors.danger
        : tone === 'accent'
          ? colors.accent
          : colors.text;
  return <Text {...props} style={[textStyles[variant], { color }, style]} />;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
      {children}
    </AppText>
  );
}

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  small = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  small?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, fg: colors.accentText, border: colors.accent },
    secondary: { bg: 'transparent', fg: colors.text, border: colors.border },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.border },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color: palette.fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: selected ? colors.accentText : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...inputProps
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

function statusColor(colors: Colors, status: SpoolStatus): string {
  if (status === 'sealed') return colors.sealed;
  if (status === 'in_use') return colors.inUse;
  return colors.empty;
}

export function StatusDot({ status, size = 8 }: { status: SpoolStatus; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: statusColor(colors, status),
      }}
    />
  );
}

export function StatusBadge({ status }: { status: SpoolStatus }) {
  return (
    <View style={styles.badge}>
      <StatusDot status={status} />
      <AppText variant="caption" style={styles.badgeLabel}>
        {STATUS_LABELS[status]}
      </AppText>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <AppText variant="heading">{title}</AppText>
      <AppText tone="secondary" style={styles.emptyMessage}>
        {message}
      </AppText>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>
      {children}
    </AppText>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 13 },
});

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  fieldLabel: { fontWeight: '500' },
  field: { gap: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.md },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  buttonLabelSmall: { fontSize: 14 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipLabel: { fontSize: 14, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badgeLabel: { fontWeight: '600' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: 64, paddingHorizontal: spacing.xl },
  emptyMessage: { textAlign: 'center', marginBottom: spacing.md },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
});
