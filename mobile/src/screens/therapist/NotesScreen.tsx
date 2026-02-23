import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, FileText, X, Tag, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { notes as notesApi, doctors as doctorsApi } from '../../services/api';
import { spacing, radii, typography, shadows } from '../../theme';

const NOTE_TYPES = ['general', 'session', 'intake', 'discharge'] as const;
type NoteType = (typeof NOTE_TYPES)[number];

interface Note {
  id: string;
  patientId: string;
  patientName: string;
  type: NoteType;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

interface Patient {
  id: string;
  displayName: string;
}

export default function NotesScreen() {
  const { c } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [filterPatient, setFilterPatient] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showPatientFilter, setShowPatientFilter] = useState(false);

  // Editor state
  const [editorType, setEditorType] = useState<NoteType>('general');
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorTags, setEditorTags] = useState('');
  const [editorPatientId, setEditorPatientId] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [rawNotes, rawPatients] = await Promise.all([
        notesApi.list(filterPatient || undefined),
        doctorsApi.getMyPatients(),
      ]);

      const patientList: Patient[] = rawPatients.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        displayName: (p.display_name || p.displayName || 'Unknown') as string,
      }));
      setPatients(patientList);

      const patientMap = new Map(patientList.map(p => [p.id, p.displayName]));

      const noteList: Note[] = rawNotes.map((n: Record<string, unknown>) => {
        const pid = (n.patient_id || n.patientId || '') as string;
        const rawTags = (n.tags || []) as string[] | string;
        const tags = typeof rawTags === 'string' ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : rawTags;
        return {
          id: n.id as string,
          patientId: pid,
          patientName: patientMap.get(pid) || 'Unknown',
          type: (n.type || 'general') as NoteType,
          title: (n.title || '') as string,
          content: (n.content || '') as string,
          tags,
          createdAt: (n.created_at || n.createdAt || '') as string,
        };
      });

      setNotes(noteList);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterPatient]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const openNewNote = () => {
    setEditingNote(null);
    setEditorType('general');
    setEditorTitle('');
    setEditorContent('');
    setEditorTags('');
    setEditorPatientId(patients.length > 0 ? patients[0].id : '');
    setShowEditor(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setEditorType(note.type);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorTags(note.tags.join(', '));
    setEditorPatientId(note.patientId);
    setShowEditor(true);
  };

  const saveNote = async () => {
    if (!editorTitle.trim() || !editorContent.trim()) {
      Alert.alert('Required', 'Title and content are required.');
      return;
    }
    if (!editorPatientId) {
      Alert.alert('Required', 'Please select a patient.');
      return;
    }

    const data = {
      patientId: editorPatientId,
      type: editorType,
      title: editorTitle.trim(),
      content: editorContent.trim(),
      tags: editorTags.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (editingNote) {
        await notesApi.update(editingNote.id, data);
      } else {
        await notesApi.create(data);
      }
      setShowEditor(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  const getTypeColor = (type: NoteType) => {
    switch (type) {
      case 'session': return c.accentPrimary;
      case 'intake': return c.teal;
      case 'discharge': return c.amber;
      default: return c.textSecondary;
    }
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}
      onPress={() => openEditNote(item)}
    >
      <View style={styles.noteHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
        </View>
        <Text style={[styles.noteDate, { color: c.textMuted }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.notePatient, { color: c.textMuted }]}>{item.patientName}</Text>
      <Text style={[styles.noteTitle, { color: c.textPrimary }]}>{item.title}</Text>
      <Text style={[styles.notePreview, { color: c.textSecondary }]} numberOfLines={2}>
        {item.content}
      </Text>
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: c.surface }]}>
              <Text style={[styles.tagText, { color: c.textMuted }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Clinical Notes</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accentPrimary }]} onPress={openNewNote}>
          <Plus size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Search size={16} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes..."
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Patient filter */}
      <TouchableOpacity
        style={[styles.filterBtn, { borderColor: c.border }]}
        onPress={() => setShowPatientFilter(true)}
      >
        <Text style={[styles.filterText, { color: filterPatient ? c.accentPrimary : c.textMuted }]}>
          {filterPatient ? patients.find(p => p.id === filterPatient)?.displayName || 'Patient' : 'All Patients'}
        </Text>
        <ChevronDown size={14} color={c.textMuted} />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Loading notes...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <FileText size={48} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            {search ? 'No matching notes' : 'No notes yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderNote}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentPrimary} />}
        />
      )}

      {/* Patient Filter Modal */}
      <Modal visible={showPatientFilter} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPatientFilter(false)}>
          <View style={[styles.dropdown, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: c.border }]}
              onPress={() => { setFilterPatient(''); setShowPatientFilter(false); loadData(); }}
            >
              <Text style={[styles.dropdownText, { color: !filterPatient ? c.accentPrimary : c.textPrimary }]}>All Patients</Text>
            </TouchableOpacity>
            {patients.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.dropdownItem, { borderBottomColor: c.border }]}
                onPress={() => { setFilterPatient(p.id); setShowPatientFilter(false); }}
              >
                <Text style={[styles.dropdownText, { color: filterPatient === p.id ? c.accentPrimary : c.textPrimary }]}>
                  {p.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Note Editor Modal */}
      <Modal visible={showEditor} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
          <View style={[styles.editorHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.editorTitle, { color: c.textPrimary }]}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <X size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.editorBody} keyboardShouldPersistTaps="handled">
            {/* Patient select */}
            <Text style={[styles.label, { color: c.textSecondary }]}>Patient</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientPicker}>
              {patients.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientChip, {
                    backgroundColor: editorPatientId === p.id ? c.accentPrimary + '20' : c.surface,
                    borderColor: editorPatientId === p.id ? c.accentPrimary : c.border,
                  }]}
                  onPress={() => setEditorPatientId(p.id)}
                >
                  <Text style={[styles.patientChipText, { color: editorPatientId === p.id ? c.accentPrimary : c.textSecondary }]}>
                    {p.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Type select */}
            <Text style={[styles.label, { color: c.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              {NOTE_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, {
                    backgroundColor: editorType === type ? getTypeColor(type) + '20' : c.surface,
                    borderColor: editorType === type ? getTypeColor(type) : c.border,
                  }]}
                  onPress={() => setEditorType(type)}
                >
                  <Text style={[styles.typeChipText, { color: editorType === type ? getTypeColor(type) : c.textSecondary }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: c.textSecondary }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={editorTitle}
              onChangeText={setEditorTitle}
              placeholder="Note title"
              placeholderTextColor={c.textMuted}
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Content</Text>
            <TextInput
              style={[styles.input, styles.contentInput, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={editorContent}
              onChangeText={setEditorContent}
              placeholder="Note content..."
              placeholderTextColor={c.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Tags (comma-separated)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={editorTags}
              onChangeText={setEditorTags}
              placeholder="e.g. anxiety, cbt, follow-up"
              placeholderTextColor={c.textMuted}
            />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accentPrimary }]} onPress={saveNote}>
              <Text style={styles.saveBtnText}>{editingNote ? 'Update Note' : 'Save Note'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: typography.sizes.sm, paddingVertical: spacing.xs },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.xl, marginTop: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, alignSelf: 'flex-start' },
  filterText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  list: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.sizes.sm },
  noteCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  typeBadge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  typeBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'capitalize' },
  noteDate: { fontSize: typography.sizes.xs },
  notePatient: { fontSize: typography.sizes.xs, marginBottom: spacing.xs },
  noteTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  notePreview: { fontSize: typography.sizes.sm, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  tag: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontSize: 10 },
  // Modal overlays
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: spacing.xl },
  dropdown: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  dropdownItem: { padding: spacing.lg, borderBottomWidth: 1 },
  dropdownText: { fontSize: typography.sizes.sm },
  // Editor
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1 },
  editorTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  editorBody: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.md },
  patientPicker: { maxHeight: 40, marginBottom: spacing.sm },
  patientChip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  patientChipText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  typeChip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  typeChipText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  contentInput: { minHeight: 160, textAlignVertical: 'top' },
  saveBtn: { borderRadius: radii.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#FFFFFF', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
});
