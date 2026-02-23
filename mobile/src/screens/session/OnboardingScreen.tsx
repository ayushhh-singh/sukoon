import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight, ArrowLeft, SkipForward, User, Heart, BookOpen,
  AudioLines, Briefcase, Globe, Stethoscope, ClipboardList, X,
} from 'lucide-react-native';
import type { OnboardingData } from '../../types/session';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography } from '../../theme';

const CONCERN_OPTIONS = [
  'Stress & Overwhelm', 'Anxiety & Worry', 'Low Mood & Depression',
  'Relationship Difficulties', 'Sleep Problems', 'Self-Esteem',
  'Grief & Loss', 'Work/Life Balance', 'Loneliness', 'Just Need to Talk',
];

const LANGUAGE_OPTIONS = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'Rajasthani', label: 'Rajasthani', native: 'राजस्थानी' },
  { code: 'Spanish', label: 'Spanish', native: 'Español' },
  { code: 'French', label: 'French', native: 'Français' },
  { code: 'Arabic', label: 'Arabic', native: 'العربية' },
];

const TOTAL_STEPS = 7;

interface Props {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

export default function OnboardingScreen({ onComplete, onSkip }: Props) {
  const { c } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [disorders, setDisorders] = useState<string[]>([]);
  const [disorderInput, setDisorderInput] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [experience, setExperience] = useState<OnboardingData['therapyExperience'] | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState<'female' | 'male'>('female');

  const toggleConcern = (concern: string) => {
    setConcerns(prev =>
      prev.includes(concern) ? prev.filter(c => c !== concern) : [...prev, concern]
    );
  };

  const addTag = (value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  };

  const handleComplete = () => {
    onComplete({
      preferredName: name.trim() || 'there',
      age: age ? parseInt(age, 10) : undefined,
      profession: profession.trim() || undefined,
      primaryConcerns: concerns,
      therapyExperience: experience || 'none',
      language,
      voicePreference: voice,
      knownDisorders: disorders.length > 0 ? disorders : undefined,
      currentMedications: medications.length > 0 ? medications : undefined,
    });
  };

  const canAdvance = () => {
    if (step === 3) return concerns.length > 0;
    if (step === 4) return experience !== null;
    return true;
  };

  const advance = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const getStepIcon = () => {
    const icons = [
      <User key="user" size={28} color={c.accentPrimary} />,
      <Briefcase key="brief" size={28} color={c.accentPrimary} />,
      <ClipboardList key="clip" size={28} color={c.accentPrimary} />,
      <Heart key="heart" size={28} color={c.accentPrimary} />,
      <BookOpen key="book" size={28} color={c.accentPrimary} />,
      <Globe key="globe" size={28} color={c.accentPrimary} />,
      <AudioLines key="audio" size={28} color={c.accentPrimary} />,
    ];
    return icons[step];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: c.surface }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.accentPrimary }]} />
          </View>
          <Text style={[styles.stepIndicator, { color: c.textMuted }]}>{step + 1} of {TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Icon */}
          <View style={[styles.iconWrap, { backgroundColor: c.accentPrimary + '15' }]}>
            {getStepIcon()}
          </View>

          {/* Step 1: Name */}
          {step === 0 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>What should we call you?</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>This helps Dr. Aria personalize your conversation.</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Your first name (optional)"
                placeholderTextColor={c.textMuted}
                maxLength={30}
                autoFocus
              />
            </>
          )}

          {/* Step 2: Age & Profession */}
          {step === 1 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>A little more about you</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>Helps Dr. Aria provide age-appropriate and relevant guidance.</Text>
              <Text style={[styles.label, { color: c.textSecondary }]}>Age (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={age}
                onChangeText={setAge}
                placeholder="e.g., 28"
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.label, { color: c.textSecondary }]}>Profession (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={profession}
                onChangeText={setProfession}
                placeholder="e.g., Software Engineer, Student"
                placeholderTextColor={c.textMuted}
                maxLength={50}
              />
            </>
          )}

          {/* Step 3: Medical History */}
          {step === 2 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>Medical history</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>
                Helps Dr. Aria provide safer, more informed guidance. All information is confidential.
              </Text>

              <Text style={[styles.label, { color: c.textSecondary }]}>Known diagnoses (optional)</Text>
              <View style={styles.tagsContainer}>
                {disorders.map(d => (
                  <View key={d} style={[styles.tag, { backgroundColor: c.accentPrimary + '20', borderColor: c.accentPrimary }]}>
                    <Text style={[styles.tagText, { color: c.accentPrimary }]}>{d}</Text>
                    <TouchableOpacity onPress={() => setDisorders(prev => prev.filter(x => x !== d))}>
                      <X size={12} color={c.accentPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={disorderInput}
                onChangeText={setDisorderInput}
                placeholder="e.g., ADHD, Anxiety — tap Add"
                placeholderTextColor={c.textMuted}
                onSubmitEditing={() => addTag(disorderInput, disorders, setDisorders, setDisorderInput)}
                returnKeyType="done"
              />
              {disorderInput.trim() ? (
                <TouchableOpacity
                  style={[styles.addTagBtn, { borderColor: c.accentPrimary }]}
                  onPress={() => addTag(disorderInput, disorders, setDisorders, setDisorderInput)}
                >
                  <Text style={[styles.addTagText, { color: c.accentPrimary }]}>+ Add</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={[styles.label, { color: c.textSecondary, marginTop: spacing.lg }]}>Current medications (optional)</Text>
              <View style={styles.tagsContainer}>
                {medications.map(m => (
                  <View key={m} style={[styles.tag, { backgroundColor: c.teal + '20', borderColor: c.teal }]}>
                    <Text style={[styles.tagText, { color: c.teal }]}>{m}</Text>
                    <TouchableOpacity onPress={() => setMedications(prev => prev.filter(x => x !== m))}>
                      <X size={12} color={c.teal} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
                value={medicationInput}
                onChangeText={setMedicationInput}
                placeholder="e.g., Sertraline 50mg — tap Add"
                placeholderTextColor={c.textMuted}
                onSubmitEditing={() => addTag(medicationInput, medications, setMedications, setMedicationInput)}
                returnKeyType="done"
              />
              {medicationInput.trim() ? (
                <TouchableOpacity
                  style={[styles.addTagBtn, { borderColor: c.teal }]}
                  onPress={() => addTag(medicationInput, medications, setMedications, setMedicationInput)}
                >
                  <Text style={[styles.addTagText, { color: c.teal }]}>+ Add</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {/* Step 4: Concerns */}
          {step === 3 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>What brings you here today?</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>Select all that apply.</Text>
              <View style={styles.chips}>
                {CONCERN_OPTIONS.map(concern => {
                  const selected = concerns.includes(concern);
                  return (
                    <TouchableOpacity
                      key={concern}
                      style={[styles.chip, {
                        backgroundColor: selected ? c.accentPrimary + '20' : c.surface,
                        borderColor: selected ? c.accentPrimary : c.border,
                      }]}
                      onPress={() => toggleConcern(concern)}
                    >
                      <Text style={[styles.chipText, { color: selected ? c.accentPrimary : c.textSecondary }]}>
                        {concern}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Step 5: Experience */}
          {step === 4 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>Have you spoken with a therapist before?</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>Helps Dr. Aria adjust the conversation style.</Text>
              {([
                { value: 'none' as const, label: 'No, this is new to me', desc: "We'll take things at a comfortable pace" },
                { value: 'some' as const, label: 'A few times', desc: 'Some familiarity with therapeutic conversations' },
                { value: 'regular' as const, label: 'Yes, regularly', desc: "We can dive deeper into techniques" },
              ]).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, {
                    backgroundColor: experience === opt.value ? c.accentPrimary + '15' : c.bgCard,
                    borderColor: experience === opt.value ? c.accentPrimary : c.border,
                  }]}
                  onPress={() => setExperience(opt.value)}
                >
                  <Text style={[styles.optionTitle, { color: experience === opt.value ? c.accentPrimary : c.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionDesc, { color: c.textSecondary }]}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Step 6: Language */}
          {step === 5 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>Choose your language</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>Dr. Aria will speak and understand you in your preferred language.</Text>
              <View style={styles.langGrid}>
                {LANGUAGE_OPTIONS.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, {
                      backgroundColor: language === lang.code ? c.accentPrimary + '15' : c.bgCard,
                      borderColor: language === lang.code ? c.accentPrimary : c.border,
                    }]}
                    onPress={() => setLanguage(lang.code)}
                  >
                    <Text style={[styles.langLabel, { color: language === lang.code ? c.accentPrimary : c.textPrimary }]}>
                      {lang.label}
                    </Text>
                    <Text style={[styles.langNative, { color: c.textSecondary }]}>{lang.native}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Step 7: Voice */}
          {step === 6 && (
            <>
              <Text style={[styles.title, { color: c.textPrimary }]}>Choose Dr. Aria's voice</Text>
              <Text style={[styles.desc, { color: c.textSecondary }]}>Select the voice you'd feel most comfortable with.</Text>
              <TouchableOpacity
                style={[styles.voiceCard, {
                  backgroundColor: voice === 'female' ? c.accentPrimary + '15' : c.bgCard,
                  borderColor: voice === 'female' ? c.accentPrimary : c.border,
                }]}
                onPress={() => setVoice('female')}
              >
                <AudioLines size={24} color={voice === 'female' ? c.accentPrimary : c.textMuted} />
                <View>
                  <Text style={[styles.voiceTitle, { color: voice === 'female' ? c.accentPrimary : c.textPrimary }]}>Female Voice</Text>
                  <Text style={[styles.voiceDesc, { color: c.textSecondary }]}>Warm & soothing tone</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceCard, {
                  backgroundColor: voice === 'male' ? c.accentPrimary + '15' : c.bgCard,
                  borderColor: voice === 'male' ? c.accentPrimary : c.border,
                }]}
                onPress={() => setVoice('male')}
              >
                <AudioLines size={24} color={voice === 'male' ? c.accentPrimary : c.textMuted} />
                <View>
                  <Text style={[styles.voiceTitle, { color: voice === 'male' ? c.accentPrimary : c.textPrimary }]}>Male Voice</Text>
                  <Text style={[styles.voiceDesc, { color: c.textSecondary }]}>Calm & grounded tone</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Navigation */}
        <View style={[styles.nav, { borderTopColor: c.border }]}>
          <View style={styles.navLeft}>
            {step > 0 && (
              <TouchableOpacity onPress={goBack} style={styles.navBtn}>
                <ArrowLeft size={14} color={c.textSecondary} />
                <Text style={[styles.navBtnText, { color: c.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onSkip} style={styles.navBtn}>
              <SkipForward size={14} color={c.textMuted} />
              <Text style={[styles.navBtnText, { color: c.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: c.accentPrimary, opacity: canAdvance() ? 1 : 0.5 }]}
            onPress={advance}
            disabled={!canAdvance()}
          >
            <Text style={styles.nextBtnText}>{step < TOTAL_STEPS - 1 ? 'Next' : 'Get Started'}</Text>
            {step < TOTAL_STEPS - 1 && <ArrowRight size={16} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  progressContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  progressBar: { height: 4, borderRadius: 2, marginBottom: spacing.xs },
  progressFill: { height: 4, borderRadius: 2 },
  stepIndicator: { fontSize: typography.sizes.xs, textAlign: 'right' },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  iconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, textAlign: 'center', marginBottom: spacing.sm },
  desc: { fontSize: typography.sizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.sizes.sm, marginBottom: spacing.md },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tagText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  addTagBtn: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: 'flex-start', marginBottom: spacing.md },
  addTagText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  optionCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md },
  optionTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  optionDesc: { fontSize: typography.sizes.sm },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  langOption: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', width: '47%' },
  langLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  langNative: { fontSize: typography.sizes.xs, marginTop: 2 },
  voiceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.md },
  voiceTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  voiceDesc: { fontSize: typography.sizes.sm, marginTop: 2 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderTopWidth: 1 },
  navLeft: { flexDirection: 'row', gap: spacing.md },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  navBtnText: { fontSize: typography.sizes.sm },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  nextBtnText: { color: '#FFFFFF', fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
});
