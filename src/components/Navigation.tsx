import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, Github, Linkedin, Mail } from 'lucide-react';
import { cn } from '../utils/cn';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { api } from '../lib/api';
import { t } from '../lib/translations';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sections, setSections] = useState({
    writings: true,
    projects: true,
    books: true,
  });
  const location = useLocation();
  const { language, setLanguage } = useSiteLanguage();

  useEffect(() => {
    api.getPublicSettings()
      .then((settings: any) => {
        setSections({
          writings: settings?.sections?.writings?.enabled !== false,
          projects: settings?.sections?.projects?.enabled !== false,
          books: settings?.sections?.books?.enabled !== false,
        });
      })
      .catch(() => {
        // If settings fail to load, default to showing all nav items.
        setSections({ writings: true, projects: true, books: true });
      });
  }, []);

  const scrollPageToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = useMemo(() => {
    const items = [
      { path: '/', label: t('nav.home', language) },
      { path: '/engineering', label: t('nav.engineering', language), enabled: sections.projects },
      { path: '/writings', label: t('nav.writings', language), enabled: sections.writings },
      { path: '/library', label: t('nav.library', language), enabled: sections.books },
      { path: '/about', label: t('nav.about', language) },
    ];
    return items.filter((item) => item.enabled !== false);
  }, [sections.books, sections.projects, sections.writings, language]);

  return (
    <header className="sticky top-0 z-50 bg-canvas border-b border-hairline dark:border-hairline-soft">
      <nav className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-[56px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {/* ALP monogram */}
            <span className="text-[20px] font-bold tracking-[-1.0px] text-ink">ALP</span>
            {/* Divider */}
            <span className="w-px h-5 bg-hairline" />
            {/* Name */}
            <div className="flex flex-col leading-none">
              <span className="caption text-ink">Alphonsus</span>
              <span className="caption text-ink">Aditya PW</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'nav-link',
                  location.pathname === item.path && 'text-primary font-[540]'
                )}
                onClick={scrollPageToTop}
              >
                {item.label}
              </Link>
            ))}

            <div className="flex items-center rounded-full bg-surface-soft p-1">
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  'px-3 py-1 text-[14px] font-[480] transition-colors rounded-full',
                  language === 'en'
                    ? 'bg-canvas text-ink shadow-sm'
                    : 'text-ink opacity-60 hover:opacity-100'
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('id')}
                className={cn(
                  'px-3 py-1 text-[14px] font-[480] transition-colors rounded-full',
                  language === 'id'
                    ? 'bg-canvas text-ink shadow-sm'
                    : 'text-ink opacity-60 hover:opacity-100'
                )}
              >
                ID
              </button>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-surface-soft transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-ink" />
              ) : (
                <Moon className="w-5 h-5 text-ink" />
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-surface-soft transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-ink" />
              ) : (
                <Moon className="w-5 h-5 text-ink" />
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-surface-soft transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-ink" />
              ) : (
                <Menu className="w-6 h-6 text-ink" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-hairline bg-canvas">
            <div className="flex flex-col space-y-4 px-6">
              <div className="flex items-center justify-between">
                <span className="caption text-ink opacity-60">{language === 'en' ? 'Language' : 'Bahasa'}</span>
                <div className="flex items-center rounded-full bg-surface-soft p-1">
                  <button
                    onClick={() => setLanguage('en')}
                    className={cn(
                      'px-3 py-1 text-[14px] font-[480] transition-colors rounded-full',
                      language === 'en'
                        ? 'bg-canvas text-ink shadow-sm'
                        : 'text-ink opacity-60'
                    )}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('id')}
                    className={cn(
                      'px-3 py-1 text-[14px] font-[480] transition-colors rounded-full',
                      language === 'id'
                        ? 'bg-canvas text-ink shadow-sm'
                        : 'text-ink opacity-60'
                    )}
                  >
                    ID
                  </button>
                </div>
              </div>

              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'nav-link py-2 text-[20px]',
                    location.pathname === item.path && 'text-primary font-[540]'
                  )}
                  onClick={() => {
                    scrollPageToTop();
                    setIsMenuOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Social Links */}
              <div className="flex items-center space-x-4 pt-4 border-t border-hairline">
                <a href="https://github.com" className="text-ink opacity-60 hover:opacity-100 transition-opacity">
                  <Github className="w-6 h-6" />
                </a>
                <a href="https://linkedin.com" className="text-ink opacity-60 hover:opacity-100 transition-opacity">
                  <Linkedin className="w-6 h-6" />
                </a>
                <a href="mailto:alphonsus@example.com" className="text-ink opacity-60 hover:opacity-100 transition-opacity">
                  <Mail className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}