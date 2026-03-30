import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { FolderKanban, PenLine, BookOpen, Plus, Calendar, Eye, Edit, TrendingUp } from 'lucide-react';

interface Writing {
  _id: string;
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  status: string;
  updatedAt?: string;
}

interface Book {
  _id: string;
  id: string;
  title: string;
  author: string;
  rating: number;
  category: string;
  status: string;
  updatedAt?: string;
}

interface Project {
  _id: string;
  id: string;
  title: string;
  description: string;
  category: string;
  devStatus: string;
  status: string;
  updatedAt?: string;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
};

export function Dashboard() {
  const [stats, setStats] = useState({ projects: 0, writings: 0, books: 0 });
  const [recentWritings, setRecentWritings] = useState<Writing[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/stats').catch(() => ({ projects: 0, writings: 0, books: 0 })),
      api.get('/api/writings').catch(() => []).then((writings: Writing[]) => 
        writings.filter(w => w.status === 'published').slice(0, 5)
      ),
      api.get('/api/books').catch(() => []).then((books: Book[]) => 
        books.filter(b => b.status === 'published').slice(0, 5)
      ),
      api.get('/api/projects').catch(() => []).then((projects: Project[]) => 
        projects.filter(p => p.status === 'published').slice(0, 5)
      ),
    ]).then(([statsData, writingsData, booksData, projectsData]) => {
      setStats(statsData);
      setRecentWritings(writingsData);
      setRecentBooks(booksData);
      setRecentProjects(projectsData);
    }).finally(() => setLoading(false));
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
        <div className="space-y-6">
          {/* Loading Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-[#334155] p-3 rounded-lg w-12 h-12 animate-pulse"></div>
                  <div className="bg-[#334155] w-16 h-8 rounded animate-pulse"></div>
                </div>
                <div className="bg-[#334155] w-20 h-4 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          
          {/* Loading Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#334155] p-2 rounded-lg w-9 h-9 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="bg-[#334155] w-24 h-4 rounded animate-pulse"></div>
                      <div className="bg-[#334155] w-16 h-3 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="bg-[#334155] w-12 h-4 rounded animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="space-y-2">
                      <div className="bg-[#334155] w-full h-4 rounded animate-pulse"></div>
                      <div className="bg-[#334155] w-3/4 h-3 rounded animate-pulse"></div>
                      <div className="bg-[#334155] w-1/2 h-3 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

          {/* Published Content Overview */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" />
              Published Content Overview
            </h2>
            <p className="text-[#94A3B8] text-sm mb-6">Recent content that's live on your website</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Published Writings */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 hover:border-[#475569] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500 p-2 rounded-lg">
                    <PenLine className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">Recent Writings</h3>
                    <p className="text-xs text-[#64748B]">{recentWritings.length} published</p>
                  </div>
                </div>
                <Link to="/admin/writings" className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1">
                  View All <Edit className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentWritings.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="bg-purple-500/10 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <PenLine className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-[#94A3B8] text-sm mb-2">No published writings yet</p>
                    <Link to="/admin/writings/edit/new" className="text-purple-400 hover:text-purple-300 text-xs">Create your first writing →</Link>
                  </div>
                ) : (
                  recentWritings.map(writing => (
                    <div key={writing._id} className="border-b border-[#334155] last:border-0 pb-3 last:pb-0">
                      <Link to={`/admin/writings/edit/${writing.id}`} className="block hover:text-purple-400 transition-colors group">
                        <h4 className="text-[#F8FAFC] font-medium text-sm line-clamp-1 group-hover:text-purple-300">{writing.title}</h4>
                        <p className="text-[#94A3B8] text-xs mt-1 line-clamp-2">{writing.excerpt}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-[#64748B]" />
                            <span className="text-[#64748B] text-xs">{formatDate(writing.updatedAt)}</span>
                          </div>
                          <span className="text-purple-400 text-xs bg-purple-500/20 px-2 py-0.5 rounded">{writing.category}</span>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Published Books */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 hover:border-[#475569] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500 p-2 rounded-lg">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">Recent Books</h3>
                    <p className="text-xs text-[#64748B]">{recentBooks.length} published</p>
                  </div>
                </div>
                <Link to="/admin/books" className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1">
                  View All <Edit className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentBooks.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="bg-amber-500/10 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-amber-400" />
                    </div>
                    <p className="text-[#94A3B8] text-sm mb-2">No published books yet</p>
                    <Link to="/admin/books/edit/new" className="text-amber-400 hover:text-amber-300 text-xs">Add your first book review →</Link>
                  </div>
                ) : (
                  recentBooks.map(book => (
                    <div key={book._id} className="border-b border-[#334155] last:border-0 pb-3 last:pb-0">
                      <Link to={`/admin/books/edit/${book.id}`} className="block hover:text-amber-400 transition-colors group">
                        <h4 className="text-[#F8FAFC] font-medium text-sm line-clamp-1 group-hover:text-amber-300">{book.title}</h4>
                        <p className="text-[#94A3B8] text-xs mt-1">by {book.author}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-[#64748B]" />
                            <span className="text-[#64748B] text-xs">{formatDate(book.updatedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i < book.rating ? 'bg-amber-400' : 'bg-[#334155]'}`}></div>
                            ))}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Published Projects */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 hover:border-[#475569] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <FolderKanban className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">Recent Projects</h3>
                    <p className="text-xs text-[#64748B]">{recentProjects.length} published</p>
                  </div>
                </div>
                <Link to="/admin/projects" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                  View All <Edit className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentProjects.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="bg-blue-500/10 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <FolderKanban className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-[#94A3B8] text-sm mb-2">No published projects yet</p>
                    <Link to="/admin/projects/edit/new" className="text-blue-400 hover:text-blue-300 text-xs">Add your first project →</Link>
                  </div>
                ) : (
                  recentProjects.map(project => (
                    <div key={project._id} className="border-b border-[#334155] last:border-0 pb-3 last:pb-0">
                      <Link to={`/admin/projects/edit/${project.id}`} className="block hover:text-blue-400 transition-colors group">
                        <h4 className="text-[#F8FAFC] font-medium text-sm line-clamp-1 group-hover:text-blue-300">{project.title}</h4>
                        <p className="text-[#94A3B8] text-xs mt-1 line-clamp-2">{project.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-[#64748B]" />
                            <span className="text-[#64748B] text-xs">{formatDate(project.updatedAt)}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            project.devStatus === 'completed' ? 'text-green-400 bg-green-500/20' :
                            project.devStatus === 'ongoing' ? 'text-yellow-400 bg-yellow-500/20' :
                            'text-blue-400 bg-blue-500/20'
                          }`}>
                            {project.devStatus}
                          </span>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/projects/edit/new" className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-lg px-5 py-4 hover:border-[#475569] transition-colors">
              <Plus className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-[#F8FAFC]">New Project</span>
            </Link>
            <Link to="/admin/writings/edit/new" className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-lg px-5 py-4 hover:border-[#475569] transition-colors">
              <Plus className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-[#F8FAFC]">New Writing</span>
            </Link>
            <Link to="/admin/books/edit/new" className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-lg px-5 py-4 hover:border-[#475569] transition-colors">
              <Plus className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-[#F8FAFC]">New Book Review</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
