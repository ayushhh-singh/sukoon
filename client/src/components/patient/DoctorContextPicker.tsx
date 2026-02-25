import { useState, useEffect, useCallback } from 'react';
import { doctors as doctorsApi, notes as notesApi, medications as medsApi, treatmentPlans as tpApi, safetyPlans as spApi, formulations as fApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, User, FileText, Pill, Target, Shield, Brain, ChevronRight, Check, SkipForward } from 'lucide-react';

export interface DoctorContextSelection {
  doctorId: string;
  doctorName: string;
  includeNotes: boolean;
  includeMedications: boolean;
  includeTreatmentPlan: boolean;
  includeSafetyPlan: boolean;
  includeFormulation: boolean;
}

export interface FetchedDoctorContext {
  doctorId: string;
  doctorName: string;
  notes: Array<{ title: string; content: string; noteType: string; createdAt: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string; adherencePct: number | null }>;
  treatmentPlan: {
    title: string;
    diagnosis: string;
    goals: Array<{ title: string; interventions: string[]; progress: number }>;
  } | null;
  safetyPlan: {
    warningSigns: string[];
    copingStrategies: string[];
    reasonsForLiving: string[];
  } | null;
  formulation: {
    presentingProblems: string[];
    predisposingFactors: string[];
    precipitatingFactors: string[];
    perpetuatingFactors: string[];
    protectiveFactors: string[];
    formulationSummary: string;
  } | null;
}

interface LinkedDoctor {
  id: string;
  displayName: string;
  specializations: string[];
  experienceYears: number | null;
}

interface DoctorContextPickerProps {
  onSelect: (selection: DoctorContextSelection, fetchedContext: FetchedDoctorContext) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function DoctorContextPicker({ onSelect, onSkip, onBack }: DoctorContextPickerProps) {
  const { user } = useAuth();
  const [linkedDoctors, setLinkedDoctors] = useState<LinkedDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<LinkedDoctor | null>(null);
  const [fetchingContext, setFetchingContext] = useState(false);

  // Data counts for selected doctor
  const [dataCounts, setDataCounts] = useState<{
    notes: number;
    medications: number;
    treatmentPlan: boolean;
    safetyPlan: boolean;
    formulation: boolean;
  }>({ notes: 0, medications: 0, treatmentPlan: false, safetyPlan: false, formulation: false });

  // Toggles
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeTreatmentPlan, setIncludeTreatmentPlan] = useState(true);
  const [includeSafetyPlan, setIncludeSafetyPlan] = useState(true);
  const [includeFormulation, setIncludeFormulation] = useState(true);

  // Raw fetched data for selected doctor
  const [rawNotes, setRawNotes] = useState<Record<string, unknown>[]>([]);
  const [rawMeds, setRawMeds] = useState<Record<string, unknown>[]>([]);
  const [rawTreatmentPlan, setRawTreatmentPlan] = useState<Record<string, unknown> | null>(null);
  const [rawSafetyPlan, setRawSafetyPlan] = useState<Record<string, unknown> | null>(null);
  const [rawFormulation, setRawFormulation] = useState<Record<string, unknown> | null>(null);

  // Fetch linked doctors
  useEffect(() => {
    async function load() {
      try {
        const docs = await doctorsApi.getMyLinkedDoctors();
        setLinkedDoctors(docs.map(d => ({
          id: d.id as string,
          displayName: d.displayName as string,
          specializations: (d.specializations || []) as string[],
          experienceYears: (d.experienceYears || null) as number | null,
        })));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Fetch data counts when doctor is selected
  const fetchDoctorData = useCallback(async (doctor: LinkedDoctor) => {
    if (!user) return;
    setFetchingContext(true);
    const patientId = user.id as string;

    try {
      const [notesData, medsData, tpData, spData, fData] = await Promise.allSettled([
        notesApi.list(),
        medsApi.list(),
        tpApi.list(patientId),
        spApi.get(patientId),
        fApi.get(patientId),
      ]);

      // Filter notes by this doctor
      const allNotes = notesData.status === 'fulfilled' ? notesData.value : [];
      const doctorNotes = allNotes.filter(n => n.doctorId === doctor.id);
      setRawNotes(doctorNotes);

      // Filter medications by this doctor
      const allMeds = medsData.status === 'fulfilled' ? medsData.value : [];
      const doctorMeds = allMeds.filter(m => m.doctorId === doctor.id && m.status === 'active');
      setRawMeds(doctorMeds);

      // Treatment plans from this doctor
      const allPlans = tpData.status === 'fulfilled' ? tpData.value : [];
      const activePlan = allPlans.find(p => p.doctorId === doctor.id && p.status === 'active') || null;
      setRawTreatmentPlan(activePlan);

      // Safety plan (active)
      const sp = spData.status === 'fulfilled' ? spData.value : null;
      const doctorSp = sp && (sp as Record<string, unknown>).doctorId === doctor.id ? sp : null;
      setRawSafetyPlan(doctorSp);

      // Formulation
      const form = fData.status === 'fulfilled' ? fData.value : null;
      const doctorForm = form && (form as Record<string, unknown>).doctorId === doctor.id ? form : null;
      setRawFormulation(doctorForm);

      setDataCounts({
        notes: doctorNotes.length,
        medications: doctorMeds.length,
        treatmentPlan: !!activePlan,
        safetyPlan: !!doctorSp,
        formulation: !!doctorForm,
      });
    } catch {
      // ignore
    } finally {
      setFetchingContext(false);
    }
  }, [user]);

  function handleSelectDoctor(doctor: LinkedDoctor) {
    setSelectedDoctor(doctor);
    fetchDoctorData(doctor);
  }

  function handleConfirm() {
    if (!selectedDoctor) return;

    const selection: DoctorContextSelection = {
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.displayName,
      includeNotes,
      includeMedications,
      includeTreatmentPlan,
      includeSafetyPlan,
      includeFormulation,
    };

    // Build the fetched context
    const fetchedContext: FetchedDoctorContext = {
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.displayName,
      notes: includeNotes ? rawNotes.slice(0, 5).map(n => ({
        title: (n.title || 'Untitled') as string,
        content: (n.content || '') as string,
        noteType: (n.noteType || 'general') as string,
        createdAt: (n.createdAt || '') as string,
      })) : [],
      medications: includeMedications ? rawMeds.map(m => ({
        name: (m.name || '') as string,
        dosage: (m.dosage || '') as string,
        frequency: (m.frequency || '') as string,
        adherencePct: (m.adherencePct ?? null) as number | null,
      })) : [],
      treatmentPlan: (includeTreatmentPlan && rawTreatmentPlan) ? {
        title: (rawTreatmentPlan.title || '') as string,
        diagnosis: (rawTreatmentPlan.diagnosis || '') as string,
        goals: ((rawTreatmentPlan.goals || []) as Record<string, unknown>[]).map(g => ({
          title: (g.title || '') as string,
          interventions: (g.interventions || []) as string[],
          progress: (g.progress || 0) as number,
        })),
      } : null,
      safetyPlan: (includeSafetyPlan && rawSafetyPlan) ? {
        warningSigns: (rawSafetyPlan.warningSigns || []) as string[],
        copingStrategies: (rawSafetyPlan.copingStrategies || []) as string[],
        reasonsForLiving: (rawSafetyPlan.reasonsForLiving || []) as string[],
      } : null,
      formulation: (includeFormulation && rawFormulation) ? {
        presentingProblems: (rawFormulation.presentingProblems || []) as string[],
        predisposingFactors: (rawFormulation.predisposingFactors || []) as string[],
        precipitatingFactors: (rawFormulation.precipitatingFactors || []) as string[],
        perpetuatingFactors: (rawFormulation.perpetuatingFactors || []) as string[],
        protectiveFactors: (rawFormulation.protectiveFactors || []) as string[],
        formulationSummary: (rawFormulation.formulationSummary || '') as string,
      } : null,
    };

    onSelect(selection, fetchedContext);
  }

  // No linked doctors — auto-skip
  if (!loading && linkedDoctors.length === 0) {
    // Auto-skip if no linked doctors
    return (
      <div className="session-screen">
        <div className="session-header">
          <button className="back-btn" onClick={onBack}><ArrowLeft size={20} /></button>
          <h2>Doctor's Input</h2>
          <p>You don't have any linked doctors yet. You can link a doctor in Settings.</p>
        </div>
        <button className="btn-primary" onClick={onSkip}>
          Continue without doctor's input
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="session-screen">
        <div className="session-header">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // Doctor selection phase
  if (!selectedDoctor) {
    return (
      <div className="session-screen">
        <div className="session-header">
          <button className="back-btn" onClick={onBack}><ArrowLeft size={20} /></button>
          <h2>Include Doctor's Input?</h2>
          <p>Select a doctor to share their clinical notes and treatment plan with the AI psychologist for a more personalized session.</p>
        </div>

        <div className="doctor-context-list">
          {linkedDoctors.map(doc => (
            <button
              key={doc.id}
              className="doctor-context-card"
              onClick={() => handleSelectDoctor(doc)}
            >
              <div className="doctor-context-card-icon">
                <User size={24} />
              </div>
              <div className="doctor-context-card-info">
                <span className="doctor-context-card-name">Dr. {doc.displayName}</span>
                {doc.specializations.length > 0 && (
                  <span className="doctor-context-card-spec">{doc.specializations.join(', ')}</span>
                )}
                {doc.experienceYears && (
                  <span className="doctor-context-card-exp">{doc.experienceYears} years experience</span>
                )}
              </div>
              <ChevronRight size={18} className="doctor-context-card-arrow" />
            </button>
          ))}
        </div>

        <button className="btn-text skip-btn" onClick={onSkip}>
          <SkipForward size={16} />
          Continue without doctor's input
        </button>
      </div>
    );
  }

  // Count how many categories are enabled
  const enabledCount = [
    includeNotes && dataCounts.notes > 0,
    includeMedications && dataCounts.medications > 0,
    includeTreatmentPlan && dataCounts.treatmentPlan,
    includeSafetyPlan && dataCounts.safetyPlan,
    includeFormulation && dataCounts.formulation,
  ].filter(Boolean).length;

  const totalAvailable = [
    dataCounts.notes > 0,
    dataCounts.medications > 0,
    dataCounts.treatmentPlan,
    dataCounts.safetyPlan,
    dataCounts.formulation,
  ].filter(Boolean).length;

  // Data toggle phase
  return (
    <div className="session-screen">
      <div className="session-header">
        <button className="back-btn" onClick={() => setSelectedDoctor(null)}><ArrowLeft size={20} /></button>
        <h2>Share Doctor's Input</h2>
        <p>Select which clinical data from Dr. {selectedDoctor.displayName} to share with the AI for a more personalized session.</p>
      </div>

      {fetchingContext ? (
        <div className="doctor-context-loading">
          <div className="loading-spinner" />
          <span>Loading clinical data...</span>
        </div>
      ) : (
        <>
          {/* Doctor info banner */}
          <div className="dc-doctor-banner">
            <div className="dc-doctor-avatar">
              <User size={20} />
            </div>
            <div className="dc-doctor-banner-info">
              <span className="dc-doctor-banner-name">Dr. {selectedDoctor.displayName}</span>
              <span className="dc-doctor-banner-meta">
                {totalAvailable > 0
                  ? `${totalAvailable} data source${totalAvailable !== 1 ? 's' : ''} available`
                  : 'No clinical data yet'}
              </span>
            </div>
            {totalAvailable > 0 && (
              <div className="dc-selected-badge">
                {enabledCount}/{totalAvailable}
              </div>
            )}
          </div>

          <div className="dc-toggle-grid">
            <ContextCard
              icon={<FileText size={22} />}
              label="Clinical Notes"
              description={dataCounts.notes > 0 ? `${dataCounts.notes} note${dataCounts.notes !== 1 ? 's' : ''} from your sessions` : 'No notes yet'}
              enabled={includeNotes && dataCounts.notes > 0}
              available={dataCounts.notes > 0}
              onToggle={() => setIncludeNotes(!includeNotes)}
              color="#6366f1"
            />
            <ContextCard
              icon={<Pill size={22} />}
              label="Medications"
              description={dataCounts.medications > 0 ? `${dataCounts.medications} active prescription${dataCounts.medications !== 1 ? 's' : ''}` : 'No active medications'}
              enabled={includeMedications && dataCounts.medications > 0}
              available={dataCounts.medications > 0}
              onToggle={() => setIncludeMedications(!includeMedications)}
              color="#10b981"
            />
            <ContextCard
              icon={<Target size={22} />}
              label="Treatment Plan"
              description={dataCounts.treatmentPlan ? 'Active plan with goals' : 'No plan created'}
              enabled={includeTreatmentPlan && dataCounts.treatmentPlan}
              available={dataCounts.treatmentPlan}
              onToggle={() => setIncludeTreatmentPlan(!includeTreatmentPlan)}
              color="#f59e0b"
            />
            <ContextCard
              icon={<Shield size={22} />}
              label="Safety Plan"
              description={dataCounts.safetyPlan ? 'Coping strategies & support' : 'No plan created'}
              enabled={includeSafetyPlan && dataCounts.safetyPlan}
              available={dataCounts.safetyPlan}
              onToggle={() => setIncludeSafetyPlan(!includeSafetyPlan)}
              color="#ef4444"
            />
            <ContextCard
              icon={<Brain size={22} />}
              label="Formulation"
              description={dataCounts.formulation ? '5Ps clinical formulation' : 'Not available'}
              enabled={includeFormulation && dataCounts.formulation}
              available={dataCounts.formulation}
              onToggle={() => setIncludeFormulation(!includeFormulation)}
              color="#8b5cf6"
            />
          </div>
        </>
      )}

      <div className="doctor-context-actions">
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={fetchingContext}
        >
          <Check size={16} />
          {enabledCount > 0 ? `Continue with ${enabledCount} source${enabledCount !== 1 ? 's' : ''}` : 'Continue without input'}
        </button>
        <button className="btn-text skip-btn" onClick={onSkip}>
          <SkipForward size={16} />
          Skip doctor's input
        </button>
      </div>
    </div>
  );
}

// Card-style toggle component
function ContextCard({ icon, label, description, enabled, available, onToggle, color }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  available: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <button
      className={`dc-card ${enabled ? 'dc-card-active' : ''} ${!available ? 'dc-card-disabled' : ''}`}
      onClick={available ? onToggle : undefined}
      disabled={!available}
      style={{ '--dc-color': color } as React.CSSProperties}
    >
      <div className="dc-card-header">
        <div className="dc-card-icon">{icon}</div>
        <div className={`dc-card-check ${enabled ? 'dc-card-check-on' : ''}`}>
          {enabled && <Check size={12} />}
        </div>
      </div>
      <div className="dc-card-body">
        <span className="dc-card-label">{label}</span>
        <span className="dc-card-desc">{description}</span>
      </div>
    </button>
  );
}
