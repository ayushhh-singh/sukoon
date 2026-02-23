import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { MOOD_OPTIONS } from '../../types/mood';
import type { MoodEntry } from '../../types/mood';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography } from '../../theme';

interface MoodPickerScreenProps {
  context: 'pre-session' | 'post-session';
  onSelect: (mood: MoodEntry) => void;
  onBack?: () => void;
}

export default function MoodPickerScreen({ context, onSelect, onBack }: MoodPickerScreenProps) {
  const { c } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selected === null) return;
    const option = MOOD_OPTIONS.find(o => o.value === selected)!;
    onSelect({
      id: `mood-${Date.now()}`,
      timestamp: new Date().toISOString(),
      value: selected,
      label: option.label,
      emoji: option.emoji,
      context,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.content}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={c.textPrimary} />
            <Text style={[styles.backText, { color: c.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: c.textPrimary }]}>
          {context === 'pre-session' ? 'How are you feeling right now?' : 'How are you feeling after your session?'}
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Select the option that best matches your current mood
        </Text>

        <View style={styles.options}>
          {MOOD_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.moodOption,
                {
                  backgroundColor: c.bgCard,
                  borderColor: selected === option.value ? option.color : c.border,
                  borderWidth: selected === option.value ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(option.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{option.emoji}</Text>
              <Text style={[styles.moodLabel, { color: c.textPrimary }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: c.accentPrimary, opacity: selected === null ? 0.5 : 1 }]}
          onPress={handleConfirm}
          disabled={selected === null}
        >
          <Text style={styles.confirmText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl, position: 'absolute', top: spacing.lg, left: spacing.xl },
  backText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.sm, textAlign: 'center', marginBottom: spacing.xxl },
  options: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.xxl },
  moodOption: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radii.lg, width: 90 },
  emoji: { fontSize: 32, marginBottom: spacing.xs },
  moodLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  confirmBtn: { borderRadius: radii.md, paddingVertical: spacing.lg, alignItems: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});
