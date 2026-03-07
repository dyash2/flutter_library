import { useState, useEffect } from 'react';

const CATEGORIES = [
  'General', 'Widgets', 'State Management', 'Navigation', 'Async / Dart',
  'Animations', 'Networking', 'Storage', 'Testing', 'Performance', 'Architecture',
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function QuestionForm({ onSubmit, onClose, initial }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: 'General',
    difficulty: 'Medium',
    tags: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        question: initial.question || '',
        answer: initial.answer || '',
        category: initial.category || 'General',
        difficulty: initial.difficulty || 'Medium',
        tags: (initial.tags || []).join(', '),
      });
    }
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setLoading(true);
    const tags = form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    await onSubmit({ ...form, tags });
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

        {/* Form */}
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

          {/* Category + Difficulty row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
                Category
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full bg-[#0E1621] border border-[#1E2D42] rounded-xl px-4 py-3 text-[#E8EEF7] font-body text-sm transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-display text-[#54C5F8] mb-2 tracking-wider uppercase">
                Difficulty
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
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
            disabled={loading || !form.question.trim() || !form.answer.trim()}
            className="flex-1 py-3 rounded-xl bg-[#027DFD] hover:bg-[#0068D8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display text-sm transition-all glow-blue"
          >
            {loading ? '...' : isEdit ? 'Save Changes' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
