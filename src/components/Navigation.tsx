import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, Github, Linkedin, Mail } from 'lucide-react';
import { cn } from '../utils/cn';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/engineering', label: 'Engineering' },
    { path: '/writings', label: 'Writings' },
    { path: '/library', label: 'Library' },
    { path: '/about', label: 'About' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-sm border-b border-[#E5E7EB] dark:border-[#334155]">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {/* ALP monogram */}
            <span className="text-2xl font-bold tracking-tight text-[#1A1A1A] dark:text-[#F8FAFC] font-serif">ALP</span>
            {/* Divider */}
            <span className="w-px h-8 bg-[#D1D5DB] dark:bg-[#475569]" />
            {/* Name */}
            <div className="flex flex-col leading-snug">
              <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Alphonsus</span>
              <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Aditya PW</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'nav-link',
                  location.pathname === item.path && 'text-[#1E40AF] dark:text-[#60A5FA] font-semibold'
                )}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-[#E5E7EB] dark:hover:bg-[#334155] transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-[#F8FAFC]" />
              ) : (
                <Moon className="w-5 h-5 text-[#1A1A1A]" />
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-[#E5E7EB] dark:hover:bg-[#334155] transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-[#F8FAFC]" />
              ) : (
                <Moon className="w-5 h-5 text-[#1A1A1A]" />
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-[#E5E7EB] dark:hover:bg-[#334155] transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-[#1A1A1A] dark:text-[#F8FAFC]" />
              ) : (
                <Menu className="w-6 h-6 text-[#1A1A1A] dark:text-[#F8FAFC]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'nav-link py-2',
                    location.pathname === item.path && 'text-[#1E40AF] dark:text-[#60A5FA] font-semibold'
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Social Links */}
              <div className="flex items-center space-x-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <a href="https://github.com" className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com" className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="mailto:alphonsus@example.com" className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}