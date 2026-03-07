import { BarChart3, Star, CheckCircle2, Settings, AlertTriangle, Folder } from 'lucide-react';

export default function StatsBar({ questions }) {
  // Defensive check in case questions is undefined initially
  if (!questions) return null;

  const total = questions.length;
  const favs = questions.filter(q => q.is_favourite).length;
  const easy = questions.filter(q => q.difficulty === 'Easy').length;
  const med  = questions.filter(q => q.difficulty === 'Medium').length;
  const hard = questions.filter(q => q.difficulty === 'Hard').length;
  const categories = [...new Set(questions.map(q => q.category))].length;

  const stats = [
    { label: 'Total Questions', value: total,      color: '#54C5F8', icon: BarChart3 },
    { label: 'Favourites',      value: favs,       color: '#FACC15', icon: Star },
    { label: 'Easy',            value: easy,       color: '#4ADE80', icon: CheckCircle2 },
    { label: 'Medium',          value: med,        color: '#F59E0B', icon: Settings }, // Darker amber so it doesn't clash with Favourites
    { label: 'Hard',            value: hard,       color: '#F87171', icon: AlertTriangle },
    { label: 'Categories',      value: categories, color: '#A78BFA', icon: Folder },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map(s => {
        const Icon = s.icon;
        
        return (
          <div
            key={s.label}
            className="group relative flex flex-col items-center justify-center p-5 bg-gradient-to-b from-[#1C2738] to-[#121A25] border border-[#27364B] rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#384A66] hover:-translate-y-1"
          >
            {/* Icon container with dynamic soft background tint */}
            <div 
              className="p-3 rounded-xl mb-3 transition-colors duration-300"
              style={{ backgroundColor: `${s.color}15`, color: s.color }}
            >
              <Icon size={24} strokeWidth={2.5} />
            </div>
            
            <p className="font-display text-2xl font-bold tracking-tight" style={{ color: s.color }}>
              {s.value}
            </p>
            
            <p className="text-[10px] text-[#8B9BB4] font-medium mt-1 uppercase tracking-[0.15em] text-center w-full truncate">
              {s.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}