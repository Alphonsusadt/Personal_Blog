import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  LayoutDashboard, FolderKanban, PenLine, BookOpen, UserCircle, Home, Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react';

const sidebarItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { path: '/admin/writings', label: 'Writings', icon: PenLine },
  { path: '/admin/books', label: 'Books', icon: BookOpen },
  { path: '/admin/about', label: 'About Page', icon: UserCircle },
  { path: '/admin/home', label: 'Home Page', icon: Home },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!api.isLoggedIn()) navigate('/admin/login');
  }, [navigate]);

  const handleLogout = () => {
    api.logout();
    navigate('/admin/login');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-[#0F172A] flex overflow-hidden">
      {/* Sidebar - Fixed */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1E293B] border-r border-[#334155] transform transition-transform lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#334155] flex-shrink-0">
          <Link to="/admin" className="text-lg font-bold text-[#F8FAFC]">CMS Admin</Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#94A3B8]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path, item.exact)
                  ? 'bg-[#1E40AF] text-white'
                  : 'text-[#94A3B8] hover:bg-[#334155] hover:text-[#F8FAFC]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#334155] flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:bg-[#334155] hover:text-[#F8FAFC] transition-colors mt-1"
          >
            <ChevronRight className="w-5 h-5" />
            Lihat Website
          </Link>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Container - With left margin for sidebar on desktop */}
      <div className="flex-1 flex flex-col h-screen lg:ml-64">
        {/* Header - Fixed at top */}
        <header className="h-16 bg-[#1E293B] border-b border-[#334155] flex items-center px-6 lg:px-8 flex-shrink-0 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#94A3B8] mr-4">
            <Menu className="w-6 h-6" />
          </button>
          <div className="text-sm text-[#94A3B8]">
            Logged in as <span className="text-[#F8FAFC] font-medium">{localStorage.getItem('cms_user') || 'admin'}</span>
          </div>
        </header>
        
        {/* Main Content - Scrollable */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
