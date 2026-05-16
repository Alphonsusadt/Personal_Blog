import { Github, Linkedin, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

interface Settings {
  footerBio?: string;
  footerName?: string;
  siteTitle?: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { language } = useSiteLanguage();
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
    { to: '/', label: t('nav.home', language) },
    { to: '/engineering', label: t('nav.engineering', language), enabled: sections.projects },
    { to: '/writings', label: t('nav.writings', language), enabled: sections.writings },
    { to: '/library', label: t('nav.library', language), enabled: sections.books },
    { to: '/about', label: t('nav.about', language) },
  ].filter((l) => l.enabled !== false);

  return (
    <footer className="bg-inverse-canvas text-inverse-ink mt-20 rounded-t-xl">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-[96px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="md:col-span-2">
            <h3 className="display-lg text-inverse-ink mb-4">
              {settings.footerName || 'Alphonsus'}
            </h3>
            <p className="body-sm text-inverse-ink opacity-80 mb-4 max-w-md">
              {settings.footerBio}
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/alphonsusadt" 
                className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/in/alphonsusadt" 
                className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="mailto:alphonsus@example.com" 
                className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="caption text-inverse-ink opacity-60 mb-6">
              {t('footer.quickLinks', language)}
            </h4>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="caption text-inverse-ink opacity-60 mb-6">
              {t('footer.connect', language)}
            </h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href="https://linkedin.com/in/alphonsusadt" 
                  className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/alphonsusadt" 
                  className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </a>
              </li>
              <li>
                <a 
                  href="mailto:alphonsus@example.com" 
                  className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-inverse-ink border-opacity-20 mt-16 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="caption text-inverse-ink opacity-60 text-center md:text-left">
              © {currentYear} Alphonsus Aditya. {t('footer.copyright', language)}
            </p>
            <p className="caption text-inverse-ink opacity-60 mt-4 md:mt-0 flex items-center">
              {t('footer.builtWith', language)} 
              <Heart className="w-4 h-4 mx-2 text-inverse-ink" fill="currentColor" /> 
              {t('footer.andCuriosity', language)}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}