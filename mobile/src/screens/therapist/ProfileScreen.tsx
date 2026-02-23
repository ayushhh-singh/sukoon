import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Moon, Sun, Save } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { doctors } from '../../services/api';
import { spacing, radii, typography } from '../../theme';

export default function ProfileScreen() {
  const { doctor, logout, refreshProfile } = useAuth();
  const { c, theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doctor) {
      setDisplayName((doctor.displayName as string) || '');
      setBio((doctor.bio as string) || '');
    }
  }, [doctor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await doctors.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
      });
      await refreshProfile();
      Alert.alert('Success', 'Profile updated.');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Profile</Text>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.themeRow}>
            {theme === 'dark' ? <Moon size={20} color={c.accentPrimary} /> : <Sun size={20} color={c.accentPrimary} />}
            <Text style={[styles.themeLabel, { color: c.textPrimary }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: c.surface, true: c.accentPrimary + '60' }}
              thumbColor={theme === 'dark' ? c.accentPrimary : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Doctor Profile</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Display Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor={c.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
              placeholderTextColor={c.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: c.accentPrimary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Account</Text>
          <Text style={[styles.infoText, { color: c.textMuted }]}>{doctor?.email as string}</Text>
          <Text style={[styles.infoText, { color: c.textMuted }]}>@{doctor?.username as string}</Text>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: c.rose }]} onPress={handleLogout}>
          <LogOut size={18} color={c.rose} />
          <Text style={[styles.logoutText, { color: c.rose }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  themeLabel: { flex: 1, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  multiline: { minHeight: 80 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  infoText: { fontSize: typography.sizes.sm, marginBottom: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  logoutText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});
