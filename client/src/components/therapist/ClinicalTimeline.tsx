import { useState, useEffect } from 'react';
import { Clock, Calendar, MessageSquare, FileText, Pill, ClipboardList } from 'lucide-react';
import { timeline as timelineApi } from '../../services/api';

interface Props {
  patientId: string;
}

interface TimelineEvent {
  type: 'appointment' | 'session' | 'note' | 'medication' | 'assessment';
  date: string;
  title: string;
  summary: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}

const TYPE_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  appointment: { icon: Calendar, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)', label: 'Appointment' },
  session: { icon: MessageSquare, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', label: 'AI Session' },
  note: { icon: FileText, color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)', label: 'Note' },
  medication: { icon: Pill, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', label: 'Medication' },
  assessment: { icon: ClipboardList, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.12)', label: 'Assessment' },
};

export function ClinicalTimeline({ patientId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['appointment', 'session', 'note', 'medication', 'assessment']));

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await timelineApi.get(patientId);
        setEvents(data as unknown as TimelineEvent[]);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  function toggleFilter(type: string) {
    const next = new Set(activeFilters);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setActiveFilters(next);
  }

  const filtered = events.filter(e => activeFilters.has(e.type));

  // Group by date
  const grouped = new Map<string, TimelineEvent[]>();
  for (const event of filtered) {
    const dateKey = new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(event);
  }

  if (loading) return <div className="therapist-loading">Loading timeline...</div>;

  return (
    <div className="clinical-timeline-view">
      <div className="section-header">
        <h3><Clock size={18} /> Clinical Timeline</h3>
        <span className="timeline-count">{filtered.length} events</span>
      </div>

      <div className="timeline-filters">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const count = events.filter(e => e.type === type).length;
          const isActive = activeFilters.has(type);
          return (
            <button
              key={type}
              className={`timeline-filter-chip ${isActive ? 'active' : ''}`}
              style={{
                '--chip-color': config.color,
                '--chip-bg': config.bg,
              } as React.CSSProperties}
              onClick={() => toggleFilter(type)}
            >
              <config.icon size={13} />
              <span>{config.label}</span>
              {count > 0 && <span className="timeline-filter-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="appointments-empty"><Clock size={32} /><p>No events found</p></div>
      ) : (
        <div className="timeline-track">
          {[...grouped.entries()].map(([dateKey, dayEvents]) => (
            <div key={dateKey} className="timeline-day">
              <div className="timeline-day-header">
                <div className="timeline-day-dot" />
                <span className="timeline-day-label">{dateKey}</span>
              </div>
              <div className="timeline-day-events">
                {dayEvents.map((event, i) => {
                  const config = TYPE_CONFIG[event.type];
                  const Icon = config.icon;
                  return (
                    <div key={i} className="timeline-event-card" style={{ '--event-color': config.color, '--event-bg': config.bg } as React.CSSProperties}>
                      <div className="timeline-event-line" />
                      <div className="timeline-event-icon">
                        <Icon size={14} />
                      </div>
                      <div className="timeline-event-body">
                        <div className="timeline-event-top">
                          <span className="timeline-event-type">{config.label}</span>
                          <span className="timeline-event-time">
                            {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="timeline-event-title">{event.title}</div>
                        {event.summary && <p className="timeline-event-summary">{event.summary}</p>}
                        {event.metadata && (
                          <div className="timeline-event-tags">
                            {!!event.metadata.riskLevel && (
                              <span className={`timeline-tag timeline-tag-risk-${event.metadata.riskLevel}`}>
                                {event.metadata.riskLevel as string} risk
                              </span>
                            )}
                            {!!event.metadata.severity && (
                              <span className="timeline-tag">{event.metadata.severity as string}</span>
                            )}
                            {!!event.metadata.status && event.type === 'appointment' && (
                              <span className="timeline-tag">{event.metadata.status as string}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
