import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mic, MessageCircle, Sparkles, ArrowLeft, ArrowRight,
  SkipForward, Play, Clock, Link2, ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSession } from '../../hooks/useSession';
import { spacing, radii, typography, shadows } from '../../theme';
import { formatDuration } from '../../utils/format';
import MoodPickerScreen from '../session/MoodPickerScreen';
import AssessmentScreen from '../session/AssessmentScreen';
import ActiveSessionScreen from '../session/ActiveSessionScreen';
import SummaryScreen from '../session/SummaryScreen';
import CrisisModal from '../../components/CrisisModal';
import type { SessionSummary } from '../../types/session';

const CONCERNS = [
  'Anxiety & Worry',
  'Low Mood & Depression',
  'Stress & Overwhelm',
  'Relationship Difficulties',
  'Sleep Problems',
  'Self-Esteem',
  'Work/Life Balance',
  'Grief & Loss',
  'Loneliness',
  'Just Need to Talk',
];

export default function SessionsScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const session = useSession();
  const [localConcerns, setLocalConcerns] = useState<string[]>([]);

  const displayName = (user?.displayName as string) || 'there';

  const toggleConcern = (concern: string) => {
    setLocalConcerns(prev =>
      prev.includes(concern) ? prev.filter(c => c !== concern) : [...prev, concern]
    );
  };

  // Error alert
  if (session.errorMessage) {
    Alert.alert('Error', session.errorMessage, [
      { text: 'OK', onPress: session.dismissError },
    ]);
  }

  // Crisis modal
  if (session.crisisResources) {
    return <CrisisModal resources={session.crisisResources} onDismiss={session.dismissCrisis} />;
  }

  // Phase: concern-select
  if (session.phase === 'concern-select') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: c.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: c.textPrimary }]}>{displayName}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.md]}>
            <View style={styles.cardHeader}>
              <Sparkles size={20} color={c.accentPrimary} />
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>New Session</Text>
            </View>
            <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
              What would you like to talk about today?
            </Text>

            <View style={styles.concerns}>
              {CONCERNS.map(concern => {
                const selected = localConcerns.includes(concern);
                return (
                  <TouchableOpacity
                    key={concern}
                    style={[styles.chip, {
                      backgroundColor: selected ? c.accentPrimary + '20' : c.surface,
                      borderColor: selected ? c.accentPrimary : c.border,
                    }]}
                    onPress={() => toggleConcern(concern)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: selected ? c.accentPrimary : c.textSecondary }]}>
                      {concern}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Session goal */}
            <Text style={[styles.goalLabel, { color: c.textSecondary }]}>Session goal (optional)</Text>
            <TextInput
              style={[styles.goalInput, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={session.sessionGoal}
              onChangeText={session.setSessionGoal}
              placeholder="What would you like to achieve today?"
              placeholderTextColor={c.textMuted}
            />

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: c.accentPrimary, opacity: localConcerns.length === 0 ? 0.5 : 1 }]}
                onPress={() => session.completeSessionConcerns(localConcerns)}
                disabled={localConcerns.length === 0}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => session.skipSessionConcerns()} style={styles.skipLink}>
                <SkipForward size={14} color={c.textMuted} />
                <Text style={[styles.skipText, { color: c.textMuted }]}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Phase: prior-session
  if (session.phase === 'prior-session') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={session.goBack} style={styles.backBtn}>
            <ArrowLeft size={18} color={c.textPrimary} />
            <Text style={[styles.backText, { color: c.textPrimary }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.phaseTitle, { color: c.textPrimary }]}>Continue from a prior session?</Text>
          <Text style={[styles.phaseDesc, { color: c.textSecondary }]}>
            Linking a previous session helps Dr. Aria provide continuity in your care.
          </Text>

          {session.priorSessions.slice(0, 5).map((ps: SessionSummary) => (
            <TouchableOpacity
              key={ps.id}
              style={[styles.priorCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
              onPress={() => session.selectPriorSession(ps)}
            >
              <View style={styles.priorCardRow}>
                <Link2 size={16} color={c.accentPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.priorDate, { color: c.textPrimary }]}>
                    {new Date(ps.date).toLocaleDateString()}
                  </Text>
                  {ps.topicsDiscussed.length > 0 && (
                    <Text style={[styles.priorTopics, { color: c.textSecondary }]} numberOfLines={1}>
                      {ps.topicsDiscussed.join(', ')}
                    </Text>
                  )}
                </View>
                <ChevronRight size={16} color={c.textMuted} />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={session.skipPriorSession} style={[styles.skipLink, { marginTop: spacing.lg }]}>
            <SkipForward size={14} color={c.textMuted} />
            <Text style={[styles.skipText, { color: c.textMuted }]}>Start fresh</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Phase: pre-mood
  if (session.phase === 'pre-mood') {
    return <MoodPickerScreen context="pre-session" onSelect={session.selectPreMood} onBack={session.goBack} />;
  }

  // Phase: pre-assessment
  if (session.phase === 'pre-assessment') {
    if (session.viewingResults && session.preAssessmentResult) {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={[styles.phaseTitle, { color: c.textPrimary }]}>Assessment Results</Text>
            <View style={[styles.resultCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <Text style={[styles.resultScore, { color: session.preAssessmentResult.color }]}>
                {session.preAssessmentResult.totalScore}
              </Text>
              <Text style={[styles.resultSeverity, { color: session.preAssessmentResult.color }]}>
                {session.preAssessmentResult.severity}
              </Text>
              <Text style={[styles.resultType, { color: c.textMuted }]}>
                {session.selectedAssessment.title}
              </Text>
              {session.previousAssessmentResult && (
                <Text style={[styles.resultPrev, { color: c.textSecondary }]}>
                  Previous score: {session.previousAssessmentResult.totalScore} ({session.previousAssessmentResult.severity})
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: c.accentPrimary, marginTop: spacing.lg }]}
              onPress={session.confirmPreAssessmentResults}
            >
              <Text style={styles.primaryBtnText}>Continue to Session</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return (
      <AssessmentScreen
        config={session.selectedAssessment}
        timing="pre-session"
        onComplete={session.completePreAssessment}
        onSkip={session.skipPreAssessment}
        onBack={session.goBack}
      />
    );
  }

  // Phase: mode-select
  if (session.phase === 'mode-select') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
        <View style={styles.centerContent}>
          <TouchableOpacity onPress={session.goBack} style={[styles.backBtn, { position: 'absolute', top: spacing.lg, left: spacing.xl }]}>
            <ArrowLeft size={18} color={c.textPrimary} />
            <Text style={[styles.backText, { color: c.textPrimary }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.phaseTitle, { color: c.textPrimary, textAlign: 'center' }]}>Choose Session Mode</Text>
          <Text style={[styles.phaseDesc, { color: c.textSecondary, textAlign: 'center', marginBottom: spacing.xxl }]}>
            How would you like to talk with Dr. Aria?
          </Text>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
            onPress={() => session.selectMode('voice')}
          >
            <View style={[styles.modeIconWrap, { backgroundColor: c.accentPrimary + '15' }]}>
              <Mic size={28} color={c.accentPrimary} />
            </View>
            <Text style={[styles.modeTitle, { color: c.textPrimary }]}>Voice Session</Text>
            <Text style={[styles.modeDesc, { color: c.textSecondary }]}>Speak naturally with Dr. Aria</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
            onPress={() => session.selectMode('chat')}
          >
            <View style={[styles.modeIconWrap, { backgroundColor: c.teal + '15' }]}>
              <MessageCircle size={28} color={c.teal} />
            </View>
            <Text style={[styles.modeTitle, { color: c.textPrimary }]}>Chat Session</Text>
            <Text style={[styles.modeDesc, { color: c.textSecondary }]}>Type your thoughts at your own pace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Phase: ready
  if (session.phase === 'ready') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
        <View style={styles.centerContent}>
          <TouchableOpacity onPress={session.goBack} style={[styles.backBtn, { position: 'absolute', top: spacing.lg, left: spacing.xl }]}>
            <ArrowLeft size={18} color={c.textPrimary} />
            <Text style={[styles.backText, { color: c.textPrimary }]}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.readyIcon, { backgroundColor: c.accentPrimary + '15' }]}>
            {session.sessionMode === 'voice'
              ? <Mic size={40} color={c.accentPrimary} />
              : <MessageCircle size={40} color={c.teal} />
            }
          </View>
          <Text style={[styles.phaseTitle, { color: c.textPrimary, textAlign: 'center' }]}>Ready to Begin</Text>
          <Text style={[styles.phaseDesc, { color: c.textSecondary, textAlign: 'center' }]}>
            {session.sessionMode === 'voice'
              ? 'Dr. Aria will start speaking once you connect. Find a quiet space.'
              : 'Dr. Aria will greet you once connected. Take your time.'}
          </Text>

          {session.preMood && (
            <View style={[styles.readyStat, { borderColor: c.border }]}>
              <Text style={[styles.readyStatLabel, { color: c.textMuted }]}>Pre-session mood</Text>
              <Text style={{ fontSize: 20 }}>{session.preMood.emoji} {session.preMood.label}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: c.accentPrimary }]}
            onPress={session.startSession}
          >
            <Play size={20} color="#FFFFFF" />
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Phase: active
  if (session.phase === 'active') {
    return (
      <ActiveSessionScreen
        mode={session.sessionMode}
        isConnected={session.connectionStatus === 'connected'}
        chatMessages={session.chatMessages}
        onSendMessage={session.sendChatMessage}
        onEnd={session.endSession}
        speakingState={session.speakingState}
        currentAiText={session.currentAiText}
        transcripts={session.transcripts}
        sessionDuration={session.sessionDuration}
        onDurationUpdate={session.onDurationUpdate}
      />
    );
  }

  // Phase: post-mood
  if (session.phase === 'post-mood') {
    return <MoodPickerScreen context="post-session" onSelect={session.selectPostMood} />;
  }

  // Phase: summary
  if (session.phase === 'summary' && session.sessionSummary) {
    return (
      <SummaryScreen
        summary={session.sessionSummary}
        onSaveReflection={session.saveReflection}
        onNewSession={session.newSession}
        onGoHome={session.newSession}
      />
    );
  }

  // Fallback
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.centerContent}>
        <Text style={[styles.phaseTitle, { color: c.textPrimary }]}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: typography.sizes.md },
  name: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  cardDesc: { fontSize: typography.sizes.sm, marginBottom: spacing.lg },
  concerns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  goalLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  goalInput: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.sizes.sm, marginBottom: spacing.lg },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  primaryBtnText: { color: '#FFFFFF', fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  skipLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  skipText: { fontSize: typography.sizes.xs },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  backText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  phaseTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, marginBottom: spacing.sm },
  phaseDesc: { fontSize: typography.sizes.sm, lineHeight: 20, marginBottom: spacing.lg },
  priorCard: { borderRadius: radii.md, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.sm },
  priorCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  priorDate: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  priorTopics: { fontSize: typography.sizes.xs, marginTop: 2 },
  resultCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  resultScore: { fontSize: 48, fontWeight: typography.weights.bold },
  resultSeverity: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  resultType: { fontSize: typography.sizes.xs },
  resultPrev: { fontSize: typography.sizes.xs, marginTop: spacing.md },
  modeCard: { width: '100%', borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  modeIconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  modeTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  modeDesc: { fontSize: typography.sizes.sm },
  readyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  readyStat: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
  readyStatLabel: { fontSize: typography.sizes.xs, marginBottom: spacing.xs },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.xxxl },
  startBtnText: { color: '#FFFFFF', fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
});
