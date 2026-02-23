import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Activity, TrendingUp, AlertTriangle, Calendar } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { doctors as doctorsApi, sessions as sessionsApi } from '../../services/api';
import { spacing, radii, typography, shadows } from '../../theme';

interface PatientSummary {
  id: string;
  displayName: string;
  sessionCount: number;
  lastSessionDate: string | null;
  avgMoodChange: number;
  latestRiskLevel: string;
}

interface AggregateStats {
  totalPatients: number;
  totalSessions: number;
  avgMoodDelta: number;
  riskDistribution: { low: number; moderate: number; elevated: number };
}

export default function DashboardScreen() {
  const { doctor } = useAuth();
  const { c } = useTheme();
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [recentPatients, setRecentPatients] = useState<PatientSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [patients, allSessions] = await Promise.all([
        doctorsApi.getMyPatients(),
        sessionsApi.list(),
      ]);

      const summaries: PatientSummary[] = patients.map((p: Record<string, unknown>) => {
        const pid = p.id as string;
        const patientSessions = allSessions.filter(
          (s: Record<string, unknown>) => (s.user_id || s.userId) === pid
        );
        const lastSession = patientSessions.length > 0
          ? patientSessions[patientSessions.length - 1]
          : null;

        let avgMoodChange = 0;
        const moodDeltas = patientSessions
          .filter((s: Record<string, unknown>) => s.pre_mood_value != null && s.post_mood_value != null)
          .map((s: Record<string, unknown>) => (s.post_mood_value as number) - (s.pre_mood_value as number));
        if (moodDeltas.length > 0) {
          avgMoodChange = moodDeltas.reduce((a: number, b: number) => a + b, 0) / moodDeltas.length;
        }

        return {
          id: pid,
          displayName: (p.display_name || p.displayName || 'Unknown') as string,
          sessionCount: patientSessions.length,
          lastSessionDate: lastSession ? ((lastSession.date || lastSession.created_at) as string) : null,
          avgMoodChange: Math.round(avgMoodChange * 10) / 10,
          latestRiskLevel: lastSession ? ((lastSession.risk_level || lastSession.riskLevel || 'low') as string) : 'low',
        };
      });

      const riskDist = { low: 0, moderate: 0, elevated: 0 };
      summaries.forEach(s => {
        if (s.latestRiskLevel === 'elevated') riskDist.elevated++;
        else if (s.latestRiskLevel === 'moderate') riskDist.moderate++;
        else riskDist.low++;
      });

      const totalSessions = summaries.reduce((a, b) => a + b.sessionCount, 0);
      const allMoodChanges = summaries.filter(s => s.avgMoodChange !== 0);
      const avgMoodDelta = allMoodChanges.length > 0
        ? allMoodChanges.reduce((a, b) => a + b.avgMoodChange, 0) / allMoodChanges.length
        : 0;

      setStats({
        totalPatients: summaries.length,
        totalSessions,
        avgMoodDelta: Math.round(avgMoodDelta * 10) / 10,
        riskDistribution: riskDist,
      });

      setRecentPatients(
        summaries
          .filter(s => s.lastSessionDate)
          .sort((a, b) => new Date(b.lastSessionDate!).getTime() - new Date(a.lastSessionDate!).getTime())
          .slice(0, 5)
      );
    } catch {
      // silently fail on load
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getRiskColor = (risk: string) => {
    if (risk === 'elevated') return c.rose;
    if (risk === 'moderate') return c.amber;
    return c.green;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentPrimary} />}
      >
        <Text style={[styles.greeting, { color: c.textSecondary }]}>Welcome back,</Text>
        <Text style={[styles.name, { color: c.textPrimary }]}>
          Dr. {(doctor?.displayName as string) || 'Therapist'}
        </Text>

        {loading ? (
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading dashboard...</Text>
        ) : (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}>
                <Users size={20} color={c.accentPrimary} />
                <Text style={[styles.kpiValue, { color: c.textPrimary }]}>{stats?.totalPatients ?? 0}</Text>
                <Text style={[styles.kpiLabel, { color: c.textMuted }]}>Patients</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}>
                <Calendar size={20} color={c.teal} />
                <Text style={[styles.kpiValue, { color: c.textPrimary }]}>{stats?.totalSessions ?? 0}</Text>
                <Text style={[styles.kpiLabel, { color: c.textMuted }]}>Sessions</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}>
                <TrendingUp size={20} color={c.green} />
                <Text style={[styles.kpiValue, { color: (stats?.avgMoodDelta ?? 0) >= 0 ? c.green : c.rose }]}>
                  {(stats?.avgMoodDelta ?? 0) > 0 ? '+' : ''}{stats?.avgMoodDelta ?? 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: c.textMuted }]}>Avg Mood</Text>
              </View>
            </View>

            {/* Risk Distribution */}
            {stats && (
              <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <View style={styles.sectionHeader}>
                  <AlertTriangle size={16} color={c.textSecondary} />
                  <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Risk Distribution</Text>
                </View>
                <View style={styles.riskRow}>
                  <View style={styles.riskItem}>
                    <View style={[styles.riskDot, { backgroundColor: c.green }]} />
                    <Text style={[styles.riskCount, { color: c.textPrimary }]}>{stats.riskDistribution.low}</Text>
                    <Text style={[styles.riskLabel, { color: c.textMuted }]}>Low</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={[styles.riskDot, { backgroundColor: c.amber }]} />
                    <Text style={[styles.riskCount, { color: c.textPrimary }]}>{stats.riskDistribution.moderate}</Text>
                    <Text style={[styles.riskLabel, { color: c.textMuted }]}>Moderate</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={[styles.riskDot, { backgroundColor: c.rose }]} />
                    <Text style={[styles.riskCount, { color: c.textPrimary }]}>{stats.riskDistribution.elevated}</Text>
                    <Text style={[styles.riskLabel, { color: c.textMuted }]}>Elevated</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Recent Patients */}
            {recentPatients.length > 0 && (
              <View style={[styles.section, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <View style={styles.sectionHeader}>
                  <Activity size={16} color={c.textSecondary} />
                  <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Recent Activity</Text>
                </View>
                {recentPatients.map(patient => (
                  <View key={patient.id} style={[styles.patientRow, { borderBottomColor: c.border }]}>
                    <View style={[styles.avatar, { backgroundColor: c.accentPrimary }]}>
                      <Text style={styles.avatarText}>{patient.displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.patientName, { color: c.textPrimary }]}>{patient.displayName}</Text>
                      <Text style={[styles.patientMeta, { color: c.textMuted }]}>
                        {patient.sessionCount} sessions · Last: {patient.lastSessionDate ? new Date(patient.lastSessionDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(patient.latestRiskLevel) + '20' }]}>
                      <Text style={[styles.riskBadgeText, { color: getRiskColor(patient.latestRiskLevel) }]}>
                        {patient.latestRiskLevel}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  greeting: { fontSize: typography.sizes.md },
  name: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, marginBottom: spacing.lg },
  loadingText: { fontSize: typography.sizes.sm, textAlign: 'center', marginTop: spacing.xxxl },
  kpiRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  kpiCard: { flex: 1, alignItems: 'center', gap: 4, padding: spacing.lg, borderRadius: radii.md, borderWidth: 1 },
  kpiValue: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  kpiLabel: { fontSize: typography.sizes.xs },
  section: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  riskRow: { flexDirection: 'row', justifyContent: 'space-around' },
  riskItem: { alignItems: 'center', gap: 4 },
  riskDot: { width: 12, height: 12, borderRadius: 6 },
  riskCount: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  riskLabel: { fontSize: typography.sizes.xs },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: typography.weights.bold, fontSize: typography.sizes.sm },
  patientName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  patientMeta: { fontSize: typography.sizes.xs, marginTop: 2 },
  riskBadge: { borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  riskBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'capitalize' },
});
