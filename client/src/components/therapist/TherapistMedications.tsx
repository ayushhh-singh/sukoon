import { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronUp, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { medications as medsApi, doctors as doctorsApi } from '../../services/api';
import { MedicationEditor } from './MedicationEditor';

interface PatientInfo {
  id: string;
  displayName: string;
}

interface DoseTally {
  medication_id: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

export function TherapistMedications() {
  const [medsList, setMedsList] = useState<Record<string, unknown>[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [tallies, setTallies] = useState<Map<string, DoseTally>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingMed, setEditingMed] = useState<Record<string, unknown> | null>(null);
  const [editorPatientId, setEditorPatientId] = useState('');
  const [collapsedPatients, setCollapsedPatients] = useState<Set<string>>(new Set());
  const [togglingStatus, setTogglingStatus] = useState<Set<string>>(new Set());

  async function loadData() {
    try {
      const [mds, pats] = await Promise.all([
        medsApi.list(filterPatient || undefined),
        doctorsApi.getMyPatients(),
      ]);
      setMedsList(mds);
      setPatients(pats.map(p => ({ id: p.id as string, displayName: p.displayName as string })));

      // Load tallies for each patient that has meds
      const patientIds = new Set(mds.map(m => m.patientId as string));
      const allTallies = new Map<string, DoseTally>();
      for (const pid of patientIds) {
        try {
          const tData = await medsApi.getAllTallies(pid);
          (tData as unknown as DoseTally[]).forEach(t => allTallies.set(t.medication_id, t));
        } catch { /* ignore */ }
      }
      setTallies(allTallies);
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

  // Group by patient
  const groupedByPatient = new Map<string, Record<string, unknown>[]>();
  filtered.forEach(m => {
    const pid = m.patientId as string;
    if (!groupedByPatient.has(pid)) groupedByPatient.set(pid, []);
    groupedByPatient.get(pid)!.push(m);
  });

  async function handleToggleStatus(medId: string, currentStatus: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (togglingStatus.has(medId)) return;
    setTogglingStatus(prev => new Set(prev).add(medId));
    try {
      const newStatus = currentStatus === 'active' ? 'discontinued' : 'active';
      await medsApi.update(medId, { status: newStatus });
      await loadData();
    } catch {
      // ignore
    } finally {
      setTogglingStatus(prev => { const next = new Set(prev); next.delete(medId); return next; });
    }
  }

  function togglePatientCollapse(patientId: string) {
    setCollapsedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  function renderMedCard(m: Record<string, unknown>, showPatient = false) {
    const tally = tallies.get(m.id as string);
    const adherence = tally && tally.total > 0 ? Math.round((tally.taken / tally.total) * 100) : null;
    const isToggling = togglingStatus.has(m.id as string);
    const isActive = (m.status as string) === 'active';

    return (
      <div key={m.id as string} className="therapist-med-card" onClick={() => {
        setEditorPatientId(m.patientId as string);
        setEditingMed(m);
        setShowEditor(true);
      }}>
        <div className="therapist-med-header">
          <span className="therapist-med-name">{m.name as string}</span>
          <span className={`therapist-med-status ${m.status as string}`}>{m.status as string}</span>
        </div>
        {showPatient && (
          <div className="therapist-med-patient">{patientMap.get(m.patientId as string) || 'Unknown'}</div>
        )}
        <div className="therapist-med-details">
          <span>{m.dosage as string}</span>
          <span>{m.frequency as string}</span>
        </div>
        {!!m.startDate && (
          <div className="therapist-med-date">
            Since {new Date(m.startDate as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
        {/* Dose adherence tally */}
        {tally && tally.total > 0 && (
          <div className="therapist-med-tally">
            <div className="therapist-med-tally-bar">
              <div className="therapist-med-tally-fill" style={{ width: `${adherence}%` }} />
            </div>
            <div className="therapist-med-tally-stats">
              <span className="tally-taken"><CheckCircle size={12} /> {tally.taken}</span>
              <span className="tally-skipped"><XCircle size={12} /> {tally.skipped}</span>
              <span className="tally-missed"><AlertTriangle size={12} /> {tally.missed}</span>
              <span className="tally-percent">{adherence}%</span>
            </div>
          </div>
        )}
        {/* Quick assign / deassign */}
        <div className="therapist-med-actions">
          <button
            className={`therapist-med-toggle-btn ${isActive ? 'deassign' : 'reassign'}`}
            onClick={(e) => handleToggleStatus(m.id as string, m.status as string, e)}
            disabled={isToggling}
          >
            {isToggling ? '...' : isActive ? 'Deassign' : 'Re-assign'}
          </button>
        </div>
      </div>
    );
  }

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
      ) : !filterPatient ? (
        /* Grouped by patient */
        <div className="therapist-grouped-list">
          {Array.from(groupedByPatient.entries()).map(([patientId, meds]) => {
            const isCollapsed = collapsedPatients.has(patientId);
            return (
              <div key={patientId} className="therapist-patient-group">
                <div className="therapist-patient-group-header" onClick={() => togglePatientCollapse(patientId)}>
                  <div className="therapist-patient-group-info">
                    <User size={16} />
                    <span className="therapist-patient-group-name">{patientMap.get(patientId) || 'Unknown'}</span>
                    <span className="therapist-patient-group-count">
                      {meds.length} medication{meds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="therapist-patient-group-actions">
                    <button
                      className="therapist-add-btn-small"
                      onClick={(e) => { e.stopPropagation(); setEditorPatientId(patientId); setEditingMed(null); setShowEditor(true); }}
                    >
                      <Plus size={12} />
                    </button>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="therapist-meds-grid">
                    {meds.map(m => renderMedCard(m))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat grid when filtered */
        <div className="therapist-meds-grid">
          {filtered.map(m => renderMedCard(m, true))}
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
