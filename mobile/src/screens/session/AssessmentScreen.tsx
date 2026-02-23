import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, SkipForward, ArrowLeft } from 'lucide-react-native';
import type { AssessmentConfig, AssessmentResponse } from '../../types/assessments';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography } from '../../theme';

interface Props {
  config: AssessmentConfig;
  timing: 'pre-session' | 'post-session';
  onComplete: (responses: AssessmentResponse[]) => void;
  onSkip: () => void;
  onBack?: () => void;
}

export default function AssessmentScreen({ config, timing, onComplete, onSkip, onBack }: Props) {
  const { c } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, number>>(new Map());

  const question = config.questions[currentIndex];
  const totalQuestions = config.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const currentValue = responses.get(question.id);
  const allAnswered = responses.size === totalQuestions;

  const selectOption = (value: number) => {
    const updated = new Map(responses);
    updated.set(question.id, value);
    setResponses(updated);
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => setCurrentIndex(i => Math.min(i + 1, totalQuestions - 1)), 300);
    }
  };

  const handleSubmit = () => {
    const result: AssessmentResponse[] = Array.from(responses.entries()).map(
      ([questionId, value]) => ({ questionId, value })
    );
    onComplete(result);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.content}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={18} color={c.textPrimary} />
            <Text style={[styles.backText, { color: c.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: c.textPrimary }]}>{config.title}</Text>
        <Text style={[styles.timing, { color: c.accentPrimary }]}>
          {timing === 'pre-session' ? 'Before your session' : 'After your session'}
        </Text>
        <Text style={[styles.desc, { color: c.textSecondary }]}>{config.description}</Text>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: c.surface }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.accentPrimary }]} />
        </View>
        <Text style={[styles.progressText, { color: c.textMuted }]}>
          {currentIndex + 1} of {totalQuestions}
        </Text>

        {/* Question */}
        <Text style={[styles.questionText, { color: c.textPrimary }]}>{question.text}</Text>

        <View style={styles.options}>
          {config.responseOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: currentValue === option.value ? c.accentPrimary + '15' : c.bgCard,
                  borderColor: currentValue === option.value ? c.accentPrimary : c.border,
                },
              ]}
              onPress={() => selectOption(option.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, { borderColor: currentValue === option.value ? c.accentPrimary : c.textMuted }]}>
                {currentValue === option.value && <View style={[styles.radioDot, { backgroundColor: c.accentPrimary }]} />}
              </View>
              <Text style={[styles.optionLabel, { color: c.textPrimary }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation */}
        <View style={styles.nav}>
          <TouchableOpacity
            style={[styles.navBtn, { opacity: currentIndex === 0 ? 0.3 : 1 }]}
            onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={18} color={c.textSecondary} />
            <Text style={[styles.navBtnText, { color: c.textSecondary }]}>Back</Text>
          </TouchableOpacity>

          {currentIndex < totalQuestions - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, { opacity: currentValue === undefined ? 0.3 : 1 }]}
              onPress={() => setCurrentIndex(i => i + 1)}
              disabled={currentValue === undefined}
            >
              <Text style={[styles.navBtnText, { color: c.textSecondary }]}>Next</Text>
              <ChevronRight size={18} color={c.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: c.accentPrimary, opacity: allAnswered ? 1 : 0.5 }]}
              onPress={handleSubmit}
              disabled={!allAnswered}
            >
              <Text style={styles.submitText}>View Results</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <SkipForward size={14} color={c.textMuted} />
          <Text style={[styles.skipText, { color: c.textMuted }]}>Skip assessment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  backText: { fontSize: typography.sizes.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, marginBottom: spacing.xs },
  timing: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  desc: { fontSize: typography.sizes.sm, marginBottom: spacing.lg, lineHeight: 20 },
  progressBar: { height: 4, borderRadius: 2, marginBottom: spacing.xs },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: typography.sizes.xs, textAlign: 'right', marginBottom: spacing.xl },
  questionText: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, marginBottom: spacing.lg, lineHeight: 24 },
  options: { gap: spacing.sm, marginBottom: spacing.xl },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: typography.sizes.sm, flex: 1 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  navBtnText: { fontSize: typography.sizes.sm },
  submitBtn: { borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  submitText: { color: '#FFFFFF', fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  skipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  skipText: { fontSize: typography.sizes.xs },
});
