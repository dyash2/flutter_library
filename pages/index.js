import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import {
  cacheQuestions, getCachedQuestions,
  upsertCachedQuestion, deleteCachedQuestion,
  enqueueOperation, getPendingCount,
} from '../lib/offlineDB';
import { runSync } from '../lib/syncEngine';
import { useDomain } from '../context/DomainContext';
import QuestionCard from '../components/QuestionCard';
import QuestionForm from '../components/QuestionForm';
import StatsBar from '../components/StatsBar';
import DomainToggle from '../components/DomainToggle';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'easy',   label: 'Easy → Hard'  },
  { value: 'hard',   label: 'Hard → Easy'  },
  { value: 'favs',   label: 'Favourites First' },
];

const tempId = () => `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function Home() {
  const { domain } = useDomain();

  // ── All questions from DB/cache ──────────────────────────
  const [allQuestions, setAllQuestions]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editItem, setEditItem]           = useState(null);
  const [isOnline, setIsOnline]           = useState(true);
  const [pendingCount, setPendingCount]   = useState(0);
  const [syncing, setSyncing]             = useState(false);

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [favOnly, setFavOnly]       = useState(false);
  const [sortBy, setSortBy]         = useState('newest');

  // ── Filter allQuestions to the active domain ─────────────
  // KEY LOGIC: questions without a `domain` field = Flutter (backward compat).
  // CyberSecurity questions have domain = 'cybersecurity'.
  const questions = useMemo(() => {
    return allQuestions.filter(domain.filter);
  }, [allQuestions, domain]);

  // Reset filters when domain changes so you don't land on a
  // category that doesn't exist in the new domain.
  useEffect(() => {
    setSearch('');
    setCategory('All');
    setDifficulty('All');
    setFavOnly(false);
    setSortBy('newest');
  }, [domain.key]);

  // ── Dynamic categories ───────────────────────────────────
  const liveCategories = useMemo(() => {
    const cats = [...new Set(questions.map(q => q.category).filter(Boolean))];
    return cats.sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const filterCategories = ['All', ...liveCategories];

  useEffect(() => {
    if (category !== 'All' && !liveCategories.includes(category)) {
      setCategory('All');
    }
  }, [liveCategories, category]);

  const refreshPending = useCallback(async () => {
    const c = await getPendingCount();
    setPendingCount(c);
  }, []);

  // Fetch ALL questions — domain filtering happens client-side
  const fetchQuestions = useCallback(async (online) => {
    setLoading(true);
    if (online) {
      const { data, error } = await supabase
        .from('questions').select('*').order('created_at', { ascending: false });
      if (error) {
        toast.error('Could not reach server — showing cached data');
        const cached = await getCachedQuestions();
        setAllQuestions(cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } else {
        setAllQuestions(data || []);
        await cacheQuestions(data || []);
      }
    } else {
      const cached = await getCachedQuestions();
      setAllQuestions(cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }
    setLoading(false);
    await refreshPending();
  }, [refreshPending]);

  // Online / Offline detection
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast('Back online! Syncing...', { icon: '🌐' });
      handleSyncRef.current(true);
    };
    const goOffline = () => {
      setIsOnline(false);
      toast("You're offline. Changes will sync when reconnected.", { icon: '📴', duration: 4000 });
    };
    const initial = navigator.onLine;
    setIsOnline(initial);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchQuestions(navigator.onLine);
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'add') setShowForm(true);
    }
  }, []);

  // Sync engine
  const handleSync = useCallback(async (silent = false) => {
    const count = await getPendingCount();
    if (count === 0) { if (!silent) toast('Nothing to sync ✅'); return; }
    setSyncing(true);
    const { synced, failed } = await runSync();
    setSyncing(false);
    if (synced > 0) {
      toast.success(`Synced ${synced} change${synced > 1 ? 's' : ''} ✅`);
      await fetchQuestions(true);
    }
    if (failed > 0) toast.error(`${failed} change${failed > 1 ? 's' : ''} failed to sync`);
    await refreshPending();
  }, [fetchQuestions, refreshPending]);

  const handleSyncRef = useRef(handleSync);
  useEffect(() => { handleSyncRef.current = handleSync; }, [handleSync]);

  // ADD — injects domain field so we know which domain this Q belongs to
  const handleAdd = async (form) => {
    const now = new Date().toISOString();
    // Attach the domain marker to the question payload
    const payload = { ...form, ...domain.newFields() };

    if (isOnline) {
      const { data, error } = await supabase.from('questions').insert([payload]).select().single();
      if (error) { toast.error('Failed to add question'); return; }
      toast.success('Question added! 🎉');
      setAllQuestions(prev => [data, ...prev]);
      await upsertCachedQuestion(data);
    } else {
      const localQ = { ...payload, id: tempId(), created_at: now, updated_at: now };
      await upsertCachedQuestion(localQ);
      await enqueueOperation('add', localQ);
      setAllQuestions(prev => [localQ, ...prev]);
      toast('Saved offline 📴 — syncs when online', { icon: '💾', duration: 4000 });
    }
    setShowForm(false);
    await refreshPending();
  };

  // EDIT
  const handleEdit = async (form) => {
    const updated = { ...editItem, ...form, updated_at: new Date().toISOString() };
    if (isOnline && !String(editItem.id).startsWith('offline_')) {
      const { error } = await supabase.from('questions').update(form).eq('id', editItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Updated ✅');
    } else {
      await enqueueOperation('edit', updated);
      toast('Edit saved offline 📴 — syncs when online', { icon: '💾', duration: 4000 });
    }
    await upsertCachedQuestion(updated);
    setAllQuestions(prev => prev.map(q => q.id === editItem.id ? updated : q));
    setEditItem(null);
    await refreshPending();
  };

  // DELETE
  const handleDelete = async (id) => {
    const isTemp = String(id).startsWith('offline_');
    if (isOnline && !isTemp) {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) { toast.error('Failed to delete'); return; }
    } else if (!isTemp) {
      await enqueueOperation('delete', { id });
      toast('Delete queued 📴 — syncs when online', { icon: '🗑️' });
    }
    await deleteCachedQuestion(id);
    setAllQuestions(prev => prev.filter(q => q.id !== id));
    await refreshPending();
    if (isOnline || isTemp) toast.success('Deleted');
  };

  // TOGGLE FAVOURITE
  const handleToggleFav = async (q) => {
    const newVal = !q.is_favourite;
    const updated = { ...q, is_favourite: newVal };
    const isTemp = String(q.id).startsWith('offline_');
    if (isOnline && !isTemp) {
      const { error } = await supabase.from('questions').update({ is_favourite: newVal }).eq('id', q.id);
      if (error) { toast.error('Failed to update favourite'); return; }
    } else if (!isTemp) {
      await enqueueOperation('fav', { id: q.id, is_favourite: newVal });
    }
    await upsertCachedQuestion(updated);
    setAllQuestions(prev => prev.map(x => x.id === q.id ? updated : x));
    toast(newVal ? '★ Added to favourites' : '☆ Removed', { icon: newVal ? '⭐' : '💫' });
    await refreshPending();
  };

  // FILTER + SORT (operates on domain-filtered questions)
  const filtered = useMemo(() => {
    let arr = [...questions];
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(x =>
        x.question.toLowerCase().includes(s) ||
        x.answer.toLowerCase().includes(s) ||
        (x.tags || []).some(t => t.includes(s))
      );
    }
    if (category !== 'All')   arr = arr.filter(x => x.category === category);
    if (difficulty !== 'All') arr = arr.filter(x => x.difficulty === difficulty);
    if (favOnly)              arr = arr.filter(x => x.is_favourite);
    const d = { Easy: 0, Medium: 1, Hard: 2 };
    switch (sortBy) {
      case 'oldest': arr.sort((a,b) => new Date(a.created_at)-new Date(b.created_at)); break;
      case 'easy':   arr.sort((a,b) => d[a.difficulty]-d[b.difficulty]); break;
      case 'hard':   arr.sort((a,b) => d[b.difficulty]-d[a.difficulty]); break;
      case 'favs':   arr.sort((a,b) => b.is_favourite-a.is_favourite); break;
      default:       arr.sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
    }
    return arr;
  }, [questions, search, category, difficulty, favOnly, sortBy]);

  const clearFilters = () => { setSearch(''); setCategory('All'); setDifficulty('All'); setFavOnly(false); setSortBy('newest'); };
  const hasActiveFilter = search || category !== 'All' || difficulty !== 'All' || favOnly;
  const hasOfflineOnly  = questions.some(q => String(q.id).startsWith('offline_'));

  // ── Cyber-specific accent style helpers ──────────────────
  const accentStyle = { color: 'var(--accent)' };
  const accentBg    = { background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' };
  const accentBtnCls = 'text-white font-display text-sm transition-all glow-accent';

  return (
    <>
      <Head>
        <title>{domain.appName}</title>
        <meta name="description" content={domain.description} />
      </Head>

      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

        {/* Offline banner */}
        {!isOnline && (
          <div className="border-b px-4 py-2 flex items-center justify-center gap-2"
            style={{ background: 'rgba(180,83,9,0.2)', borderColor: 'rgba(180,83,9,0.4)' }}>
            <p className="text-amber-300 text-xs font-body text-center">
              📴 Offline — reading from local cache. Add/Edit/Delete will sync when you reconnect.
            </p>
          </div>
        )}

        {/* Pending sync banner */}
        {isOnline && pendingCount > 0 && (
          <div className="border-b px-4 py-2 flex items-center justify-center gap-3"
            style={{ background: 'rgba(2,125,253,0.1)', borderColor: 'rgba(2,125,253,0.3)' }}>
            <p className="text-blue-300 text-xs font-body">
              🔄 {pendingCount} offline change{pendingCount > 1 ? 's' : ''} waiting to sync
            </p>
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="text-[11px] font-display text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {/* ── Navbar ─────────────────────────────────────────── */}
        <nav
  className="sticky top-0 z-40 backdrop-blur-md border-b"
  style={{
    background: "color-mix(in srgb, var(--bg) 92%, transparent)",
    borderColor: "var(--border)",
  }}
>
  <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">

    {/* 🔹 LEFT */}
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
        style={accentBg}
      >
        {domain.icon}
      </div>

      <div className="min-w-0">
        <h1 className="font-display text-sm sm:text-base text-white truncate">
          {domain.appName}
        </h1>

        {/* status hidden on small screens */}
        <p
          className="hidden sm:flex text-[10px] mt-0.5 items-center gap-1.5"
          style={{ color: "var(--muted)" }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? "bg-green-400" : "bg-amber-400"
            }`}
          />
          <span className={isOnline ? "text-green-400" : "text-amber-400"}>
            {isOnline ? "Online" : "Offline"}
          </span>
          {pendingCount > 0 && (
            <span className="text-blue-400">· {pendingCount}</span>
          )}
        </p>
      </div>
    </div>

    {/* 🔹 RIGHT */}
    <div className="flex items-center gap-2">

      {/* Domain Toggle */}
      <div className="scale-90 sm:scale-100">
        <DomainToggle />
      </div>

      {/* Sync */}
      {isOnline && pendingCount > 0 && (
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          className="w-9 h-9 flex items-center justify-center rounded-xl border relative"
          style={{
            borderColor: "rgba(2,125,253,0.4)",
            color: "#60a5fa",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            className={syncing ? "animate-spin" : ""}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>

          <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] bg-blue-500 text-white rounded-full flex items-center justify-center">
            {pendingCount}
          </span>
        </button>
      )}

      {/* Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className={`flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-xl ${accentBtnCls}`}
        style={accentBg}
      >
        <span className="text-base leading-none">+</span>
        <span className="hidden sm:inline text-sm">
          {domain.addLabel}
        </span>
      </button>
    </div>
  </div>

  {/* 🔻 MOBILE STATUS BAR (THIS IS THE MAGIC FIX) */}
  <div className="sm:hidden px-3 pb-2 flex items-center justify-between text-[11px]">

    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-green-400" : "bg-amber-400"
        }`}
      />
      <span className={isOnline ? "text-green-400" : "text-amber-400"}>
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>

    {pendingCount > 0 && (
      <span className="text-blue-400">
        {pendingCount} pending
      </span>
    )}
  </div>
</nav>

        {/* ── Main content ──────────────────────────────────── */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          {!loading && <StatsBar questions={questions} />}

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${domain.label} questions, answers, or tags...`}
              className="w-full rounded-xl pl-11 pr-10 py-3 font-body text-sm transition-all"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs hover:text-white transition-colors"
                style={{ color: 'var(--muted)' }}>✕</button>
            )}
          </div>

          {/* Difficulty + Fav filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {['All','Easy','Medium','Hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-display transition-all ${
                  difficulty === d
                    ? d==='All'
                      ? 'border-transparent text-white'
                      : d==='Easy' ? 'badge-easy border' : d==='Medium' ? 'badge-medium border' : 'badge-hard border'
                    : 'border-[#1E2D42] hover:border-[#2A3F5C]'
                }`}
                style={difficulty === d && d === 'All' ? { ...accentBg, border: 'none' } : { color: difficulty !== d ? 'var(--muted)' : undefined }}
              >
                {d}
              </button>
            ))}
            <button onClick={() => setFavOnly(f => !f)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-display transition-all ${
                favOnly ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400' : 'border-[#1E2D42] hover:border-[#2A3F5C]'
              }`}
              style={!favOnly ? { color: 'var(--muted)' } : {}}
            >
              ★ Favourites
            </button>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs rounded-lg px-3 py-1.5 font-body appearance-none cursor-pointer ml-auto"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {hasActiveFilter && (
              <button onClick={clearFilters}
                className="text-[10px] border rounded-lg px-2.5 py-1.5 font-body transition-colors hover:text-white"
                style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto">
            {filterCategories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="text-[11px] px-3 py-1 rounded-full border font-display whitespace-nowrap transition-all"
                style={
                  category === c
                    ? { background: 'var(--accent-badge)', borderColor: 'var(--accent-badge-border)', color: 'var(--accent-light)' }
                    : { borderColor: 'var(--border)', color: 'var(--muted)' }
                }
              >
                {c}
              </button>
            ))}
          </div>

          {/* Count row */}
          {!loading && (
            <p className="text-xs font-body mb-4 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted)' }}>
              {filtered.length !== questions.length
                ? <>{filtered.length} of {questions.length} questions <span style={accentStyle}>(filtered)</span></>
                : <>{questions.length} question{questions.length !== 1 ? 's' : ''}</>
              }
              {hasOfflineOnly && <span className="text-amber-400">· 📴 some saved offline</span>}
            </p>
          )}

          {/* Cards / Loading / Empty */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
                {isOnline ? `Loading your ${domain.label} library...` : 'Loading from local cache...'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">{questions.length === 0 ? domain.icon : '🔍'}</div>
              <h3 className="font-display text-white text-lg mb-2">
                {questions.length === 0 ? domain.emptyTitle : 'No questions found'}
              </h3>
              <p className="font-body text-sm mb-6" style={{ color: 'var(--muted)' }}>
                {questions.length === 0 ? domain.emptyMsg : 'Try different search terms or clear your filters.'}
              </p>
              {questions.length === 0
                ? <button onClick={() => setShowForm(true)}
                    className={`px-6 py-3 rounded-xl ${accentBtnCls}`}
                    style={accentBg}
                  >
                    + Add Your First {domain.label} Question
                  </button>
                : <button onClick={clearFilters}
                    className="border hover:text-white px-6 py-3 rounded-xl font-display text-sm transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                  >
                    Clear Filters
                  </button>
              }
            </div>
          ) : (
            <div className="stagger space-y-3">
              {filtered.map(q => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  isOfflineOnly={String(q.id).startsWith('offline_')}
                  onEdit={setEditItem}
                  onDelete={handleDelete}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t py-8 mt-16 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
            <p className="flex items-center gap-1">
              Built with
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
              <a href="https://dyash2.github.io/portfolio/" target="_blank" rel="noopener noreferrer"
                className="text-white hover:underline">
                Yash Debnath
              </a>
            </p>
            <a href="https://github.com/dyash2/flutter_library" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition">
              GitHub
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <path d="M15 3h6v6"/><path d="M10 14 21 3"/>
              </svg>
            </a>
          </div>
        </footer>
      </div>

      {/* Modals */}
      {showForm && (
        <QuestionForm
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
          categories={liveCategories}
        />
      )}
      {editItem && (
        <QuestionForm
          initial={editItem}
          onSubmit={handleEdit}
          onClose={() => setEditItem(null)}
          categories={liveCategories}
        />
      )}
    </>
  );
}
