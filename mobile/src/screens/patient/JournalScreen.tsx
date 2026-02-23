import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Search } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { journal as journalApi } from '../../services/api';
import { formatSessionDate } from '../../utils/format';
import { JOURNAL_TEMPLATES } from '../../types/journal';
import { spacing, radii, typography, shadows } from '../../theme';

export default function JournalScreen() {
  const { c } = useTheme();
  const [tab, setTab] = useState<'new' | 'past'>('past');
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('free');

  const loadEntries = useCallback(async () => {
    try {
      const data = searchQuery
        ? await journalApi.search(searchQuery)
        : await journalApi.list();
      setEntries(data);
    } catch {}
  }, [searchQuery]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write something before saving.');
      return;
    }
    try {
      await journalApi.create({
        date: new Date().toISOString(),
        title: title.trim() || 'Untitled Entry',
        content: content.trim(),
        templateUsed: selectedTemplate,
      });
      setTitle('');
      setContent('');
      setTab('past');
      loadEntries();
    } catch {
      Alert.alert('Error', 'Failed to save journal entry.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await journalApi.remove(id);
            loadEntries();
          } catch {}
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Journal</Text>

      <View style={styles.tabs}>
        {(['past', 'new'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tab,
              {
                backgroundColor: tab === t ? c.accentPrimary : c.surface,
              },
            ]}
            onPress={() => setTab(t)}
          >
            <Text style={{ color: tab === t ? '#FFFFFF' : c.textSecondary, fontWeight: '600', fontSize: 14 }}>
              {t === 'new' ? 'New Entry' : 'Past Entries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'new' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <View style={[styles.editorCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={styles.templateRow}>
              {JOURNAL_TEMPLATES.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl.id}
                  style={[
                    styles.templateChip,
                    {
                      backgroundColor: selectedTemplate === tmpl.id ? c.accentPrimary + '20' : c.surface,
                      borderColor: selectedTemplate === tmpl.id ? c.accentPrimary : c.border,
                    },
                  ]}
                  onPress={() => setSelectedTemplate(tmpl.id)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: selectedTemplate === tmpl.id ? c.accentPrimary : c.textSecondary,
                    }}
                  >
                    {tmpl.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Title (optional)"
              placeholderTextColor={c.textMuted}
            />
            <TextInput
              style={[styles.contentInput, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your thoughts..."
              placeholderTextColor={c.textMuted}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.accentPrimary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>
          <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Search size={18} color={c.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: c.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search entries..."
              placeholderTextColor={c.textMuted}
            />
          </View>
          <FlatList
            data={entries}
            keyExtractor={(item) => (item.id as string)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.entryCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}>
                <View style={styles.entryHeader}>
                  <View style={styles.flex}>
                    <Text style={[styles.entryTitle, { color: c.textPrimary }]}>
                      {(item.title as string) || 'Untitled'}
                    </Text>
                    <Text style={[styles.entryDate, { color: c.textMuted }]}>
                      {item.date ? formatSessionDate(item.date as string) : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id as string)}>
                    <Trash2 size={18} color={c.rose} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.entryContent, { color: c.textSecondary }]} numberOfLines={3}>
                  {item.content as string}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No journal entries yet</Text>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  editorCard: {
    margin: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    minHeight: 160,
  },
  saveBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: typography.sizes.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  list: {
    padding: spacing.xl,
    paddingTop: 0,
    gap: spacing.md,
  },
  entryCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  entryTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  entryDate: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  entryContent: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xxxl,
    fontSize: typography.sizes.md,
  },
});
