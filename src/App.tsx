import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { PageLoader } from './components/PageLoader';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Engineering = lazy(() => import('./pages/Engineering').then(m => ({ default: m.Engineering })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const Writings = lazy(() => import('./pages/Writings').then(m => ({ default: m.Writings })));
const WritingDetail = lazy(() => import('./pages/WritingDetail').then(m => ({ default: m.WritingDetail })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const BookDetail = lazy(() => import('./pages/BookDetail').then(m => ({ default: m.BookDetail })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));

const Login = lazy(() => import('./pages/admin/Login').then(m => ({ default: m.Login })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectsManager = lazy(() => import('./pages/admin/ProjectsManager').then(m => ({ default: m.ProjectsManager })));
const ProjectEditor = lazy(() => import('./pages/admin/ProjectEditor').then(m => ({ default: m.ProjectEditor })));
const WritingsManager = lazy(() => import('./pages/admin/WritingsManager').then(m => ({ default: m.WritingsManager })));
const WritingEditor = lazy(() => import('./pages/admin/WritingEditor').then(m => ({ default: m.WritingEditor })));
const BooksManager = lazy(() => import('./pages/admin/BooksManager').then(m => ({ default: m.BooksManager })));
const BookEditor = lazy(() => import('./pages/admin/BookEditor').then(m => ({ default: m.BookEditor })));
const AboutManager = lazy(() => import('./pages/admin/AboutManager').then(m => ({ default: m.AboutManager })));
const HomeManager = lazy(() => import('./pages/admin/HomeManager').then(m => ({ default: m.HomeManager })));
const SettingsManager = lazy(() => import('./pages/admin/SettingsManager').then(m => ({ default: m.SettingsManager })));

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navigation />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/engineering" element={<Engineering />} />
            <Route path="/engineering/:id" element={<ProjectDetail />} />
            <Route path="/writings" element={<Writings />} />
            <Route path="/writings/:id" element={<WritingDetail />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:id" element={<BookDetail />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProjectsManager />} />
            <Route path="projects/edit/:slug" element={<ProjectEditor />} />
            <Route path="writings" element={<WritingsManager />} />
            <Route path="writings/edit/:slug" element={<WritingEditor />} />
            <Route path="books" element={<BooksManager />} />
            <Route path="books/edit/:slug" element={<BookEditor />} />
            <Route path="about" element={<AboutManager />} />
            <Route path="home" element={<HomeManager />} />
            <Route path="settings" element={<SettingsManager />} />
          </Route>

          {/* Public Routes */}
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
