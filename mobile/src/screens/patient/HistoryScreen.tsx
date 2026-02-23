import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { sessions as sessionsApi } from '../../services/api';
import { formatDuration, formatSessionDate } from '../../utils/format';
import { spacing, radii, typography, shadows } from '../../theme';

export default function HistoryScreen() {
  const { c } = useTheme();
  const [sessionList, setSessionList] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    sessionsApi.list()
      .then(setSessionList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getRiskColor = (risk: string) => {
    if (risk === 'elevated') return c.rose;
    if (risk === 'moderate') return c.amber;
    return c.green;
  };

  const renderSession = ({ item }: { item: Record<string, unknown> }) => {
    const id = item.session_id as string || item.id as string;
    const expanded = expandedId === id;
    const date = (item.date || item.created_at) as string;
    const duration = item.duration as number;
    const riskLevel = (item.risk_level || 'low') as string;
    const takeaways = (item.key_takeaways || []) as string[];
    const strategies = (item.coping_strategies || []) as string[];
    const mode = (item.mode || 'voice') as string;

    return (
      <TouchableOpacity
        style={[styles.sessionCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}
        onPress={() => setExpandedId(expanded ? null : id)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionMeta}>
            <Text style={[styles.sessionDate, { color: c.textPrimary }]}>
              {date ? formatSessionDate(date) : 'Unknown date'}
            </Text>
            <View style={styles.sessionBadges}>
              {duration > 0 && (
                <View style={[styles.badge, { backgroundColor: c.surface }]}>
                  <Clock size={12} color={c.textMuted} />
                  <Text style={[styles.badgeText, { color: c.textSecondary }]}>
                    {formatDuration(duration)}
                  </Text>
                </View>
              )}
              <View style={[styles.badge, { backgroundColor: getRiskColor(riskLevel) + '20' }]}>
                <Text style={[styles.badgeText, { color: getRiskColor(riskLevel) }]}>
                  {riskLevel}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: c.surface }]}>
                <Text style={[styles.badgeText, { color: c.textSecondary }]}>{mode}</Text>
              </View>
            </View>
          </View>
          {expanded ? (
            <ChevronUp size={20} color={c.textMuted} />
          ) : (
            <ChevronDown size={20} color={c.textMuted} />
          )}
        </View>

        {expanded && (
          <View style={styles.sessionDetails}>
            {takeaways.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Key Takeaways</Text>
                {takeaways.map((t, i) => (
                  <Text key={i} style={[styles.detailItem, { color: c.textPrimary }]}>
                    • {t}
                  </Text>
                ))}
              </View>
            )}
            {strategies.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Coping Strategies</Text>
                {strategies.map((s, i) => (
                  <Text key={i} style={[styles.detailItem, { color: c.textPrimary }]}>
                    • {s}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Session History</Text>
      {loading ? (
        <ActivityIndicator size="large" color={c.accentPrimary} style={styles.loader} />
      ) : sessionList.length === 0 ? (
        <View style={styles.empty}>
          <AlertTriangle size={40} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No sessions yet</Text>
          <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
            Start a session to see your history here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessionList}
          keyExtractor={(item) => (item.session_id || item.id) as string}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  loader: { marginTop: spacing.xxxl },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  sessionCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionMeta: { flex: 1 },
  sessionDate: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  sessionBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  sessionDetails: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F020',
    paddingTop: spacing.lg,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  detailItem: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: 2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
  },
});
