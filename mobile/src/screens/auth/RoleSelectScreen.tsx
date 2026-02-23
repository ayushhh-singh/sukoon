import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserCircle, Stethoscope } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelect'>;

export default function RoleSelectScreen({ navigation }: Props) {
  const { c } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Sukoon</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Your safe space for mental wellness
        </Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
          onPress={() => navigation.navigate('Auth', { role: 'patient' })}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: c.accentPrimary + '15' }]}>
            <UserCircle size={40} color={c.accentPrimary} />
          </View>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>I'm a Patient</Text>
          <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
            Talk to Dr. Aria, track your mood, and explore self-guided exercises
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
          onPress={() => navigation.navigate('Auth', { role: 'doctor' })}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: c.teal + '15' }]}>
            <Stethoscope size={40} color={c.teal} />
          </View>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>I'm a Therapist</Text>
          <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
            Manage patients, write notes, and track progress
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxxl * 2,
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  cards: {
    gap: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  cardDesc: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
