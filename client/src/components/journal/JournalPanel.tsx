import { useState, useMemo } from 'react';
import { X, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { JOURNAL_TEMPLATES } from '../../types/journal';
import { MOOD_OPTIONS } from '../../types/mood';
import type { JournalEntry } from '../../types/journal';

interface JournalPanelProps {
  onClose: () => void;
  isInline?: boolean;
}

export function JournalPanel({ onClose, isInline }: JournalPanelProps) {
  const profileId = StorageService.getActiveProfileId() ?? 'default';
  const [tab, setTab] = useState<'new' | 'past'>('new');

  // New entry state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState<string | undefined>();
  const [moodLabel, setMoodLabel] = useState<string | undefined>();
  const [templateId, setTemplateId] = useState('free');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Past entries state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    StorageService.getJournalEntries(profileId)
  );

  const template = JOURNAL_TEMPLATES.find(t => t.id === templateId);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    return StorageService.searchJournal(profileId, searchQuery);
  }, [entries, searchQuery, profileId]);

  function handleSelectMood(emoji: string, label: string) {
    if (moodTag === emoji) {
      setMoodTag(undefined);
      setMoodLabel(undefined);
    } else {
      setMoodTag(emoji);
      setMoodLabel(label);
    }
  }

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  function handleSave() {
    if (!content.trim()) return;
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      profileId,
      date: new Date().toISOString(),
      title: title.trim() || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      content: content.trim(),
      moodTag,
      moodLabel,
      tags,
      templateUsed: templateId !== 'free' ? templateId : undefined,
    };
    StorageService.saveJournalEntry(entry);
    setEntries(StorageService.getJournalEntries(profileId));
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setTitle('');
      setContent('');
      setMoodTag(undefined);
      setMoodLabel(undefined);
      setTemplateId('free');
      setTags([]);
      setTagInput('');
    }, 1500);
  }

  function handleDelete(entryId: string) {
    StorageService.deleteJournalEntry(profileId, entryId);
    setEntries(StorageService.getJournalEntries(profileId));
    if (expandedId === entryId) setExpandedId(null);
  }

  const panel = (
    <div className={`journal-panel ${isInline ? 'journal-panel-inline' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="journal-header">
        <h2>My Journal</h2>
        {!isInline && <button className="journal-close" onClick={onClose}><X size={20} /></button>}
      </div>

        <div className="journal-tabs">
          <button className={`journal-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
            New Entry
          </button>
          <button className={`journal-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
            Past Entries ({entries.length})
          </button>
        </div>

        <div className="journal-body">
          {tab === 'new' && (
            <div className="journal-new-entry">
              <input
                className="journal-title-input"
                type="text"
                placeholder="Entry title (optional)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />

              <div className="journal-mood-row">
                <span className="journal-label">Mood:</span>
                {MOOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`journal-mood-btn ${moodTag === opt.emoji ? 'selected' : ''}`}
                    onClick={() => handleSelectMood(opt.emoji, opt.label)}
                    title={opt.label}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>

              <div className="journal-template-row">
                <span className="journal-label">Template:</span>
                <select
                  className="journal-template-select"
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                >
                  {JOURNAL_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {template && template.prompts.length > 0 && (
                <div className="journal-prompts">
                  {template.prompts.map((p, i) => (
                    <p key={i} className="journal-prompt">{p}</p>
                  ))}
                </div>
              )}

              <textarea
                className="journal-content-input"
                placeholder="Write your thoughts..."
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={5000}
                rows={8}
              />
              <span className="journal-char-count">{content.length}/5000</span>

              <div className="journal-tags-section">
                <span className="journal-label">Tags:</span>
                <div className="journal-tags-row">
                  {tags.map(tag => (
                    <span key={tag} className="journal-tag-chip">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>&times;</button>
                    </span>
                  ))}
                  <input
                    className="journal-tag-input"
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={handleAddTag}
                    maxLength={30}
                  />
                </div>
              </div>

              <button className="btn-primary journal-save-btn" onClick={handleSave} disabled={!content.trim() || saved}>
                {saved ? 'Saved!' : 'Save Entry'}
              </button>
            </div>
          )}

          {tab === 'past' && (
            <div className="journal-past-entries">
              <div className="journal-search-row">
                <Search size={16} />
                <input
                  className="journal-search-input"
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredEntries.length === 0 && (
                <div className="journal-empty">
                  {searchQuery ? 'No entries match your search.' : 'No journal entries yet. Start writing!'}
                </div>
              )}

              {filteredEntries.map(entry => (
                <div key={entry.id} className="journal-entry-card">
                  <div className="journal-entry-header" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                    <div className="journal-entry-meta">
                      {entry.moodTag && <span className="journal-entry-mood">{entry.moodTag}</span>}
                      <strong>{entry.title}</strong>
                      <span className="journal-entry-date">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {expandedId === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {expandedId !== entry.id && (
                    <p className="journal-entry-preview">{entry.content.slice(0, 120)}{entry.content.length > 120 ? '...' : ''}</p>
                  )}

                  {expandedId === entry.id && (
                    <div className="journal-entry-expanded">
                      <p className="journal-entry-content">{entry.content}</p>
                      {entry.tags.length > 0 && (
                        <div className="journal-entry-tags">
                          {entry.tags.map(t => <span key={t} className="journal-tag-chip readonly">{t}</span>)}
                        </div>
                      )}
                      <button className="journal-delete-btn" onClick={() => handleDelete(entry.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );

  if (isInline) return panel;

  return (
    <div className="journal-overlay" onClick={onClose}>
      {panel}
    </div>
  );
}
