import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Plus, AlertTriangle, Clock } from 'lucide-react-native';
import type { SessionSummary } from '../../types/session';
import { formatDuration } from '../../utils/format';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography, shadows } from '../../theme';

interface Props {
  summary: SessionSummary;
  onSaveReflection: (text: string) => void;
  onNewSession: () => void;
  onGoHome: () => void;
}

export default function SummaryScreen({ summary, onSaveReflection, onNewSession, onGoHome }: Props) {
  const { c } = useTheme();
  const [reflection, setReflection] = useState(summary.userReflection || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveReflection(reflection);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'elevated') return c.rose;
    if (risk === 'moderate') return c.amber;
    return c.green;
  };

  const moodDelta = summary.preMood && summary.postMood
    ? summary.postMood.value - summary.preMood.value
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Session Summary</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}>
            <Clock size={16} color={c.accentPrimary} />
            <Text style={[styles.statValue, { color: c.textPrimary }]}>{formatDuration(summary.duration)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Duration</Text>
          </View>
          {moodDelta !== null && (
            <View style={[styles.stat, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}>
              <Text style={[styles.statValue, { color: moodDelta > 0 ? c.green : moodDelta < 0 ? c.rose : c.textPrimary }]}>
                {moodDelta > 0 ? `+${moodDelta}` : moodDelta}
              </Text>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>Mood Change</Text>
            </View>
          )}
          <View style={[styles.stat, { backgroundColor: getRiskColor(summary.riskLevel) + '15', borderColor: getRiskColor(summary.riskLevel) + '40' }, shadows.sm]}>
            <AlertTriangle size={16} color={getRiskColor(summary.riskLevel)} />
            <Text style={[styles.statValue, { color: getRiskColor(summary.riskLevel) }]}>{summary.riskLevel}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Risk</Text>
          </View>
        </View>

        {/* Sections */}
        {summary.keyTakeaways.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Key Takeaways</Text>
            {summary.keyTakeaways.map((t, i) => (
              <Text key={i} style={[styles.bulletItem, { color: c.textPrimary }]}>• {t}</Text>
            ))}
          </View>
        )}

        {summary.copingStrategies.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Coping Strategies</Text>
            {summary.copingStrategies.map((s, i) => (
              <Text key={i} style={[styles.bulletItem, { color: c.textPrimary }]}>• {s}</Text>
            ))}
          </View>
        )}

        {summary.homeworkAssignments.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Homework</Text>
            {summary.homeworkAssignments.map((h, i) => (
              <Text key={i} style={[styles.bulletItem, { color: c.textPrimary }]}>• {h}</Text>
            ))}
          </View>
        )}

        {summary.conversationAssessment ? (
          <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Clinical Assessment</Text>
            <Text style={[styles.bodyText, { color: c.textPrimary }]}>{summary.conversationAssessment}</Text>
          </View>
        ) : null}

        {summary.wayForward ? (
          <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Way Forward</Text>
            <Text style={[styles.bodyText, { color: c.textPrimary }]}>{summary.wayForward}</Text>
          </View>
        ) : null}

        {/* Reflection */}
        <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Your Reflection</Text>
          <TextInput
            style={[styles.reflectionInput, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
            value={reflection}
            onChangeText={setReflection}
            placeholder="How did this session feel? Any insights?"
            placeholderTextColor={c.textMuted}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: c.accentPrimary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Reflection'}</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.accentPrimary }]} onPress={onNewSession}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>New Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.bgCard, borderColor: c.border, borderWidth: 1 }]} onPress={onGoHome}>
            <Home size={18} color={c.textPrimary} />
            <Text style={[styles.actionBtnText, { color: c.textPrimary }]}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: 4, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  statValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  statLabel: { fontSize: typography.sizes.xs },
  section: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  bulletItem: { fontSize: typography.sizes.sm, lineHeight: 22, marginBottom: 2 },
  bodyText: { fontSize: typography.sizes.sm, lineHeight: 22 },
  reflectionInput: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontSize: typography.sizes.sm, minHeight: 80, marginBottom: spacing.sm },
  saveBtn: { borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radii.md },
  actionBtnText: { color: '#FFFFFF', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
});
