import { Github, Linkedin, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Settings {
  footerBio?: string;
  footerName?: string;
  siteTitle?: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<Settings>({
    footerBio: 'Biomedical Engineering student exploring the intersection of medical signals, faith, and human life. Bridging the precision of engineering with the mystery of spirituality.',
    footerName: 'Alphonsus Aditya',
  });

  const [sections, setSections] = useState({
    writings: true,
    projects: true,
    books: true,
  });

  useEffect(() => {
    api.getPublicSettings()
      .then((data) => {
        if (data && data.footerBio) {
          setSettings(prev => ({ ...prev, ...data }));
        }

        setSections({
          writings: data?.sections?.writings?.enabled !== false,
          projects: data?.sections?.projects?.enabled !== false,
          books: data?.sections?.books?.enabled !== false,
        });
      })
      .catch(console.error);
  }, []);

  const quickLinks = [
    { to: '/', label: 'Home' },
    { to: '/engineering', label: 'Engineering', enabled: sections.projects },
    { to: '/writings', label: 'Writings', enabled: sections.writings },
    { to: '/library', label: 'Library', enabled: sections.books },
    { to: '/about', label: 'About' },
  ].filter((l) => l.enabled !== false);

  return (
    <footer className="bg-white dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155] mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-[#1A1A1A] dark:text-[#F8FAFC]">
              {settings.footerName || 'Alphonsus Aditya'}
            </h3>
            <p className="text-[#6B7280] mb-4 max-w-md">
              {settings.footerBio}
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/alphonsusadt" 
                className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/in/alphonsusadt" 
                className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="mailto:alphonsus@example.com" 
                className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-[#1A1A1A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-[#1A1A1A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Connect
            </h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://linkedin.com/in/alphonsusadt" 
                  className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors text-sm flex items-center"
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/alphonsusadt" 
                  className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors text-sm flex items-center"
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </a>
              </li>
              <li>
                <a 
                  href="mailto:alphonsus@example.com" 
                  className="text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors text-sm flex items-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] dark:border-[#334155] mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-[#6B7280] text-center md:text-left">
              © {currentYear} Alphonsus Aditya. All rights reserved.
            </p>
            <p className="text-sm text-[#6B7280] mt-2 md:mt-0 flex items-center">
              Built with 
              <Heart className="w-4 h-4 mx-1 text-red-500" fill="currentColor" /> 
              and biomedical curiosity
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}