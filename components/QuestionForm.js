import { useState, useEffect, useRef } from 'react';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// ── Category Combo Box ────────────────────────────────────────
// Shows existing categories as a dropdown, but also lets you
// type a brand-new one freely — fully self-managing.
function CategoryCombo({ value, onChange, categories }) {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState(value || '');
  const wrapperRef            = useRef(null);

  // Sync input when parent changes value (e.g. edit mode)
  useEffect(() => { setInput(value || ''); }, [value]);

  // Close on outside click
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

  const select = (cat) => {
    setInput(cat);
    onChange(cat);
    setOpen(false);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder="e.g. State Management"
          className="w-full bg-[#0E1621] border border-[#1E2D42] rounded-xl px-4 py-3 pr-9 text-[#E8EEF7] placeholder-[#3A4F6B] font-body text-sm transition-all"
        />
        {/* Chevron */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A4F6B] hover:text-[#8B9BB4] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-[#1E2D42] bg-[#151F2E] overflow-hidden animate-fade-in"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '220px', overflowY: 'auto' }}
        >
          {/* "Create new" option when input doesn't match any existing */}
          {input.trim() && !categories.includes(input.trim()) && (
            <button
              type="button"
              onClick={() => select(input.trim())}
              className="w-full text-left px-4 py-2.5 text-xs font-body text-[#54C5F8] hover:bg-[#027DFD]/10 transition-colors flex items-center gap-2"
            >
              <span className="text-[#027DFD]">+</span>
              Create &quot;{input.trim()}&quot;
            </button>
          )}

          {/* Existing categories */}
          {filtered.length > 0 && (
            <>
              {input.trim() && !categories.includes(input.trim()) && (
                <div className="h-px bg-[#1E2D42] mx-3" />
              )}
              {filtered.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => select(cat)}
                  className="w-full text-left px-4 py-2.5 text-xs font-body text-[#E8EEF7] hover:bg-[#1E2D42] transition-colors"
                >
                  {cat}
                </button>
              ))}
            </>
          )}

          {/* No match and no input */}
          {!input.trim() && categories.length === 0 && (
            <p className="px-4 py-3 text-xs text-[#8B9BB4] font-body">
              No categories yet — type to create one
            </p>
          )}

          {/* All categories when input is empty */}
          {!input.trim() && categories.length > 0 && (
            categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => select(cat)}
                className={`w-full text-left px-4 py-2.5 text-xs font-body transition-colors ${
                  cat === value
                    ? 'text-[#54C5F8] bg-[#027DFD]/10'
                    : 'text-[#E8EEF7] hover:bg-[#1E2D42]'
                }`}
              >
                {cat}
                {cat === value && <span className="float-right text-[#027DFD]">✓</span>}
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

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#151F2E] border border-[#1E2D42] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E2D42]">
          <div>
            <h2 className="font-display text-lg text-white">
              {isEdit ? '✏️ Edit Question' : '+ New Question'}
            </h2>
            <p className="text-xs text-[#8B9BB4] mt-0.5 font-body">
              {isEdit ? 'Update your interview Q&A' : 'Add to your Flutter knowledge base'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B9BB4] hover:text-white hover:bg-[#1E2D42] transition-colors"
          >✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Question */}
          <div>
            <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
              Question *
            </label>
            <textarea
              value={form.question}
              onChange={e => set('question', e.target.value)}
              placeholder="e.g. What is the difference between StatelessWidget and StatefulWidget?"
              rows={3}
              className="w-full bg-[#0E1621] border border-[#1E2D42] rounded-xl px-4 py-3 text-[#E8EEF7] placeholder-[#3A4F6B] font-body text-sm resize-none transition-all"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
              Answer * <span className="normal-case text-[#8B9BB4] font-body tracking-normal">(Markdown supported)</span>
            </label>
            <textarea
              value={form.answer}
              onChange={e => set('answer', e.target.value)}
              placeholder="Write your answer here. You can use **bold**, `code`, and ```code blocks```"
              rows={7}
              className="w-full bg-[#0E1621] border border-[#1E2D42] rounded-xl px-4 py-3 text-[#E8EEF7] placeholder-[#3A4F6B] font-code text-sm resize-none transition-all"
            />
          </div>

          {/* Category + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
                Category
                <span className="normal-case text-[#3A4F6B] font-body tracking-normal ml-1">(pick or create)</span>
              </label>
              <CategoryCombo
                value={form.category}
                onChange={v => set('category', v)}
                categories={categories}
              />
            </div>

            <div>
              <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
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
                        : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
              Tags <span className="normal-case text-[#8B9BB4] font-body tracking-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="e.g. state, widgets, lifecycle"
              className="w-full bg-[#0E1621] border border-[#1E2D42] rounded-xl px-4 py-3 text-[#E8EEF7] placeholder-[#3A4F6B] font-body text-sm transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#1E2D42] text-[#8B9BB4] hover:text-white hover:border-[#2A3F5C] font-display text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.question.trim() || !form.answer.trim() || !form.category.trim()}
            className="flex-1 py-3 rounded-xl bg-[#027DFD] hover:bg-[#0068D8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display text-sm transition-all glow-blue"
          >
            {loading ? '...' : isEdit ? 'Save Changes' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
