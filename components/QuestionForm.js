import { useState, useEffect, useRef } from 'react';
import { useDomain } from '../context/DomainContext';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// ── Category Combo Box ────────────────────────────────────────
function CategoryCombo({ value, onChange, categories }) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState(value || '');
  const wrapperRef        = useRef(null);

  useEffect(() => { setInput(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = categories.filter(c =>
    c.toLowerCase().includes(input.toLowerCase()) && c !== input
  );

  const select = (cat) => { setInput(cat); onChange(cat); setOpen(false); };

  const handleInput = (e) => { setInput(e.target.value); onChange(e.target.value); setOpen(true); };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder="e.g. Network Security"
          className="w-full rounded-xl px-4 py-3 pr-9 text-sm font-body transition-all"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden animate-fade-in"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {input.trim() && !categories.includes(input.trim()) && (
            <button
              type="button"
              onClick={() => select(input.trim())}
              className="w-full text-left px-4 py-2.5 text-xs font-body transition-colors flex items-center gap-2"
              style={{ color: 'var(--accent-light)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: 'var(--accent)' }}>+</span>
              Create &quot;{input.trim()}&quot;
            </button>
          )}

          {filtered.length > 0 && (
            <>
              {input.trim() && !categories.includes(input.trim()) && (
                <div className="h-px mx-3" style={{ background: 'var(--border)' }} />
              )}
              {filtered.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => select(cat)}
                  className="w-full text-left px-4 py-2.5 text-xs font-body transition-colors"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {cat}
                </button>
              ))}
            </>
          )}

          {!input.trim() && categories.length === 0 && (
            <p className="px-4 py-3 text-xs font-body" style={{ color: 'var(--muted)' }}>
              No categories yet — type to create one
            </p>
          )}

          {!input.trim() && categories.length > 0 && (
            categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => select(cat)}
                className="w-full text-left px-4 py-2.5 text-xs font-body transition-colors"
                style={cat === value
                  ? { color: 'var(--accent-light)', background: 'var(--accent-subtle)' }
                  : { color: 'var(--text)' }
                }
                onMouseEnter={e => { if (cat !== value) e.currentTarget.style.background = 'var(--border)'; }}
                onMouseLeave={e => { if (cat !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {cat}
                {cat === value && <span className="float-right" style={{ color: 'var(--accent)' }}>✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Question Form Modal ───────────────────────────────────────
export default function QuestionForm({ onSubmit, onClose, initial, categories = [] }) {
  const { domain } = useDomain();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    question:   '',
    answer:     '',
    category:   categories[0] || 'General',
    difficulty: 'Medium',
    tags:       '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        question:   initial.question   || '',
        answer:     initial.answer     || '',
        category:   initial.category   || categories[0] || 'General',
        difficulty: initial.difficulty || 'Medium',
        tags:       (initial.tags || []).join(', '),
      });
    }
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.answer.trim() || !form.category.trim()) return;
    setLoading(true);
    const tags = form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    await onSubmit({ ...form, category: form.category.trim(), tags });
    setLoading(false);
  };

  const accentBg = { background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display text-lg text-white">
              {isEdit ? '✏️ Edit Question' : `+ New ${domain.label} Question`}
            </h2>
            <p className="text-xs mt-0.5 font-body" style={{ color: 'var(--muted)' }}>
              {isEdit ? `Update your ${domain.label} Q&A` : domain.formSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:text-white"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Question */}
          <div>
            <label className="block text-xs font-display mb-2 tracking-wider uppercase" style={{ color: 'var(--accent-light)' }}>
              Question *
            </label>
            <textarea
              value={form.question}
              onChange={e => set('question', e.target.value)}
              placeholder={domain.placeholder.question}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm font-body resize-none transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-xs font-display mb-2 tracking-wider uppercase" style={{ color: 'var(--accent-light)' }}>
              Answer * <span className="normal-case font-body tracking-normal" style={{ color: 'var(--muted)' }}>(Markdown supported)</span>
            </label>
            <textarea
              value={form.answer}
              onChange={e => set('answer', e.target.value)}
              placeholder={domain.placeholder.answer}
              rows={7}
              className="w-full rounded-xl px-4 py-3 text-sm font-code resize-none transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Category + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-display mb-2 tracking-wider uppercase" style={{ color: 'var(--accent-light)' }}>
                Category
                <span className="normal-case font-body tracking-normal ml-1" style={{ color: 'var(--border)' }}>(pick or create)</span>
              </label>
              <CategoryCombo
                value={form.category}
                onChange={v => set('category', v)}
                categories={categories}
              />
            </div>

            <div>
              <label className="block text-xs font-display mb-2 tracking-wider uppercase" style={{ color: 'var(--accent-light)' }}>
                Difficulty
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set('difficulty', d)}
                    className={`flex-1 py-3 rounded-xl border text-xs font-display transition-all ${
                      form.difficulty === d
                        ? d === 'Easy' ? 'badge-easy border' : d === 'Medium' ? 'badge-medium border' : 'badge-hard border'
                        : 'hover:border-[#2A3F5C]'
                    }`}
                    style={form.difficulty !== d ? { borderColor: 'var(--border)', color: 'var(--muted)' } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-display mb-2 tracking-wider uppercase" style={{ color: 'var(--accent-light)' }}>
              Tags <span className="normal-case font-body tracking-normal" style={{ color: 'var(--muted)' }}>(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder={domain.placeholder.tags}
              className="w-full rounded-xl px-4 py-3 text-sm font-body transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border font-display text-sm transition-all hover:text-white"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--muted)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.question.trim() || !form.answer.trim() || !form.category.trim()}
            className="flex-1 py-3 rounded-xl text-white font-display text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-accent"
            style={accentBg}
          >
            {loading ? '...' : isEdit ? 'Save Changes' : `Add ${domain.label} Question`}
          </button>
        </div>
      </div>
    </div>
  );
}
