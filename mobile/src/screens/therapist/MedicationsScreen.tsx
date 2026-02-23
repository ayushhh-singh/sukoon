import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Pill, X, ChevronDown, Calendar } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { medications as medsApi, doctors as doctorsApi } from '../../services/api';
import { spacing, radii, typography, shadows } from '../../theme';

const FREQUENCIES = ['daily', 'twice daily', 'weekly', 'as needed', 'other'] as const;
const STATUSES = ['active', 'discontinued', 'completed'] as const;
type MedStatus = (typeof STATUSES)[number];

interface Medication {
  id: string;
  patientId: string;
  patientName: string;
  name: string;
  dosage: string;
  frequency: string;
  status: MedStatus;
  startDate: string;
  notes: string;
}

interface Patient {
  id: string;
  displayName: string;
}

export default function MedicationsScreen() {
  const { c } = useTheme();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [showPatientFilter, setShowPatientFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Editor state
  const [editorName, setEditorName] = useState('');
  const [editorDosage, setEditorDosage] = useState('');
  const [editorFrequency, setEditorFrequency] = useState<string>('daily');
  const [editorStatus, setEditorStatus] = useState<MedStatus>('active');
  const [editorNotes, setEditorNotes] = useState('');
  const [editorPatientId, setEditorPatientId] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [rawMeds, rawPatients] = await Promise.all([
        medsApi.list(filterPatient || undefined),
        doctorsApi.getMyPatients(),
      ]);

      const patientList: Patient[] = rawPatients.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        displayName: (p.display_name || p.displayName || 'Unknown') as string,
      }));
      setPatients(patientList);

      const patientMap = new Map(patientList.map(p => [p.id, p.displayName]));

      const medList: Medication[] = rawMeds.map((m: Record<string, unknown>) => {
        const pid = (m.patient_id || m.patientId || '') as string;
        return {
          id: m.id as string,
          patientId: pid,
          patientName: patientMap.get(pid) || 'Unknown',
          name: (m.name || m.medication_name || '') as string,
          dosage: (m.dosage || '') as string,
          frequency: (m.frequency || 'daily') as string,
          status: (m.status || 'active') as MedStatus,
          startDate: (m.start_date || m.startDate || m.created_at || '') as string,
          notes: (m.notes || '') as string,
        };
      });

      setMeds(medList);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterPatient]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filtered = meds.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.dosage.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openNewMed = () => {
    setEditingMed(null);
    setEditorName('');
    setEditorDosage('');
    setEditorFrequency('daily');
    setEditorStatus('active');
    setEditorNotes('');
    setEditorPatientId(patients.length > 0 ? patients[0].id : '');
    setShowEditor(true);
  };

  const openEditMed = (med: Medication) => {
    setEditingMed(med);
    setEditorName(med.name);
    setEditorDosage(med.dosage);
    setEditorFrequency(med.frequency);
    setEditorStatus(med.status);
    setEditorNotes(med.notes);
    setEditorPatientId(med.patientId);
    setShowEditor(true);
  };

  const saveMed = async () => {
    if (!editorName.trim() || !editorDosage.trim()) {
      Alert.alert('Required', 'Name and dosage are required.');
      return;
    }
    if (!editorPatientId) {
      Alert.alert('Required', 'Please select a patient.');
      return;
    }

    const data = {
      patientId: editorPatientId,
      name: editorName.trim(),
      dosage: editorDosage.trim(),
      frequency: editorFrequency,
      status: editorStatus,
      notes: editorNotes.trim(),
      startDate: new Date().toISOString().split('T')[0],
    };

    try {
      if (editingMed) {
        await medsApi.update(editingMed.id, data);
      } else {
        await medsApi.create(data);
      }
      setShowEditor(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to save medication.');
    }
  };

  const getStatusColor = (status: MedStatus) => {
    switch (status) {
      case 'active': return c.green;
      case 'discontinued': return c.rose;
      case 'completed': return c.teal;
    }
  };

  const renderMed = ({ item }: { item: Medication }) => (
    <TouchableOpacity
      style={[styles.medCard, { backgroundColor: c.bgCard, borderColor: c.border }, shadows.sm]}
      onPress={() => openEditMed(item)}
    >
      <View style={styles.medHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.medName, { color: c.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.medPatient, { color: c.textMuted }]}>{item.patientName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.medDetails}>
        <View style={styles.medDetail}>
          <Pill size={12} color={c.textMuted} />
          <Text style={[styles.medDetailText, { color: c.textSecondary }]}>{item.dosage}</Text>
        </View>
        <View style={styles.medDetail}>
          <Calendar size={12} color={c.textMuted} />
          <Text style={[styles.medDetailText, { color: c.textSecondary }]}>{item.frequency}</Text>
        </View>
      </View>
      {item.startDate && (
        <Text style={[styles.medStartDate, { color: c.textMuted }]}>
          Started: {new Date(item.startDate).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Medications</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accentPrimary }]} onPress={openNewMed}>
          <Plus size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Search size={16} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search medications..."
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: c.border }]}
          onPress={() => setShowPatientFilter(true)}
        >
          <Text style={[styles.filterText, { color: filterPatient ? c.accentPrimary : c.textMuted }]}>
            {filterPatient ? patients.find(p => p.id === filterPatient)?.displayName || 'Patient' : 'All Patients'}
          </Text>
          <ChevronDown size={14} color={c.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: c.border }]}
          onPress={() => setShowStatusFilter(true)}
        >
          <Text style={[styles.filterText, { color: filterStatus ? c.accentPrimary : c.textMuted }]}>
            {filterStatus ? filterStatus : 'All Status'}
          </Text>
          <ChevronDown size={14} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Loading medications...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Pill size={48} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            {search || filterStatus ? 'No matching medications' : 'No medications yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderMed}
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
              onPress={() => { setFilterPatient(''); setShowPatientFilter(false); }}
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

      {/* Status Filter Modal */}
      <Modal visible={showStatusFilter} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowStatusFilter(false)}>
          <View style={[styles.dropdown, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: c.border }]}
              onPress={() => { setFilterStatus(''); setShowStatusFilter(false); }}
            >
              <Text style={[styles.dropdownText, { color: !filterStatus ? c.accentPrimary : c.textPrimary }]}>All Status</Text>
            </TouchableOpacity>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.dropdownItem, { borderBottomColor: c.border }]}
                onPress={() => { setFilterStatus(s); setShowStatusFilter(false); }}
              >
                <Text style={[styles.dropdownText, { color: filterStatus === s ? c.accentPrimary : c.textPrimary, textTransform: 'capitalize' }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Medication Editor Modal */}
      <Modal visible={showEditor} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
          <View style={[styles.editorHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.editorTitle, { color: c.textPrimary }]}>
              {editingMed ? 'Edit Medication' : 'New Medication'}
            </Text>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <X size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.editorBody} keyboardShouldPersistTaps="handled">
            {/* Patient select */}
            <Text style={[styles.label, { color: c.textSecondary }]}>Patient</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {patients.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, {
                    backgroundColor: editorPatientId === p.id ? c.accentPrimary + '20' : c.surface,
                    borderColor: editorPatientId === p.id ? c.accentPrimary : c.border,
                  }]}
                  onPress={() => setEditorPatientId(p.id)}
                >
                  <Text style={[styles.chipText, { color: editorPatientId === p.id ? c.accentPrimary : c.textSecondary }]}>
                    {p.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: c.textSecondary }]}>Medication Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={editorName}
              onChangeText={setEditorName}
              placeholder="e.g. Sertraline"
              placeholderTextColor={c.textMuted}
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Dosage</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={editorDosage}
              onChangeText={setEditorDosage}
              placeholder="e.g. 50mg"
              placeholderTextColor={c.textMuted}
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Frequency</Text>
            <View style={styles.chipRow}>
              {FREQUENCIES.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, {
                    backgroundColor: editorFrequency === f ? c.accentPrimary + '20' : c.surface,
                    borderColor: editorFrequency === f ? c.accentPrimary : c.border,
                  }]}
                  onPress={() => setEditorFrequency(f)}
                >
                  <Text style={[styles.chipText, { color: editorFrequency === f ? c.accentPrimary : c.textSecondary }]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: c.textSecondary }]}>Status</Text>
            <View style={styles.chipRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, {
                    backgroundColor: editorStatus === s ? getStatusColor(s) + '20' : c.surface,
                    borderColor: editorStatus === s ? getStatusColor(s) : c.border,
                  }]}
                  onPress={() => setEditorStatus(s)}
                >
                  <Text style={[styles.chipText, { color: editorStatus === s ? getStatusColor(s) : c.textSecondary, textTransform: 'capitalize' }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: c.textSecondary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]}
              value={editorNotes}
              onChangeText={setEditorNotes}
              placeholder="Additional notes..."
              placeholderTextColor={c.textMuted}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accentPrimary }]} onPress={saveMed}>
              <Text style={styles.saveBtnText}>{editingMed ? 'Update Medication' : 'Save Medication'}</Text>
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
  filtersRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.sm, marginBottom: spacing.sm },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1 },
  filterText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  list: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.sizes.sm },
  medCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  medHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  medName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  medPatient: { fontSize: typography.sizes.xs, marginTop: 2 },
  statusBadge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'capitalize' },
  medDetails: { flexDirection: 'row', gap: spacing.lg },
  medDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  medDetailText: { fontSize: typography.sizes.xs },
  medStartDate: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: spacing.xl },
  dropdown: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  dropdownItem: { padding: spacing.lg, borderBottomWidth: 1 },
  dropdownText: { fontSize: typography.sizes.sm },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1 },
  editorTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  editorBody: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.md },
  chipScroll: { maxHeight: 40, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  chipText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { borderRadius: radii.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#FFFFFF', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
});
