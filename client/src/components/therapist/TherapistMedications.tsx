import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { medications as medsApi, doctors as doctorsApi } from '../../services/api';
import { MedicationEditor } from './MedicationEditor';

interface PatientInfo {
  id: string;
  displayName: string;
}

export function TherapistMedications() {
  const [medsList, setMedsList] = useState<Record<string, unknown>[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingMed, setEditingMed] = useState<Record<string, unknown> | null>(null);
  const [editorPatientId, setEditorPatientId] = useState('');

  async function loadData() {
    try {
      const [mds, pats] = await Promise.all([
        medsApi.list(filterPatient || undefined),
        doctorsApi.getMyPatients(),
      ]);
      setMedsList(mds);
      setPatients(pats.map(p => ({ id: p.id as string, displayName: p.displayName as string })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filterPatient]);

  const patientMap = new Map(patients.map(p => [p.id, p.displayName]));

  const filtered = medsList.filter(m => {
    if (filterStatus && (m.status as string) !== filterStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.name as string).toLowerCase().includes(s) ||
      (m.dosage as string).toLowerCase().includes(s);
  });

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading medications...</div></div>;
  }

  return (
    <div className="therapist-page">
      <div className="therapist-page-header">
        <h1 className="therapist-page-title">Medications</h1>
        {patients.length > 0 && (
          <button className="therapist-add-btn" onClick={() => {
            setEditorPatientId(patients[0].id);
            setEditingMed(null);
            setShowEditor(true);
          }}>
            <Plus size={14} /> New Medication
          </button>
        )}
      </div>

      <div className="therapist-filters">
        <div className="therapist-search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search medications..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="therapist-filter-select" value={filterPatient} onChange={e => setFilterPatient(e.target.value)}>
          <option value="">All Patients</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
        <select className="therapist-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="discontinued">Discontinued</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="therapist-empty">No medications found.</p>
      ) : (
        <div className="therapist-meds-grid">
          {filtered.map(m => (
            <div key={m.id as string} className="therapist-med-card" onClick={() => {
              setEditorPatientId(m.patientId as string);
              setEditingMed(m);
              setShowEditor(true);
            }}>
              <div className="therapist-med-header">
                <span className="therapist-med-name">{m.name as string}</span>
                <span className={`therapist-med-status ${m.status as string}`}>{m.status as string}</span>
              </div>
              <div className="therapist-med-patient">{patientMap.get(m.patientId as string) || 'Unknown'}</div>
              <div className="therapist-med-details">
                <span>{m.dosage as string}</span>
                <span>{m.frequency as string}</span>
              </div>
              {!!m.startDate && (
                <div className="therapist-med-date">
                  Since {new Date(m.startDate as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <MedicationEditor
          patientId={editorPatientId}
          medication={editingMed}
          onSave={() => { setShowEditor(false); loadData(); }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
