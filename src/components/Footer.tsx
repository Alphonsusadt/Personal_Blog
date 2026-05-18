import { Github, Linkedin, Mail, Heart, Instagram, Twitter, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

interface Settings {
  footerBio?: string;
  footerName?: string;
  siteTitle?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    instagram?: string;
    twitter?: string;
    researchgate?: string;
    email?: string;
  };
  socialVisibility?: {
    linkedin?: boolean;
    github?: boolean;
    instagram?: boolean;
    twitter?: boolean;
    researchgate?: boolean;
    email?: boolean;
  };
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
        if (data) {
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
    { to: '/contact', label: t('nav.contact', language) },
  ].filter((l) => l.enabled !== false);

  const linkedinUrl = settings?.socialLinks?.linkedin || 'https://linkedin.com/in/alphonsusadt';
  const githubUrl = settings?.socialLinks?.github || 'https://github.com/alphonsusadt';
  const emailUrl = settings?.socialLinks?.email || 'alphonsus@example.com';
  const instagramUrl = settings?.socialLinks?.instagram || 'https://instagram.com/alphonsusadt';
  const twitterUrl = settings?.socialLinks?.twitter || 'https://twitter.com/alphonsusadt';
  const researchGateUrl = settings?.socialLinks?.researchgate || 'https://researchgate.net';

  const showLinkedin = settings?.socialVisibility?.linkedin !== false;
  const showGithub = settings?.socialVisibility?.github !== false;
  const showInstagram = settings?.socialVisibility?.instagram !== false;
  const showTwitter = settings?.socialVisibility?.twitter !== false;
  const showResearchGate = settings?.socialVisibility?.researchgate !== false;
  const showEmail = settings?.socialVisibility?.email !== false;

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
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {showLinkedin && (
                <a 
                  href={linkedinUrl} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {showGithub && (
                <a 
                  href={githubUrl} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
              )}
              {showInstagram && (
                <a 
                  href={instagramUrl} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5 text-pink-400" />
                </a>
              )}
              {showTwitter && (
                <a 
                  href={twitterUrl} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5 text-sky-400" />
                </a>
              )}
              {showResearchGate && (
                <a 
                  href={researchGateUrl} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="ResearchGate"
                >
                  <Globe className="w-5 h-5 text-teal-400" />
                </a>
              )}
              {showEmail && (
                <a 
                  href={`mailto:${emailUrl}`} 
                  className="text-inverse-ink opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              )}
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
              {showLinkedin && (
                <li>
                  <a 
                    href={linkedinUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </a>
                </li>
              )}
              {showGithub && (
                <li>
                  <a 
                    href={githubUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </a>
                </li>
              )}
              {showInstagram && (
                <li>
                  <a 
                    href={instagramUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                  >
                    <Instagram className="w-4 h-4 mr-2 text-pink-400" />
                    Instagram
                  </a>
                </li>
              )}
              {showTwitter && (
                <li>
                  <a 
                    href={twitterUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                  >
                    <Twitter className="w-4 h-4 mr-2 text-sky-400" />
                    Twitter
                  </a>
                </li>
              )}
              {showResearchGate && (
                <li>
                  <a 
                    href={researchGateUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                  >
                    <Globe className="w-4 h-4 mr-2 text-teal-400" />
                    ResearchGate
                  </a>
                </li>
              )}
              {showEmail && (
                <li>
                  <a 
                    href={`mailto:${emailUrl}`} 
                    className="caption text-inverse-ink hover:opacity-70 transition-opacity flex items-center"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </li>
              )}
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