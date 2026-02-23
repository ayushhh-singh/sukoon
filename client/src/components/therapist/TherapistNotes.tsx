import { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronUp, User } from 'lucide-react';
import { notes as notesApi, doctors as doctorsApi } from '../../services/api';
import { NoteEditor } from './NoteEditor';

interface PatientInfo {
  id: string;
  displayName: string;
}

export function TherapistNotes() {
  const [notesList, setNotesList] = useState<Record<string, unknown>[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState('');
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Record<string, unknown> | null>(null);
  const [editorPatientId, setEditorPatientId] = useState('');
  const [collapsedPatients, setCollapsedPatients] = useState<Set<string>>(new Set());

  async function loadData() {
    try {
      const [nts, pats] = await Promise.all([
        notesApi.list(filterPatient || undefined),
        doctorsApi.getMyPatients(),
      ]);
      setNotesList(nts);
      setPatients(pats.map(p => ({ id: p.id as string, displayName: p.displayName as string })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filterPatient]);

  const patientMap = new Map(patients.map(p => [p.id, p.displayName]));

  const filtered = notesList.filter(n => {
    if (!search) return true;
    const s = search.toLowerCase();
    return ((n.title as string) || '').toLowerCase().includes(s) ||
      (n.content as string).toLowerCase().includes(s);
  });

  // Group by patient when no filter is applied
  const groupedByPatient = new Map<string, Record<string, unknown>[]>();
  filtered.forEach(n => {
    const pid = n.patientId as string;
    if (!groupedByPatient.has(pid)) groupedByPatient.set(pid, []);
    groupedByPatient.get(pid)!.push(n);
  });

  function togglePatientCollapse(patientId: string) {
    setCollapsedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  function openNewNote(patientId: string) {
    setEditorPatientId(patientId);
    setEditingNote(null);
    setShowEditor(true);
  }

  function openEditNote(note: Record<string, unknown>) {
    setEditorPatientId(note.patientId as string);
    setEditingNote(note);
    setShowEditor(true);
  }

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading notes...</div></div>;
  }

  return (
    <div className="therapist-page">
      <div className="therapist-page-header">
        <h1 className="therapist-page-title">Notes</h1>
        {patients.length > 0 && (
          <div className="therapist-add-dropdown">
            <button className="therapist-add-btn" onClick={() => openNewNote(patients[0].id)}>
              <Plus size={14} /> New Note
            </button>
          </div>
        )}
      </div>

      <div className="therapist-filters">
        <div className="therapist-search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="therapist-filter-select"
          value={filterPatient}
          onChange={e => setFilterPatient(e.target.value)}
        >
          <option value="">All Patients</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="therapist-empty">No notes found.</p>
      ) : !filterPatient ? (
        /* Grouped by patient view */
        <div className="therapist-grouped-list">
          {Array.from(groupedByPatient.entries()).map(([patientId, notes]) => {
            const isCollapsed = collapsedPatients.has(patientId);
            return (
              <div key={patientId} className="therapist-patient-group">
                <div className="therapist-patient-group-header" onClick={() => togglePatientCollapse(patientId)}>
                  <div className="therapist-patient-group-info">
                    <User size={16} />
                    <span className="therapist-patient-group-name">{patientMap.get(patientId) || 'Unknown'}</span>
                    <span className="therapist-patient-group-count">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="therapist-patient-group-actions">
                    <button
                      className="therapist-add-btn-small"
                      onClick={(e) => { e.stopPropagation(); openNewNote(patientId); }}
                    >
                      <Plus size={12} />
                    </button>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="therapist-notes-list">
                    {notes.map(n => (
                      <div key={n.id as string} className="therapist-note-card" onClick={() => openEditNote(n)}>
                        <div className="therapist-note-header">
                          <span className={`therapist-note-type ${n.type as string}`}>{n.type as string}</span>
                          <span className="therapist-note-date">
                            {new Date(n.createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <h4 className="therapist-note-title">{n.title as string}</h4>
                        <p className="therapist-note-preview">
                          {(n.content as string).length > 120
                            ? (n.content as string).substring(0, 120) + '...'
                            : (n.content as string)}
                        </p>
                        {(n.tags as string[])?.length > 0 && (
                          <div className="therapist-note-tags">
                            {(n.tags as string[]).map(t => <span key={t} className="therapist-tag">{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list when filtered to single patient */
        <div className="therapist-notes-list">
          {filtered.map(n => (
            <div key={n.id as string} className="therapist-note-card" onClick={() => openEditNote(n)}>
              <div className="therapist-note-header">
                <span className="therapist-note-patient">{patientMap.get(n.patientId as string) || 'Unknown'}</span>
                <span className={`therapist-note-type ${n.type as string}`}>{n.type as string}</span>
                <span className="therapist-note-date">
                  {new Date(n.createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h4 className="therapist-note-title">{n.title as string}</h4>
              <p className="therapist-note-preview">
                {(n.content as string).length > 120
                  ? (n.content as string).substring(0, 120) + '...'
                  : (n.content as string)}
              </p>
              {(n.tags as string[])?.length > 0 && (
                <div className="therapist-note-tags">
                  {(n.tags as string[]).map(t => <span key={t} className="therapist-tag">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <NoteEditor
          patientId={editorPatientId}
          note={editingNote}
          onSave={() => { setShowEditor(false); loadData(); }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
