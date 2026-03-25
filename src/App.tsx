import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Engineering } from './pages/Engineering';
import { ProjectDetail } from './pages/ProjectDetail';
import { Writings } from './pages/Writings';
import { WritingDetail } from './pages/WritingDetail';
import { Library } from './pages/Library';
import { BookDetail } from './pages/BookDetail';
import { About } from './pages/About';

// Admin
import { Login } from './pages/admin/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { ProjectsManager } from './pages/admin/ProjectsManager';
import { ProjectEditor } from './pages/admin/ProjectEditor';
import { WritingsManager } from './pages/admin/WritingsManager';
import { WritingEditor } from './pages/admin/WritingEditor';
import { BooksManager } from './pages/admin/BooksManager';
import { BookEditor } from './pages/admin/BookEditor';
import { AboutManager } from './pages/admin/AboutManager';
import { HomeManager } from './pages/admin/HomeManager';
import { SettingsManager } from './pages/admin/SettingsManager';

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
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
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
