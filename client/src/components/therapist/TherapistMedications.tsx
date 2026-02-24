import { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronUp, User, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Info } from 'lucide-react';
import { medications as medsApi, doctors as doctorsApi } from '../../services/api';
import { MedicationEditor } from './MedicationEditor';
import { DoseLogGrouped } from '../DoseLogGrouped';

interface PatientInfo {
  id: string;
  displayName: string;
}

interface DoseTally {
  medicationId: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

interface DoseLog {
  id: string;
  status: string;
  scheduledTime: string;
  takenAt: string | null;
  notes: string | null;
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
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [medLogs, setMedLogs] = useState<Map<string, DoseLog[]>>(new Map());
  const [loadingLogs, setLoadingLogs] = useState<Set<string>>(new Set());

  async function loadData() {
    try {
      const [mds, pats] = await Promise.all([
        medsApi.list(filterPatient || undefined),
        doctorsApi.getMyPatients(),
      ]);
      setMedsList(mds);
      setPatients(pats.map(p => ({ id: p.id as string, displayName: p.displayName as string })));

      const patientIds = new Set(mds.map(m => m.patientId as string));
      const allTallies = new Map<string, DoseTally>();
      for (const pid of patientIds) {
        try {
          const tData = await medsApi.getAllTallies(pid);
          (tData as unknown as DoseTally[]).forEach(t => allTallies.set(t.medicationId, t));
        } catch { /* ignore */ }
      }
      setTallies(allTallies);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filterPatient]);

  // Load recent logs when a med is expanded
  useEffect(() => {
    if (!expandedMed || medLogs.has(expandedMed)) return;
    setLoadingLogs(prev => new Set(prev).add(expandedMed));
    medsApi.getRecentLogs(expandedMed, 14).then(logs => {
      setMedLogs(prev => new Map(prev).set(expandedMed, logs as unknown as DoseLog[]));
    }).catch(() => {}).finally(() => {
      setLoadingLogs(prev => { const n = new Set(prev); n.delete(expandedMed); return n; });
    });
  }, [expandedMed, medLogs]);

  const patientMap = new Map(patients.map(p => [p.id, p.displayName]));

  const filtered = medsList.filter(m => {
    if (filterStatus && (m.status as string) !== filterStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.name as string).toLowerCase().includes(s) ||
      (m.dosage as string).toLowerCase().includes(s);
  });

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
    } catch { /* ignore */ } finally {
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

  function getDaysUntilEnd(endDate: string | null | undefined): number | null {
    if (!endDate) return null;
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function getPatientAdherence(patientId: string): number | null {
    const patientMeds = medsList.filter(m => m.patientId === patientId && m.status === 'active');
    if (patientMeds.length === 0) return null;
    let totalTaken = 0, totalDoses = 0;
    for (const m of patientMeds) {
      const t = tallies.get(m.id as string);
      if (t && t.total > 0) { totalTaken += t.taken; totalDoses += t.total; }
    }
    return totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : null;
  }

  function renderMedCard(m: Record<string, unknown>, showPatient = false) {
    const medId = m.id as string;
    const tally = tallies.get(medId);
    const adherence = tally && tally.total > 0 ? Math.round((tally.taken / tally.total) * 100) : null;
    const isToggling = togglingStatus.has(medId);
    const isActive = (m.status as string) === 'active';
    const isExpanded = expandedMed === medId;
    const logs = medLogs.get(medId);
    const isLoadingLogs = loadingLogs.has(medId);
    const daysLeft = getDaysUntilEnd(m.endDate as string | null);
    const isEndingSoon = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;
    const hasEnded = daysLeft !== null && daysLeft <= 0;
    const logsWithNotes = logs?.filter(l => l.notes) ?? [];

    return (
      <div key={medId} className={`therapist-med-card ${isExpanded ? 'expanded' : ''}`}>
        {/* Expiry warnings */}
        {hasEnded && isActive && (
          <div className="therapist-med-expiry-banner ended">
            <AlertTriangle size={13} /> Course ended — renewal needed
          </div>
        )}
        {isEndingSoon && !hasEnded && (
          <div className="therapist-med-expiry-banner ending-soon">
            <Clock size={13} /> Ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </div>
        )}

        {/* Card header — clickable to open editor */}
        <div className="therapist-med-card-top" onClick={() => {
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
            {!!m.endDate && (
              <span className="therapist-med-end-date">
                until {new Date(m.endDate as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          {!!m.startDate && (
            <div className="therapist-med-date">
              Since {new Date(m.startDate as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}

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
        </div>

        {/* Actions bar */}
        <div className="therapist-med-actions">
          <button
            className={`therapist-med-toggle-btn ${isActive ? 'deassign' : 'reassign'}`}
            onClick={(e) => handleToggleStatus(medId, m.status as string, e)}
            disabled={isToggling}
          >
            {isToggling ? '...' : isActive ? 'Deassign' : 'Re-assign'}
          </button>
          <button
            className="therapist-med-logs-btn"
            onClick={(e) => { e.stopPropagation(); setExpandedMed(isExpanded ? null : medId); }}
          >
            <FileText size={12} />
            {isExpanded ? 'Hide logs' : 'View patient logs'}
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Expanded: patient dose logs */}
        {isExpanded && (
          <div className="therapist-med-logs-panel">
            {/* Patient info from doctor */}
            {!!m.patientInfo && (
              <div className="therapist-med-patient-info-display">
                <Info size={12} />
                <span><strong>Patient guidance:</strong> {m.patientInfo as string}</span>
              </div>
            )}

            <div className="therapist-med-logs-header">
              <span>Last 14 days of dose logs</span>
              {logsWithNotes.length > 0 && (
                <span className="therapist-med-notes-badge">{logsWithNotes.length} note{logsWithNotes.length !== 1 ? 's' : ''} from patient</span>
              )}
            </div>

            {isLoadingLogs ? (
              <div className="therapist-med-logs-loading">Loading logs...</div>
            ) : !logs || logs.length === 0 ? (
              <div className="therapist-med-logs-empty">No dose logs recorded yet</div>
            ) : (
              <DoseLogGrouped logs={logs} label="Patient dose history" maxDays={14} />
            )}
          </div>
        )}
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
        <div className="therapist-grouped-list">
          {Array.from(groupedByPatient.entries()).map(([patientId, meds]) => {
            const isCollapsed = collapsedPatients.has(patientId);
            const patientAdherence = getPatientAdherence(patientId);
            return (
              <div key={patientId} className="therapist-patient-group">
                <div className="therapist-patient-group-header" onClick={() => togglePatientCollapse(patientId)}>
                  <div className="therapist-patient-group-info">
                    <User size={16} />
                    <span className="therapist-patient-group-name">{patientMap.get(patientId) || 'Unknown'}</span>
                    <span className="therapist-patient-group-count">
                      {meds.filter(m => m.status === 'active').length} active
                    </span>
                    {patientAdherence !== null && (
                      <span className={`therapist-patient-adherence-chip ${patientAdherence >= 75 ? 'good' : patientAdherence >= 50 ? 'warn' : 'bad'}`}>
                        {patientAdherence}% adherence
                      </span>
                    )}
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
