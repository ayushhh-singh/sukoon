import { useState } from 'react';
import { X } from 'lucide-react';
import { notes as notesApi } from '../../services/api';

interface Props {
  patientId: string;
  note: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
}

const NOTE_TYPES = ['general', 'session', 'intake', 'discharge'];

export function NoteEditor({ patientId, note, onSave, onCancel }: Props) {
  const [type, setType] = useState((note?.type as string) || 'general');
  const [title, setTitle] = useState((note?.title as string) || '');
  const [content, setContent] = useState((note?.content as string) || '');
  const [tagsInput, setTagsInput] = useState(((note?.tags as string[]) || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const data = { patientId, type, title: title.trim(), content: content.trim(), tags };

      if (note) {
        await notesApi.update(note.id as string, data);
      } else {
        await notesApi.create(data);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="therapist-modal-overlay" onClick={onCancel}>
      <div className="therapist-modal" onClick={e => e.stopPropagation()}>
        <div className="therapist-modal-header">
          <h3>{note ? 'Edit Note' : 'New Note'}</h3>
          <button className="therapist-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="therapist-form-field">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {NOTE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="therapist-form-field">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" maxLength={200} />
          </div>
          <div className="therapist-form-field">
            <label>Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your note..." rows={6} />
          </div>
          <div className="therapist-form-field">
            <label>Tags (comma-separated)</label>
            <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="anxiety, follow-up, urgent" />
          </div>
          {error && <p className="therapist-form-error">{error}</p>}
          <div className="therapist-form-actions">
            <button type="button" className="therapist-btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="therapist-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
