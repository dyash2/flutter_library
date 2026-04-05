import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const diffBadge = (d) => {
  if (d === 'Easy') return 'badge-easy';
  if (d === 'Hard') return 'badge-hard';
  return 'badge-medium';
};

export default function QuestionCard({ q, onEdit, onDelete, onToggleFav, isOfflineOnly }) {
  const [expanded, setExpanded]     = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  return (
    <div
      className="q-card rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Card header */}
      <div
        className="p-5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">

            {/* Category + difficulty row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Category badge uses accent CSS vars — changes with theme */}
              <span
                className="text-[10px] font-display px-2 py-0.5 rounded-full tracking-wider uppercase"
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--accent-badge-border)',
                }}
              >
                {q.category}
              </span>

              <span className={`text-[10px] font-display border px-2 py-0.5 rounded-full tracking-wider uppercase ${diffBadge(q.difficulty)}`}>
                {q.difficulty}
              </span>

              {isOfflineOnly && (
                <span className="text-[10px] font-display text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full tracking-wider uppercase">
                  📴 offline
                </span>
              )}
            </div>

            {/* Question text */}
            <p className="font-body font-medium leading-snug text-sm pr-4" style={{ color: 'var(--text)' }}>
              {q.question}
            </p>

            {/* Tags */}
            {q.tags && q.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-3">
                {q.tags.map(tag => (
                  <span
                    key={tag}
                    className="tag-pill text-[10px] font-code px-2 py-0.5 rounded-full"
                    style={{ color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Favourite */}
            <button
              onClick={e => { e.stopPropagation(); onToggleFav(q); }}
              title="Toggle favourite"
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                q.is_favourite
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'hover:text-yellow-400 hover:bg-yellow-400/10'
              }`}
              style={!q.is_favourite ? { color: 'var(--border)' } : {}}
            >
              {q.is_favourite ? '★' : '☆'}
            </button>

            {/* Edit */}
            <button
              onClick={e => { e.stopPropagation(); onEdit(q); }}
              title="Edit"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--accent-light)';
                e.currentTarget.style.background = 'var(--accent-subtle)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--border)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={e => { e.stopPropagation(); setDelConfirm(true); }}
              title="Delete"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--border)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>

            {/* Expand arrow */}
            <div
              className="w-6 h-6 flex items-center justify-center transition-transform duration-300"
              style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Answer expandable */}
      {expanded && (
        <div
          className="border-t px-5 py-4 animate-fade-in"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="text-[10px] font-display tracking-widest uppercase" style={{ color: 'var(--accent-light)' }}>
              Answer
            </span>
          </div>
          <div className="answer-body text-sm">
            <ReactMarkdown className="answer-body" remarkPlugins={[remarkGfm]}>
  {q.answer}
</ReactMarkdown>
          </div>
          {q.created_at && (
            <p className="text-[10px] mt-4 font-code" style={{ color: 'var(--border)' }}>
              Added {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Delete confirm overlay */}
      {delConfirm && (
        <div className="border-t border-red-900/40 bg-red-950/30 px-5 py-4 flex items-center justify-between gap-4 animate-fade-in">
          <p className="text-sm text-red-300 font-body">Delete this question permanently?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDelConfirm(false)}
              className="px-4 py-1.5 rounded-lg border text-xs font-display transition-colors hover:text-white"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >Cancel</button>
            <button
              onClick={() => { setDelConfirm(false); onDelete(q.id); }}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-display transition-colors"
            >Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
