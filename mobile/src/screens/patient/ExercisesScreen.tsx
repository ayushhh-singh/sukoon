import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Wind, Hand, Activity, Eye, Brain, Heart,
  Footprints, Moon, BookOpen, Smile, Flower2, Timer, Compass, Layers,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography, shadows } from '../../theme';

const EXERCISES = [
  {
    category: 'Mindfulness & Relaxation',
    items: [
      { id: 'breathing', name: 'Breathing Exercise', desc: 'Box breathing & 4-7-8 technique', icon: Wind },
      { id: 'grounding', name: '5-4-3-2-1 Grounding', desc: 'Sensory awareness technique', icon: Hand },
      { id: 'pmr', name: 'Progressive Muscle Relaxation', desc: 'Tense and release muscle groups', icon: Activity },
      { id: 'body-scan', name: 'Body Scan', desc: 'Guided body awareness meditation', icon: Eye },
      { id: 'visualization', name: 'Mindful Visualization', desc: 'Calming mental imagery', icon: Brain },
      { id: 'self-compassion', name: 'Self-Compassion Break', desc: 'Three-step self-kindness practice', icon: Heart },
      { id: 'walking', name: 'Mindful Walking', desc: 'Awareness-based walking practice', icon: Footprints },
      { id: 'sleep', name: 'Sleep Hygiene', desc: 'Better sleep habits checklist', icon: Moon },
    ],
  },
  {
    category: 'Cognitive & Reflective',
    items: [
      { id: 'thought-journal', name: 'Thought Journal', desc: 'CBT-based thought recording', icon: BookOpen },
      { id: 'affirmations', name: 'Positive Affirmations', desc: 'Uplifting self-statements', icon: Smile },
      { id: 'gratitude', name: 'Gratitude Journal', desc: 'Count your blessings', icon: Flower2 },
      { id: 'worry-time', name: 'Worry Time', desc: 'Structured worry management', icon: Timer },
    ],
  },
  {
    category: 'Self-Discovery',
    items: [
      { id: 'emotion-wheel', name: 'Emotion Wheel', desc: 'Identify and name your emotions', icon: Compass },
      { id: 'values-sort', name: 'Values Card Sort', desc: 'Discover what matters most', icon: Layers },
    ],
  },
];

export default function ExercisesScreen() {
  const { c } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Exercises</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {EXERCISES.map((section) => (
          <View key={section.category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
              {section.category}
            </Text>
            <View style={styles.grid}>
              {section.items.map((exercise) => {
                const Icon = exercise.icon;
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: c.accentPrimary + '12' }]}>
                      <Icon size={22} color={c.accentPrimary} />
                    </View>
                    <Text style={[styles.exerciseName, { color: c.textPrimary }]}>{exercise.name}</Text>
                    <Text style={[styles.exerciseDesc, { color: c.textMuted }]} numberOfLines={2}>
                      {exercise.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  scroll: {
    padding: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  exerciseCard: {
    width: '47%',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  exerciseDesc: {
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
});
