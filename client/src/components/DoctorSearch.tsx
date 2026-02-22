import { useState, useEffect, useRef } from 'react';
import { doctors as doctorsApi } from '../services/api';
import { Search, X, UserPlus, Stethoscope } from 'lucide-react';

interface DoctorResult {
  id: string;
  username: string;
  displayName: string;
  specializations: string[];
  experienceYears: number | null;
  qualifications: string | null;
  acceptingPatients: number;
}

interface LinkedDoctor {
  id: string;
  username: string;
  displayName: string;
}

interface DoctorSearchProps {
  linkedDoctors: LinkedDoctor[];
  onLink: (doctorId: string) => Promise<void>;
  onUnlink: (doctorId: string) => Promise<void>;
}

export function DoctorSearch({ linkedDoctors, onLink, onUnlink }: DoctorSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DoctorResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await doctorsApi.search(query.trim());
        setResults(data as unknown as DoctorResult[]);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLink = async (doctor: DoctorResult) => {
    if (linkedDoctors.some(d => d.id === doctor.id)) {
      setError('Already linked');
      return;
    }
    try {
      await onLink(doctor.id);
      setQuery('');
      setShowDropdown(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link');
    }
  };

  const isLinked = (id: string) => linkedDoctors.some(d => d.id === id);

  return (
    <div className="doctor-search" ref={containerRef}>
      <label className="doctor-search-label">My Doctors</label>

      {/* Linked doctors list */}
      {linkedDoctors.length > 0 && (
        <div className="doctor-linked-list">
          {linkedDoctors.map(d => (
            <div key={d.id} className="doctor-linked-chip">
              <Stethoscope size={12} />
              <span>{d.displayName}</span>
              <button onClick={() => onUnlink(d.id)} title="Remove">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="doctor-search-input-wrap">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search doctors by name or username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {isSearching && <span className="doctor-search-spinner" />}
      </div>

      {error && <p className="doctor-search-error">{error}</p>}

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div className="doctor-search-dropdown">
          {results.map(doc => (
            <div
              key={doc.id}
              className={`doctor-search-result ${isLinked(doc.id) ? 'linked' : ''}`}
              onClick={() => !isLinked(doc.id) && handleLink(doc)}
            >
              <div className="doctor-result-avatar">
                {doc.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="doctor-result-info">
                <span className="doctor-result-name">{doc.displayName}</span>
                <span className="doctor-result-username">@{doc.username}</span>
                {doc.specializations.length > 0 && (
                  <span className="doctor-result-specs">
                    {doc.specializations.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
              {isLinked(doc.id) ? (
                <span className="doctor-result-linked-badge">Linked</span>
              ) : (
                <UserPlus size={16} className="doctor-result-add" />
              )}
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.trim().length >= 2 && results.length === 0 && !isSearching && (
        <div className="doctor-search-dropdown">
          <div className="doctor-search-empty">No doctors found</div>
        </div>
      )}
    </div>
  );
}
