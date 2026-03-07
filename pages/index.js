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
import QuestionCard from '../components/QuestionCard';
import QuestionForm from '../components/QuestionForm';
import StatsBar from '../components/StatsBar';

const CATEGORIES = [
  'All', 'General', 'Widgets', 'State Management', 'Navigation',
  'Async / Dart', 'Animations', 'Networking', 'Storage',
  'Testing', 'Performance', 'Architecture',
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'easy',   label: 'Easy → Hard'  },
  { value: 'hard',   label: 'Hard → Easy'  },
  { value: 'favs',   label: 'Favourites First' },
];

const tempId = () => `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function Home() {
  const [questions, setQuestions]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [isOnline, setIsOnline]       = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing]         = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const deferredPrompt                = useRef(null);

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [favOnly, setFavOnly]       = useState(false);
  const [sortBy, setSortBy]         = useState('newest');

  const refreshPending = useCallback(async () => {
    const c = await getPendingCount();
    setPendingCount(c);
  }, []);

  const fetchQuestions = useCallback(async (online) => {
    setLoading(true);
    if (online) {
      const { data, error } = await supabase
        .from('questions').select('*').order('created_at', { ascending: false });
      if (error) {
        toast.error('Could not reach server — showing cached data');
        const cached = await getCachedQuestions();
        setQuestions(cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } else {
        setQuestions(data || []);
        await cacheQuestions(data || []);
      }
    } else {
      const cached = await getCachedQuestions();
      setQuestions(cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
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
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); deferredPrompt.current = e; setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') toast.success('App installed! 🎉');
    deferredPrompt.current = null;
    setShowInstall(false);
  };

  // Initial load + shortcut
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

  // Keep a ref so the online handler always calls latest handleSync
  const handleSyncRef = useRef(handleSync);
  useEffect(() => { handleSyncRef.current = handleSync; }, [handleSync]);

  // ADD
  const handleAdd = async (form) => {
    const now = new Date().toISOString();
    if (isOnline) {
      const { data, error } = await supabase.from('questions').insert([form]).select().single();
      if (error) { toast.error('Failed to add question'); return; }
      toast.success('Question added! 🎉');
      setQuestions(prev => [data, ...prev]);
      await upsertCachedQuestion(data);
    } else {
      const localQ = { ...form, id: tempId(), created_at: now, updated_at: now };
      await upsertCachedQuestion(localQ);
      await enqueueOperation('add', localQ);
      setQuestions(prev => [localQ, ...prev]);
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
    setQuestions(prev => prev.map(q => q.id === editItem.id ? updated : q));
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
    setQuestions(prev => prev.filter(q => q.id !== id));
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
    setQuestions(prev => prev.map(x => x.id === q.id ? updated : x));
    toast(newVal ? '★ Added to favourites' : '☆ Removed', { icon: newVal ? '⭐' : '💫' });
    await refreshPending();
  };

  // FILTER + SORT
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

  return (
    <>
      <Head>
        <title>Flutter Interview Library</title>
        <meta name="description" content="Personal Flutter Q&A — works offline" />
      </Head>

      <div className="min-h-screen bg-[#0E1621]">

        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-amber-950/80 border-b border-amber-800/50 px-4 py-2 flex items-center justify-center gap-2">
            <p className="text-amber-300 text-xs font-body text-center">
              📴 Offline — reading from local cache. Add/Edit/Delete will sync when you reconnect.
            </p>
          </div>
        )}

        {/* Pending sync banner */}
        {isOnline && pendingCount > 0 && (
          <div className="bg-blue-950/80 border-b border-blue-800/50 px-4 py-2 flex items-center justify-center gap-3">
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

        {/* Navbar */}
        <nav className="sticky top-0 z-40 bg-[#0E1621]/90 backdrop-blur-md border-b border-[#1E2D42]">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: 'linear-gradient(135deg,#027DFD 0%,#54C5F8 100%)' }}>
                📘
              </div>
              <div>
                <h1 className="font-display text-sm text-white leading-none">Flutter Interview Library</h1>
                <p className="text-[10px] font-body mt-0.5 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <span className={isOnline ? 'text-green-400' : 'text-amber-400'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {pendingCount > 0 && <span className="text-blue-400">· {pendingCount} pending</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showInstall && (
                <button onClick={handleInstall}
                  className="hidden sm:flex items-center gap-1.5 border border-[#027DFD]/50 text-[#54C5F8] hover:bg-[#027DFD]/10 px-3 py-2 rounded-xl font-display text-xs transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Install App
                </button>
              )}
              {isOnline && pendingCount > 0 && (
                <button onClick={() => handleSync(false)} disabled={syncing} title={`Sync ${pendingCount} pending`}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-blue-700/50 text-blue-400 hover:bg-blue-900/30 transition-colors disabled:opacity-50 relative">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={syncing ? 'animate-spin' : ''}>
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] text-white flex items-center justify-center font-display">
                    {pendingCount}
                  </span>
                </button>
              )}
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-[#027DFD] hover:bg-[#0068D8] text-white px-4 py-2 rounded-xl font-display text-sm transition-all glow-blue">
                <span className="text-base leading-none">+</span>
                <span className="hidden sm:inline">Add Question</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {!loading && <StatsBar questions={questions} />}

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A4F6B]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search questions, answers, or tags..."
              className="w-full bg-[#151F2E] border border-[#1E2D42] rounded-xl pl-11 pr-10 py-3 text-[#E8EEF7] placeholder-[#3A4F6B] font-body text-sm transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B9BB4] hover:text-white text-xs">✕</button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {['All','Easy','Medium','Hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-display transition-all ${
                  difficulty === d
                    ? d==='All' ? 'bg-[#027DFD]/20 border-[#027DFD]/50 text-[#54C5F8]'
                      : d==='Easy' ? 'badge-easy border' : d==='Medium' ? 'badge-medium border' : 'badge-hard border'
                    : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C]'
                }`}>{d}</button>
            ))}
            <button onClick={() => setFavOnly(f => !f)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-display transition-all ${favOnly ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400' : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C]'}`}>
              ★ Favourites
            </button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-xs bg-[#151F2E] border border-[#1E2D42] rounded-lg px-3 py-1.5 text-[#8B9BB4] font-body appearance-none cursor-pointer ml-auto">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {hasActiveFilter && (
              <button onClick={clearFilters} className="text-[10px] text-[#8B9BB4] hover:text-white border border-[#1E2D42] rounded-lg px-2.5 py-1.5 font-body transition-colors">
                Clear filters
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-[11px] px-3 py-1 rounded-full border font-display whitespace-nowrap transition-all ${
                  category === c ? 'bg-[#027DFD]/20 border-[#027DFD]/50 text-[#54C5F8]' : 'border-[#1E2D42] text-[#8B9BB4] hover:border-[#2A3F5C] hover:text-white'
                }`}>{c}</button>
            ))}
          </div>

          {/* Count row */}
          {!loading && (
            <p className="text-xs text-[#8B9BB4] font-body mb-4 flex items-center gap-2 flex-wrap">
              {filtered.length !== questions.length
                ? <>{filtered.length} of {questions.length} questions <span className="text-[#027DFD]">(filtered)</span></>
                : <>{questions.length} question{questions.length !== 1 ? 's' : ''}</>}
              {hasOfflineOnly && <span className="text-amber-400">· 📴 some saved offline</span>}
            </p>
          )}

          {/* Cards */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#027DFD] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#8B9BB4] font-body text-sm">{isOnline ? 'Loading your library...' : 'Loading from local cache...'}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">{questions.length === 0 ? '📭' : '🔍'}</div>
              <h3 className="font-display text-white text-lg mb-2">{questions.length === 0 ? 'Your library is empty' : 'No questions found'}</h3>
              <p className="text-[#8B9BB4] font-body text-sm mb-6">
                {questions.length === 0 ? "Start adding Flutter interview questions you've encountered!" : 'Try different search terms or clear your filters.'}
              </p>
              {questions.length === 0
                ? <button onClick={() => setShowForm(true)} className="bg-[#027DFD] hover:bg-[#0068D8] text-white px-6 py-3 rounded-xl font-display text-sm transition-all glow-blue">+ Add Your First Question</button>
                : <button onClick={clearFilters} className="border border-[#1E2D42] hover:border-[#2A3F5C] text-[#8B9BB4] hover:text-white px-6 py-3 rounded-xl font-display text-sm transition-all">Clear Filters</button>}
            </div>
          ) : (
            <div className="stagger space-y-3">
              {filtered.map(q => (
                <QuestionCard key={q.id} q={q}
                  isOfflineOnly={String(q.id).startsWith('offline_')}
                  onEdit={setEditItem} onDelete={handleDelete} onToggleFav={handleToggleFav} />
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-[#1E2D42] py-8 mt-16 text-sm text-[#8B9BB4]">
  <div className="max-w-6xl mx-auto flex items-center justify-between px-4">

    <p className="flex items-center gap-1">
      Built with
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-red-500"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
      <a
        href="https://dyash2.github.io/portfolio/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-white hover:underline"
      >
      Yash Debnath
      </a>
    </p>

    <a
      href="https://github.com/dyash2/flutter_library"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 hover:text-white transition"
    >
      GitHub
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <path d="M15 3h6v6"/>
        <path d="M10 14 21 3"/>
      </svg>
    </a>

  </div>
</footer>
      </div>

      {showForm && <QuestionForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />}
      {editItem  && <QuestionForm initial={editItem} onSubmit={handleEdit} onClose={() => setEditItem(null)} />}
    </>
  );
}
