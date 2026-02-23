import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Users, TrendingUp, TrendingDown, ChevronRight, X, Calendar, Activity } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { doctors as doctorsApi, sessions as sessionsApi } from '../../services/api';
import { spacing, radii, typography, shadows } from '../../theme';

interface PatientSummary {
  id: string;
  displayName: string;
  email: string;
  primaryConcerns: string[];
  age?: number;
  profession?: string;
  sessionCount: number;
  lastSessionDate: string | null;
  avgMoodChange: number;
  latestRiskLevel: string;
  knownDisorders: string[];
  currentMedications: string[];
}

export default function PatientsScreen() {
  const { c } = useTheme();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  const loadPatients = useCallback(async () => {
    try {
      const [rawPatients, allSessions] = await Promise.all([
        doctorsApi.getMyPatients(),
        sessionsApi.list(),
      ]);

      const summaries: PatientSummary[] = rawPatients.map((p: Record<string, unknown>) => {
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

        const concerns = (p.primary_concerns || p.primaryConcerns || []) as string[];
        const disorders = (p.known_disorders || p.knownDisorders || []) as string[];
        const meds = (p.current_medications || p.currentMedications || []) as string[];

        return {
          id: pid,
          displayName: (p.display_name || p.displayName || 'Unknown') as string,
          email: (p.email || '') as string,
          primaryConcerns: Array.isArray(concerns) ? concerns : [],
          age: p.age as number | undefined,
          profession: (p.profession || '') as string,
          sessionCount: patientSessions.length,
          lastSessionDate: lastSession ? ((lastSession.date || lastSession.created_at) as string) : null,
          avgMoodChange: Math.round(avgMoodChange * 10) / 10,
          latestRiskLevel: lastSession ? ((lastSession.risk_level || lastSession.riskLevel || 'low') as string) : 'low',
          knownDisorders: Array.isArray(disorders) ? disorders : [],
          currentMedications: Array.isArray(meds) ? meds : [],
        };
      });

      setPatients(summaries);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const onRefresh = () => { setRefreshing(true); loadPatients(); };

  const filtered = patients.filter(p =>
    p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.primaryConcerns.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  const getRiskColor = (risk: string) => {
    if (risk === 'elevated') return c.rose;
    if (risk === 'moderate') return c.amber;
    return c.green;
  };

  const renderPatient = ({ item }: { item: PatientSummary }) => (
    <TouchableOpacity
      style={[styles.patientCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}
      onPress={() => setSelectedPatient(item)}
    >
      <View style={styles.patientRow}>
        <View style={[styles.avatar, { backgroundColor: c.accentPrimary }]}>
          <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.patientName, { color: c.textPrimary }]}>{item.displayName}</Text>
          {item.primaryConcerns.length > 0 && (
            <Text style={[styles.patientConcerns, { color: c.textMuted }]} numberOfLines={1}>
              {item.primaryConcerns.join(', ')}
            </Text>
          )}
        </View>
        <ChevronRight size={18} color={c.textMuted} />
      </View>

      <View style={styles.patientStats}>
        <View style={styles.miniStat}>
          <Calendar size={12} color={c.textMuted} />
          <Text style={[styles.miniStatText, { color: c.textSecondary }]}>{item.sessionCount} sessions</Text>
        </View>
        <View style={styles.miniStat}>
          {item.avgMoodChange >= 0
            ? <TrendingUp size={12} color={c.green} />
            : <TrendingDown size={12} color={c.rose} />
          }
          <Text style={[styles.miniStatText, { color: item.avgMoodChange >= 0 ? c.green : c.rose }]}>
            {item.avgMoodChange > 0 ? '+' : ''}{item.avgMoodChange}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.latestRiskLevel) + '20' }]}>
          <Text style={[styles.riskBadgeText, { color: getRiskColor(item.latestRiskLevel) }]}>
            {item.latestRiskLevel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Patients</Text>
        <Text style={[styles.count, { color: c.textMuted }]}>{patients.length} total</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Search size={16} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search patients or concerns..."
          placeholderTextColor={c.textMuted}
        />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Loading patients...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Users size={48} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            {search ? 'No matching patients' : 'No linked patients yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentPrimary} />}
        />
      )}

      {/* Patient Detail Modal */}
      <Modal visible={!!selectedPatient} animationType="slide" presentationStyle="pageSheet">
        {selectedPatient && (
          <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{selectedPatient.displayName}</Text>
              <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {/* Profile */}
              <View style={[styles.detailSection, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <Text style={[styles.detailSectionTitle, { color: c.textSecondary }]}>Profile</Text>
                {selectedPatient.age && (
                  <Text style={[styles.detailItem, { color: c.textPrimary }]}>Age: {selectedPatient.age}</Text>
                )}
                {selectedPatient.profession && (
                  <Text style={[styles.detailItem, { color: c.textPrimary }]}>Profession: {selectedPatient.profession}</Text>
                )}
                <Text style={[styles.detailItem, { color: c.textPrimary }]}>Email: {selectedPatient.email}</Text>
              </View>

              {/* Concerns */}
              {selectedPatient.primaryConcerns.length > 0 && (
                <View style={[styles.detailSection, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                  <Text style={[styles.detailSectionTitle, { color: c.textSecondary }]}>Primary Concerns</Text>
                  {selectedPatient.primaryConcerns.map((concern, i) => (
                    <Text key={i} style={[styles.detailItem, { color: c.textPrimary }]}>• {concern}</Text>
                  ))}
                </View>
              )}

              {/* Known Disorders */}
              {selectedPatient.knownDisorders.length > 0 && (
                <View style={[styles.detailSection, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                  <Text style={[styles.detailSectionTitle, { color: c.textSecondary }]}>Known Disorders</Text>
                  {selectedPatient.knownDisorders.map((d, i) => (
                    <Text key={i} style={[styles.detailItem, { color: c.textPrimary }]}>• {d}</Text>
                  ))}
                </View>
              )}

              {/* Medications */}
              {selectedPatient.currentMedications.length > 0 && (
                <View style={[styles.detailSection, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                  <Text style={[styles.detailSectionTitle, { color: c.textSecondary }]}>Current Medications</Text>
                  {selectedPatient.currentMedications.map((m, i) => (
                    <Text key={i} style={[styles.detailItem, { color: c.textPrimary }]}>• {m}</Text>
                  ))}
                </View>
              )}

              {/* Session Stats */}
              <View style={[styles.detailSection, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <Text style={[styles.detailSectionTitle, { color: c.textSecondary }]}>Session Stats</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: c.textPrimary }]}>{selectedPatient.sessionCount}</Text>
                    <Text style={[styles.statLbl, { color: c.textMuted }]}>Sessions</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: selectedPatient.avgMoodChange >= 0 ? c.green : c.rose }]}>
                      {selectedPatient.avgMoodChange > 0 ? '+' : ''}{selectedPatient.avgMoodChange}
                    </Text>
                    <Text style={[styles.statLbl, { color: c.textMuted }]}>Avg Mood</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: getRiskColor(selectedPatient.latestRiskLevel) }]}>
                      {selectedPatient.latestRiskLevel}
                    </Text>
                    <Text style={[styles.statLbl, { color: c.textMuted }]}>Risk</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  count: { fontSize: typography.sizes.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginVertical: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: typography.sizes.sm, paddingVertical: spacing.xs },
  list: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.sizes.sm },
  patientCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: typography.weights.bold, fontSize: typography.sizes.md },
  patientName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  patientConcerns: { fontSize: typography.sizes.xs, marginTop: 2 },
  patientStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: typography.sizes.xs },
  riskBadge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  riskBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'capitalize' },
  // Modal styles
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1 },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  detailScroll: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  detailSection: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  detailSectionTitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  detailItem: { fontSize: typography.sizes.sm, lineHeight: 22, marginBottom: 2 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  statLbl: { fontSize: typography.sizes.xs },
});
