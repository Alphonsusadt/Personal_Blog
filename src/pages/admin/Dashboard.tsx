import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { FolderKanban, PenLine, BookOpen, Plus } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({ projects: 0, writings: 0, books: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/stats').then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Projects', count: stats.projects, icon: FolderKanban, color: 'bg-blue-500', link: '/admin/projects' },
    { label: 'Writings', count: stats.writings, icon: PenLine, color: 'bg-purple-500', link: '/admin/writings' },
    { label: 'Books', count: stats.books, icon: BookOpen, color: 'bg-amber-500', link: '/admin/books' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#F8FAFC] mb-8">Dashboard</h1>

      {loading ? (
        <div className="text-[#94A3B8]">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {cards.map(c => (
              <Link key={c.label} to={c.link} className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 hover:border-[#475569] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${c.color} p-3 rounded-lg`}>
                    <c.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-[#F8FAFC]">{c.count}</span>
                </div>
                <p className="text-[#94A3B8] text-sm">{c.label}</p>
              </Link>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/projects" className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-lg px-5 py-4 hover:border-[#475569] transition-colors">
              <Plus className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-[#F8FAFC]">Add Project</span>
            </Link>
            <Link to="/admin/writings" className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-lg px-5 py-4 hover:border-[#475569] transition-colors">
              <Plus className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-[#F8FAFC]">Add Writing</span>
            </Link>
            <Link to="/admin/books" className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-lg px-5 py-4 hover:border-[#475569] transition-colors">
              <Plus className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-[#F8FAFC]">Add Book</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
