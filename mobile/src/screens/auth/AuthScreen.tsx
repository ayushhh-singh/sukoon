import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Auth'>;

export default function AuthScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { login, registerPatient, registerDoctor } = useAuth();
  const { c } = useTheme();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else if (role === 'patient') {
        await registerPatient({
          email: email.trim(),
          password,
          displayName: displayName.trim() || 'Patient',
        });
      } else {
        if (!username.trim()) {
          Alert.alert('Error', 'Username is required for doctors.');
          setLoading(false);
          return;
        }
        await registerDoctor({
          email: email.trim(),
          password,
          displayName: displayName.trim() || 'Doctor',
          username: username.trim().toLowerCase(),
        });
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={c.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: c.textPrimary }]}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {mode === 'login'
              ? `Sign in as ${role === 'patient' ? 'a patient' : 'a therapist'}`
              : `Register as ${role === 'patient' ? 'a patient' : 'a therapist'}`}
          </Text>

          {mode === 'register' && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Display Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={c.textMuted}
              />
            </View>
          )}

          {mode === 'register' && role === 'doctor' && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={username}
                onChangeText={setUsername}
                placeholder="drsmith"
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={c.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: c.accentPrimary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={styles.toggleBtn}
          >
            <Text style={[styles.toggleText, { color: c.accentPrimary }]}>
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.xl,
    width: 40,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xxl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  submitBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
