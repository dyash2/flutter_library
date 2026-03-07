import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { supabase } from '../lib/supabaseClient';
import QuestionCard from '../components/QuestionCard';
import QuestionForm from '../components/QuestionForm';
import StatsBar from '../components/StatsBar';

const CATEGORIES = [
  'All', 'General', 'Widgets', 'State Management', 'Navigation',
  'Async / Dart', 'Animations', 'Networking', 'Storage',
  'Testing', 'Performance', 'Architecture',
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'oldest',   label: 'Oldest First' },
  { value: 'easy',     label: 'Easy → Hard' },
  { value: 'hard',     label: 'Hard → Easy' },
  { value: 'favs',     label: 'Favourites First' },
];

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [favOnly, setFavOnly]     = useState(false);
  const [sortBy, setSortBy]       = useState('newest');

  // ── Fetch ──────────────────────────────────────────────
  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load questions');
      console.error(error);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  // ── Add ────────────────────────────────────────────────
  const handleAdd = async (form) => {
    const { error } = await supabase.from('questions').insert([form]);
    if (error) { toast.error('Failed to add question'); return; }
    toast.success('Question added! 🎉');
    setShowForm(false);
    fetchQuestions();
  };

  // ── Edit ───────────────────────────────────────────────
  const handleEdit = async (form) => {
    const { error } = await supabase
      .from('questions')
      .update(form)
      .eq('id', editItem.id);
    if (error) { toast.error('Failed to update question'); return; }
    toast.success('Question updated ✅');
    setEditItem(null);
    fetchQuestions();
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    setQuestions(q => q.filter(x => x.id !== id));
  };

  // ── Toggle Favourite ───────────────────────────────────
  const handleToggleFav = async (q) => {
    const newVal = !q.is_favourite;
    const { error } = await supabase
      .from('questions')
      .update({ is_favourite: newVal })
      .eq('id', q.id);
    if (error) { toast.error('Failed to update favourite'); return; }
    setQuestions(prev =>
      prev.map(x => x.id === q.id ? { ...x, is_favourite: newVal } : x)
    );
    toast(newVal ? '★ Added to favourites' : '☆ Removed from favourites', {
      icon: newVal ? '⭐' : '🗑️',
    });
  };

  // ── Filter + Sort ──────────────────────────────────────
  const filtered = useMemo(() => {
    let arr = [...questions];

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(x =>
        x.question.toLowerCase().includes(q) ||
        x.answer.toLowerCase().includes(q) ||
        (x.tags || []).some(t => t.includes(q))
      );
    }
    if (category !== 'All')    arr = arr.filter(x => x.category === category);
    if (difficulty !== 'All')  arr = arr.filter(x => x.difficulty === difficulty);
    if (favOnly)               arr = arr.filter(x => x.is_favourite);

    const diffOrder = { Easy: 0, Medium: 1, Hard: 2 };
    switch (sortBy) {
      case 'oldest': arr.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'easy':   arr.sort((a,b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]); break;
      case 'hard':   arr.sort((a,b) => diffOrder[b.difficulty] - diffOrder[a.difficulty]); break;
      case 'favs':   arr.sort((a,b) => b.is_favourite - a.is_favourite); break;
      default:       arr.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return arr;
  }, [questions, search, category, difficulty, favOnly, sortBy]);

  const clearFilters = () => {
    setSearch(''); setCategory('All'); setDifficulty('All');
    setFavOnly(false); setSortBy('newest');
  };
  const hasActiveFilter = search || category !== 'All' || difficulty !== 'All' || favOnly;

  return (
    <>
      <Head>
        <title>Flutter Interview Library</title>
        <meta name="description" content="Personal Flutter interview Q&A knowledge base" />
        <link rel="icon" href="/flutter_logo.png" />
      </Head>

      <div className="min-h-screen bg-[#0E1621]">
        {/* ── Top Nav ──────────────────────────────── */}
        <nav className="sticky top-0 z-40 bg-[#0E1621]/90 backdrop-blur-md border-b border-[#1E2D42]">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Flutter logo-ish icon */}
              <div
  className="w-9 h-9 rounded-xl flex items-center justify-center"
  style={{ background: 'linear-gradient(135deg, #027DFD 0%, #54C5F8 100%)' }}
>
  <Image
    src="/flutter_logo.png"
    alt="Flutter Logo"
    width={20}
    height={20}
  />
</div>
              <div>
                <h1 className="font-display text-sm text-white leading-none">
                  Flutter Interview Library
                </h1>
                <p className="text-[10px] text-[#8B9BB4] font-body mt-0.5">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} in your brain
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-[#027DFD] hover:bg-[#0068D8] text-white px-4 py-2 rounded-xl font-display text-sm transition-all glow-blue"
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Add Question</span>
            </button>
          </div>
        </nav>

        {/* ── Main ─────────────────────────────────── */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Stats */}
          {!loading && <StatsBar questions={questions} />}

          {/* Search bar */}
          <div className="relative mb-4">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A4F6B]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions, answers, or tags..."
              className="w-full bg-[#151F2E] border border-[#1E2D42] rounded-xl pl-11 pr-4 py-3 text-[#E8EEF7] placeholder-[#3A4F6B] font-body text-sm transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B9BB4] hover:text-white text-xs"
              >✕</button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Difficulty */}
            {['All', 'Easy', 'Medium', 'Hard'].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-display transition-all ${
                  difficulty === d
                    ? d === 'All' ? 'bg-[#027DFD]/20 border-[#027DFD]/50 text-[#54C5F8]'
                    : d === 'Easy' ? 'badge-easy border' : d === 'Medium' ? 'badge-medium border' : 'badge-hard border'
                    : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C]'
                }`}
              >
                {d}
              </button>
            ))}

            {/* Fav only */}
            <button
              onClick={() => setFavOnly(f => !f)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-display transition-all ${
                favOnly
                  ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400'
                  : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C]'
              }`}
            >
              ★ Favourites
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs bg-[#151F2E] border border-[#1E2D42] rounded-lg px-3 py-1.5 text-[#8B9BB4] font-body transition-all appearance-none cursor-pointer ml-auto"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-[#8B9BB4] hover:text-white border border-[#1E2D42] rounded-lg px-2.5 py-1.5 font-body transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap mb-6 pb-2 overflow-x-auto">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-[11px] px-3 py-1 rounded-full border font-display whitespace-nowrap transition-all ${
                  category === c
                    ? 'bg-[#027DFD]/20 border-[#027DFD]/50 text-[#54C5F8]'
                    : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-xs text-[#8B9BB4] font-body mb-4">
              {filtered.length === questions.length
                ? `${total => total} question${questions.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${questions.length} questions`
              }
              {filtered.length !== questions.length && (
                <span className="text-[#027DFD]"> (filtered)</span>
              )}
            </p>
          )}

          {/* ── Cards ── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#027DFD] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#8B9BB4] font-body text-sm">Loading your library...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">{questions.length === 0 ? '📭' : '🔍'}</div>
              <h3 className="font-display text-white text-lg mb-2">
                {questions.length === 0 ? 'Your library is empty' : 'No questions found'}
              </h3>
              <p className="text-[#8B9BB4] font-body text-sm mb-6">
                {questions.length === 0
                  ? 'Start adding Flutter interview questions you\'ve encountered!'
                  : 'Try different search terms or clear your filters.'}
              </p>
              {questions.length === 0 ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#027DFD] hover:bg-[#0068D8] text-white px-6 py-3 rounded-xl font-display text-sm transition-all glow-blue"
                >
                  + Add Your First Question
                </button>
              ) : (
                <button
                  onClick={clearFilters}
                  className="border border-[#1E2D42] hover:border-[#2A3F5C] text-[#8B9BB4] hover:text-white px-6 py-3 rounded-xl font-display text-sm transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="stagger space-y-3">
              {filtered.map(q => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  onEdit={setEditItem}
                  onDelete={handleDelete}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-[#1E2D42] py-8 mt-16">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-[11px] text-[#3A4F6B] font-code">
              built with Next.js + Supabase · your personal flutter knowledge base
            </p>
          </div>
        </footer>
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <QuestionForm
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
        />
      )}
      {editItem && (
        <QuestionForm
          initial={editItem}
          onSubmit={handleEdit}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  );
}
