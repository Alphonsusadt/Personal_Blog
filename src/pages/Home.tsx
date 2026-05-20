import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, ExternalLink, ChevronRight, Instagram, Twitter, Globe } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { WritingCard } from '../components/WritingCard';
import { BookCard } from '../components/BookCard';
import { api } from '../lib/api';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { resolveLocalizedText } from '../lib/localized';
import { t } from '../lib/translations';
import type { Project } from '../data/projects';
import type { Writing } from '../data/writings';
import type { Book } from '../data/library';

type LocalizedText = { en: string; id: string };

interface HomeData {
  heroName: LocalizedText;
  heroLastName: LocalizedText;
  heroSubtitle: LocalizedText;
  heroTagline: LocalizedText;
  socialLinks: { linkedin: string; github: string; email: string };
  sections: {
    recentProjects: { title: LocalizedText; subtitle: LocalizedText };
    recentWritings: { title: LocalizedText; subtitle: LocalizedText };
    featuredBooks: { title: LocalizedText; subtitle: LocalizedText };
  };
}

interface PublicSettings {
  sections?: {
    writings?: { enabled?: boolean; status?: 'visible' | 'hidden' | 'development' };
    projects?: { enabled?: boolean; status?: 'visible' | 'hidden' | 'development' };
    books?: { enabled?: boolean; status?: 'visible' | 'hidden' | 'development' };
  };
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

const asLocalizedText = (value: unknown, fallback = ''): LocalizedText => {
  if (typeof value === 'string') {
    return { en: value, id: value };
  }

  if (value && typeof value === 'object') {
    const parsed = value as Partial<LocalizedText>;
    return {
      en: typeof parsed.en === 'string' ? parsed.en : fallback,
      id: typeof parsed.id === 'string' ? parsed.id : (typeof parsed.en === 'string' ? parsed.en : fallback),
    };
  }

  return { en: fallback, id: fallback };
};

const normalizeHomeData = (raw: unknown): HomeData => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const sections = (data.sections && typeof data.sections === 'object' ? data.sections : {}) as Record<string, unknown>;

  const parseSection = (sectionKey: 'recentProjects' | 'recentWritings' | 'featuredBooks') => {
    const section = (sections[sectionKey] && typeof sections[sectionKey] === 'object')
      ? (sections[sectionKey] as Record<string, unknown>)
      : {};

    return {
      title: asLocalizedText(section.title),
      subtitle: asLocalizedText(section.subtitle),
    };
  };

  const socialLinks = (data.socialLinks && typeof data.socialLinks === 'object')
    ? (data.socialLinks as Record<string, unknown>)
    : {};

  return {
    heroName: asLocalizedText(data.heroName, 'Alphonsus'),
    heroLastName: asLocalizedText(data.heroLastName, 'Aditya'),
    heroSubtitle: asLocalizedText(data.heroSubtitle, 'Biomedical Engineering Student'),
    heroTagline: asLocalizedText(data.heroTagline, 'Exploring the intersection of Medical Signals, Faith, and Human Life'),
    socialLinks: {
      linkedin: typeof socialLinks.linkedin === 'string' ? socialLinks.linkedin : 'https://linkedin.com/in/alphonsusadt',
      github: typeof socialLinks.github === 'string' ? socialLinks.github : 'https://github.com/alphonsusadt',
      email: typeof socialLinks.email === 'string' ? socialLinks.email : 'alphonsus@example.com',
    },
    sections: {
      recentProjects: parseSection('recentProjects'),
      recentWritings: parseSection('recentWritings'),
      featuredBooks: parseSection('featuredBooks'),
    },
  };
};

const defaultHomeData: HomeData = {
  heroName: { en: 'Alphonsus', id: 'Alphonsus' },
  heroLastName: { en: 'Aditya', id: 'Aditya' },
  heroSubtitle: { en: 'Biomedical Engineering Student', id: 'Mahasiswa Teknik Biomedis' },
  heroTagline: {
    en: 'Exploring the intersection of Medical Signals, Faith, and Human Life',
    id: 'Menjelajahi persimpangan Sinyal Medis, Iman, dan Kehidupan Manusia',
  },
  socialLinks: {
    linkedin: 'https://linkedin.com/in/alphonsusadt',
    github: 'https://github.com/alphonsusadt',
    email: 'alphonsus@example.com',
  },
  sections: {
    recentProjects: {
      title: { en: 'Recent Engineering Projects', id: 'Proyek Teknik Terbaru' },
      subtitle: {
        en: 'Exploring the intersection of signal processing, medical devices, and data analysis',
        id: 'Menjelajahi persimpangan pemrosesan sinyal, perangkat medis, dan analisis data',
      },
    },
    recentWritings: {
      title: { en: 'Recent Writings', id: 'Tulisan Terbaru' },
      subtitle: {
        en: 'Reflections on faith, engineering, and the human experience',
        id: 'Refleksi tentang iman, teknik, dan pengalaman manusia',
      },
    },
    featuredBooks: {
      title: { en: 'From My Library', id: 'Dari Perpustakaan Saya' },
      subtitle: {
        en: 'Books that shape my thinking on technology, faith, and philosophy',
        id: 'Buku yang membentuk pemikiran saya tentang teknologi, iman, dan filosofi',
      },
    },
  },
};

/**
 * Generates EMG signal path with perfectly periodic burst pattern for seamless scrolling.
 * Uses a fixed deterministic pattern per cycle so scroll animation is seamless.
 */
function generateEMGPath(
  startX: number,
  baselineY: number,
  cycleWidth: number,
  numCycles: number
): string {
  const points: string[] = [];
  points.push(`M${startX},${baselineY}`);

  // Fixed deterministic EMG burst pattern for seamless tiling
  const burstPattern = [
    0, -1, 2, -3, 5, -6, 7, -5, 4, -7, 8, -6, 3, -5, 7, -8, 6, -4,
    3, -6, 8, -7, 5, -3, 2, -4, 6, -5, 3, -2, 1, 0, -1, 2, -1, 0
  ];
  const restPhase1 = 8; // quiet before burst
  const burstLength = burstPattern.length;

  for (let cycle = 0; cycle < numCycles; cycle++) {
    const cycleStartX = startX + cycle * cycleWidth;

    // REST PHASE 1: Quiet baseline with tiny noise
    for (let i = 0; i < restPhase1; i += 2) {
      const x = cycleStartX + i;
      points.push(`L${x},${baselineY}`);
    }

    // BURST PHASE: Fixed deterministic spikes
    const burstStartX = cycleStartX + restPhase1;
    for (let i = 0; i < burstLength; i++) {
      const x = burstStartX + i;
      const y = baselineY + burstPattern[i];
      points.push(`L${x},${y}`);
    }

    // REST PHASE 2: Fill remaining width with quiet baseline
    const rest2StartX = burstStartX + burstLength;
    const remaining = cycleWidth - restPhase1 - burstLength;
    for (let i = 0; i < remaining; i += 2) {
      const x = rest2StartX + i;
      points.push(`L${x},${baselineY}`);
    }

    // End exactly at cycleWidth
    points.push(`L${cycleStartX + cycleWidth},${baselineY}`);
  }

  return points.join(' ');
}

/**
 * Generates ECG signal path with perfectly periodic PQRST for seamless scrolling.
 * All cycles are identical so the scroll animation at exactly 1 cycle width is seamless.
 */
function generateECGPath(
  startX: number,
  baselineY: number,
  cycleWidth: number,
  numCycles: number
): string {
  const points: string[] = [];
  points.push(`M${startX},${baselineY}`);

  // Generate one perfect cycle, then repeat it identically
  for (let cycle = 0; cycle < numCycles; cycle++) {
    const cycleStart = startX + cycle * cycleWidth;

    // Flat baseline to P wave start
    points.push(`L${cycleStart + 4},${baselineY}`);

    // P wave (small atrial depolarization bump)
    points.push(`L${cycleStart + 5},${baselineY - 2}`);
    points.push(`L${cycleStart + 6},${baselineY - 3}`);
    points.push(`L${cycleStart + 8},${baselineY - 2}`);

    // PR segment (flat, isoelectric)
    points.push(`L${cycleStart + 12},${baselineY}`);

    // Q wave (small dip before R)
    points.push(`L${cycleStart + 13},${baselineY + 4}`);

    // R wave (tall sharp spike)
    points.push(`L${cycleStart + 14},${baselineY - 24}`);

    // S wave (dip below baseline)
    points.push(`L${cycleStart + 15},${baselineY + 10}`);

    // Return to baseline (ST segment)
    points.push(`L${cycleStart + 16},${baselineY}`);

    // T wave (ventricular repolarization)
    points.push(`L${cycleStart + 20},${baselineY}`);
    points.push(`L${cycleStart + 22},${baselineY - 3}`);
    points.push(`L${cycleStart + 25},${baselineY - 4}`);
    points.push(`L${cycleStart + 28},${baselineY - 3}`);

    // Return to baseline for rest of cycle
    points.push(`L${cycleStart + 32},${baselineY}`);
    points.push(`L${cycleStart + cycleWidth},${baselineY}`);
  }

  return points.join(' ');
}

export function Home() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allWritings, setAllWritings] = useState<Writing[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [projectCategories, setProjectCategories] = useState<any[]>([]);
  const [writingCategories, setWritingCategories] = useState<any[]>([]);
  const [homeData, setHomeData] = useState<HomeData>(defaultHomeData);
  const [sectionVisibility, setSectionVisibility] = useState({
    writings: { enabled: true, status: 'visible' as 'visible' | 'hidden' | 'development' },
    projects: { enabled: true, status: 'visible' as 'visible' | 'hidden' | 'development' },
    books: { enabled: true, status: 'visible' as 'visible' | 'hidden' | 'development' },
  });
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const { language } = useSiteLanguage();

  const recentProjects = useMemo(() => {
    return allProjects.filter(p => {
      if (p.contentLanguage && p.contentLanguage !== 'bilingual' && p.contentLanguage !== language) return false;
      if (p.contentLanguage === 'bilingual' || !p.contentLanguage) {
        if (!resolveLocalizedText(p.title, language)) return false;
      }
      return true;
    }).slice(0, 3);
  }, [allProjects, language]);

  const recentWritings = useMemo(() => {
    return allWritings.filter(w => {
      if (w.contentLanguage && w.contentLanguage !== 'bilingual' && w.contentLanguage !== language) return false;
      if (w.contentLanguage === 'bilingual' || !w.contentLanguage) {
        if (!resolveLocalizedText(w.title, language)) return false;
      }
      return true;
    }).slice(0, 3);
  }, [allWritings, language]);

  const featuredBooks = useMemo(() => {
    return allBooks.filter(b => {
      if (b.contentLanguage && b.contentLanguage !== 'bilingual' && b.contentLanguage !== language) return false;
      if (b.contentLanguage === 'bilingual' || !b.contentLanguage) {
        if (!resolveLocalizedText(b.title, language)) return false;
      }
      return true;
    }).slice(0, 3);
  }, [allBooks, language]);

  // Generate signal paths once on mount for organic variation
  const emgPath = useMemo(() => generateEMGPath(24, 161, 52, 8), []);
  const ecgPath = useMemo(() => generateECGPath(24, 66, 52, 8), []);

  useEffect(() => {
    api.getPublicHome()
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setHomeData(normalizeHomeData(data));
        }
      })
      .catch(console.error);

    api.getPublicProjects().then((data: Project[]) => setAllProjects(data)).catch(console.error);
    api.getPublicWritings().then((data: Writing[]) => setAllWritings(data)).catch(console.error);
    api.getPublicBooks().then((data: Book[]) => setAllBooks(data)).catch(console.error);
    api.getPublicCategories('projects').then(setProjectCategories).catch(console.error);
    api.getPublicCategories('writings').then(setWritingCategories).catch(console.error);

    api.getPublicSettings().then((settings: PublicSettings) => {
      setSettings(settings);
      setSectionVisibility({
        writings: {
          enabled: settings.sections?.writings?.status ? settings.sections.writings.status !== 'hidden' : settings.sections?.writings?.enabled !== false,
          status: settings.sections?.writings?.status || (settings.sections?.writings?.enabled !== false ? 'visible' : 'hidden')
        },
        projects: {
          enabled: settings.sections?.projects?.status ? settings.sections.projects.status !== 'hidden' : settings.sections?.projects?.enabled !== false,
          status: settings.sections?.projects?.status || (settings.sections?.projects?.enabled !== false ? 'visible' : 'hidden')
        },
        books: {
          enabled: settings.sections?.books?.status ? settings.sections.books.status !== 'hidden' : settings.sections?.books?.enabled !== false,
          status: settings.sections?.books?.status || (settings.sections?.books?.enabled !== false ? 'visible' : 'hidden')
        },
      });
    }).catch(console.error);
  }, []);

  const linkedinUrl = settings?.socialLinks?.linkedin || homeData.socialLinks?.linkedin || 'https://linkedin.com/in/alphonsusadt';
  const githubUrl = settings?.socialLinks?.github || homeData.socialLinks?.github || 'https://github.com/alphonsusadt';
  const emailUrl = settings?.socialLinks?.email || homeData.socialLinks?.email || 'alphonsus@example.com';
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
    <div className="min-h-screen bg-canvas">
      {/* Hero Section */}
      <section className="relative py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="display-xl text-ink">
                  {homeData.heroName[language]}
                  <span className="block text-ink">{homeData.heroLastName[language]}</span>
                </h1>
                <p className="body-lg text-ink">
                  {homeData.heroSubtitle[language]}
                </p>
                <p className="body-lg text-ink opacity-80">
                  {homeData.heroTagline[language]}
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/engineering"
                  className="btn btn-primary inline-flex items-center justify-center space-x-2"
                >
                  <span>{t('home.viewProjects', language)}</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <Link
                  to="/writings"
                  className="btn btn-secondary inline-flex items-center justify-center space-x-2"
                >
                  <span>{t('home.readReflections', language)}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4">
                {showLinkedin && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 text-ink opacity-60 hover:opacity-100 transition-opacity group"
                  >
                    <Linkedin className="w-5 h-5" />
                    <span className="caption">LinkedIn</span>
                  </a>
                )}
                {showGithub && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 text-ink opacity-60 hover:opacity-100 transition-opacity group"
                  >
                    <Github className="w-5 h-5" />
                    <span className="caption">GitHub</span>
                  </a>
                )}
                {showInstagram && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 text-ink opacity-60 hover:opacity-100 transition-opacity group"
                  >
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <span className="caption">Instagram</span>
                  </a>
                )}
                {showTwitter && (
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 text-ink opacity-60 hover:opacity-100 transition-opacity group"
                  >
                    <Twitter className="w-5 h-5 text-sky-400" />
                    <span className="caption">Twitter</span>
                  </a>
                )}
                {showResearchGate && (
                  <a
                    href={researchGateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 text-ink opacity-60 hover:opacity-100 transition-opacity group"
                  >
                    <Globe className="w-5 h-5 text-teal-500" />
                    <span className="caption">ResearchGate</span>
                  </a>
                )}
                {showEmail && (
                  <a
                    href={`mailto:${emailUrl}`}
                    className="flex items-center space-x-2 text-ink opacity-60 hover:opacity-100 transition-opacity group"
                  >
                    <Mail className="w-5 h-5" />
                    <span className="caption">Email</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right Content - Biomedical Robotics Animation */}
            <div className="relative flex items-center justify-center">
              <div className="w-full rounded-2xl overflow-hidden" style={{height: '420px'}}>
                <svg viewBox="0 0 480 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{display:'block'}}>
                  <defs>
                    <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="4" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="2" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-purple" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#2D3A6B" strokeWidth="0.6"/>
                    </pattern>
                    {/* ClipPaths for signal panels */}
                    <clipPath id="ecg-clip"><rect x="24" y="44" width="158" height="44"/></clipPath>
                    <clipPath id="emg-clip"><rect x="24" y="143" width="158" height="36"/></clipPath>
                    {/* Rounded corner clip for entire card */}
                    <clipPath id="card-clip"><rect width="480" height="420" rx="16" ry="16"/></clipPath>
                    <style>{`
                      @keyframes blink-dot {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.2; }
                      }
                      @keyframes arm-rotate1 {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-6deg); }
                      }
                      @keyframes arm-rotate2 {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(7deg); }
                      }
                      @keyframes arm-rotate3 {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-5deg); }
                      }
                      @keyframes signal-pulse {
                        0%, 100% { opacity: 0.4; }
                        50% { opacity: 1; }
                      }
                      @keyframes dash-flow {
                        0% { stroke-dashoffset: 40; }
                        100% { stroke-dashoffset: 0; }
                      }
                      @keyframes fade-in-out {
                        0%, 100% { opacity: 0.2; }
                        50% { opacity: 0.9; }
                      }
                      /* Seamless scroll — shift by exactly 1 cycle width */
                      @keyframes scroll-ecg {
                        from { transform: translateX(0); }
                        to   { transform: translateX(-52px); }
                      }
                      @keyframes scroll-emg {
                        from { transform: translateX(0); }
                        to   { transform: translateX(-52px); }
                      }
                      @keyframes dot-travel {
                        0%   { offset-distance: 0%;   opacity: 0; }
                        8%   { opacity: 1; }
                        92%  { opacity: 1; }
                        100% { offset-distance: 100%; opacity: 0; }
                      }
                      .arm1 {
                        transform-origin: 241px 320px;
                        transform-box: view-box;
                        will-change: transform;
                        animation: arm-rotate1 4s ease-in-out infinite;
                      }
                      .arm2 {
                        transform-origin: 241px 268px;
                        transform-box: view-box;
                        will-change: transform;
                        animation: arm-rotate2 4s ease-in-out infinite 0.3s;
                      }
                      .arm3 {
                        transform-origin: 241px 228px;
                        transform-box: view-box;
                        will-change: transform;
                        animation: arm-rotate3 4s ease-in-out infinite 0.6s;
                      }
                      .scroll-ecg { will-change: transform; animation: scroll-ecg 1.5s linear infinite; }
                      .scroll-emg { will-change: transform; animation: scroll-emg 0.9s linear infinite; }
                      .blink  { animation: blink-dot 1.2s ease-in-out infinite; }
                      .blink2 { animation: blink-dot 1.8s ease-in-out infinite 0.4s; }
                      .pulse-dot { animation: signal-pulse 1.5s ease-in-out infinite; }
                      .flow-dash { animation: dash-flow 1s linear infinite; stroke-dasharray: 6 4; }
                      .fade-loop { animation: fade-in-out 2.5s ease-in-out infinite; }
                      /* ECG → robot dots */
                      .ecg-dot-1 { offset-path: path('M188,58 Q214,143 241,228'); animation: dot-travel 2s linear infinite; }
                      .ecg-dot-2 { offset-path: path('M188,58 Q214,143 241,228'); animation: dot-travel 2s linear infinite 0.67s; }
                      .ecg-dot-3 { offset-path: path('M188,58 Q214,143 241,228'); animation: dot-travel 2s linear infinite 1.34s; }
                      /* EMG → robot dots */
                      .emg-dot-1 { offset-path: path('M188,153 Q214,190 241,228'); animation: dot-travel 1.8s linear infinite; }
                      .emg-dot-2 { offset-path: path('M188,153 Q214,190 241,228'); animation: dot-travel 1.8s linear infinite 0.6s; }
                      .emg-dot-3 { offset-path: path('M188,153 Q214,190 241,228'); animation: dot-travel 1.8s linear infinite 1.2s; }
                      /* Control → robot dots */
                      .ctrl-dot-1 { offset-path: path('M294,62 Q267,130 241,196'); animation: dot-travel 2.2s linear infinite 0.3s; }
                      .ctrl-dot-2 { offset-path: path('M294,62 Q267,130 241,196'); animation: dot-travel 2.2s linear infinite 1.03s; }
                      .ctrl-dot-3 { offset-path: path('M294,62 Q267,130 241,196'); animation: dot-travel 2.2s linear infinite 1.76s; }
                      /* Bio → robot dots */
                      .bio-dot-1 { offset-path: path('M294,174 Q267,200 241,228'); animation: dot-travel 1.6s linear infinite 0.2s; }
                      .bio-dot-2 { offset-path: path('M294,174 Q267,200 241,228'); animation: dot-travel 1.6s linear infinite 0.73s; }
                      .bio-dot-3 { offset-path: path('M294,174 Q267,200 241,228'); animation: dot-travel 1.6s linear infinite 1.26s; }
                    `}</style>
                  </defs>

                  {/* Background */}
                  <defs>
                    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0F172A"/>
                      <stop offset="50%" stopColor="#1E1B4B"/>
                      <stop offset="100%" stopColor="#0C1445"/>
                    </linearGradient>
                  </defs>
                  <g clipPath="url(#card-clip)">
                  <rect width="480" height="420" fill="url(#bg-grad)"/>
                  <rect width="480" height="420" fill="url(#grid)"/>

                  {/* ── ROBOTIC ARM (center-bottom) ── */}
                  {/* Base platform */}
                  <rect x="219" y="340" width="44" height="14" rx="4" fill="#3B82F6" filter="url(#glow-blue)"/>
                  <rect x="233" y="323" width="16" height="20" rx="3" fill="#60A5FA"/>
                  {/* Joint 0 */}
                  <circle cx="241" cy="320" r="7" fill="#93C5FD" filter="url(#glow-blue)"/>

                  <g className="arm1">
                    {/* Segment 1 */}
                    <rect x="237" y="268" width="8" height="54" rx="4" fill="#3B82F6"/>
                    <circle cx="241" cy="268" r="6" fill="#7DD3FC" filter="url(#glow-blue)"/>
                    <g className="arm2">
                      {/* Segment 2 */}
                      <rect x="238" y="228" width="6" height="42" rx="3" fill="#60A5FA"/>
                      <circle cx="241" cy="228" r="5" fill="#BAE6FD" filter="url(#glow-blue)"/>
                      <g className="arm3">
                        {/* Segment 3 */}
                        <rect x="239" y="196" width="4" height="34" rx="2" fill="#7DD3FC"/>
                        <circle cx="241" cy="196" r="4" fill="#E0F2FE" filter="url(#glow-blue)"/>
                        {/* Gripper */}
                        <line x1="237" y1="190" x2="231" y2="183" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="245" y1="190" x2="251" y2="183" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round"/>
                        <circle cx="241" cy="186" r="4" fill="#38BDF8" className="pulse-dot" filter="url(#glow-blue)"/>
                      </g>
                    </g>
                  </g>

                  {/* ── ECG PANEL — seamless scrolling PQRST ── */}
                  <rect x="18" y="18" width="170" height="80" rx="10" fill="rgba(15,23,42,0.85)" stroke="#34D399" strokeWidth="1.5"/>
                  <text x="30" y="36" fontSize="9" fill="#6EE7B7" fontFamily="monospace" fontWeight="bold">ECG SIGNAL</text>
                  <text x="156" y="34" fontSize="7" fill="#4ADE80" fontFamily="monospace" fontWeight="bold">● LIVE</text>
                  <rect x="24" y="44" width="158" height="44" rx="4" fill="rgba(2,6,23,0.7)"/>
                  {/* Clip + scroll: path is 8 cycles × 52px = 416px; animate by -52px */}
                  <g clipPath="url(#ecg-clip)">
                    <g className="scroll-ecg">
                      <path
                        d={ecgPath}
                        stroke="#4ADE80" strokeWidth="1.2" fill="none"
                      />
                    </g>
                  </g>

                  {/* ── EMG PANEL — stochastic noise bursts (muscle activation) ── */}
                  <rect x="18" y="118" width="170" height="70" rx="10" fill="rgba(15,23,42,0.85)" stroke="#C084FC" strokeWidth="1.5"/>
                  <text x="30" y="136" fontSize="9" fill="#E879F9" fontFamily="monospace" fontWeight="bold">EMG SIGNAL</text>
                  <text x="154" y="134" fontSize="7" fill="#C084FC" fontFamily="monospace" fontWeight="bold">● LIVE</text>
                  <rect x="24" y="143" width="158" height="36" rx="4" fill="rgba(2,6,23,0.7)"/>
                  {/* Clip + scroll: deterministic bursts with quiet rest periods */}
                  <g clipPath="url(#emg-clip)">
                    <g className="scroll-emg">
                      <path
                        d={emgPath}
                        stroke="#E879F9" strokeWidth="1.5" fill="none"
                      />
                    </g>
                  </g>

                  {/* ── TRAVELLING DOTS on all connections ── */}
                  {/* ECG → robot */}
                  <path d="M188,58 Q214,143 241,228" stroke="#4ADE80" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#4ADE80" className="ecg-dot-1"/>
                  <circle r="2.5" fill="#4ADE80" className="ecg-dot-2"/>
                  <circle r="2.5" fill="#4ADE80" className="ecg-dot-3"/>
                  {/* EMG → robot */}
                  <path d="M188,153 Q214,190 241,228" stroke="#C084FC" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#E879F9" className="emg-dot-1"/>
                  <circle r="2.5" fill="#E879F9" className="emg-dot-2"/>
                  <circle r="2.5" fill="#E879F9" className="emg-dot-3"/>

                  {/* ── CONTROL SYSTEM (top right) - Closed-Loop Feedback ── */}
                  <rect x="294" y="18" width="170" height="90" rx="10" fill="rgba(15,23,42,0.85)" stroke="#38BDF8" strokeWidth="1.5"/>
                  <text x="306" y="36" fontSize="9" fill="#7DD3FC" fontFamily="monospace" fontWeight="bold">CONTROL SYSTEM</text>

                  {/* REF Node */}
                  <rect x="302" y="46" width="26" height="18" rx="3" fill="#0E4872"/>
                  <text x="315" y="58" fontSize="6.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">REF</text>

                  {/* Arrow: REF -> SUM */}
                  <line x1="328" y1="55" x2="336" y2="55" stroke="#38BDF8" strokeWidth="1.2" className="flow-dash"/>
                  <polygon points="336,55 333,52.5 333,57.5" fill="#38BDF8"/>

                  {/* SUM (Error) Circle with Σ symbol */}
                  <circle cx="344" cy="55" r="7" fill="none" stroke="#38BDF8" strokeWidth="1.5"/>
                  <text x="344" y="58.5" fontSize="9" fill="#7DD3FC" textAnchor="middle" fontFamily="monospace">Σ</text>
                  {/* Plus sign indicator on left input */}
                  <text x="334" y="50" fontSize="5" fill="#4ADE80" fontFamily="monospace">+</text>
                  {/* Minus sign indicator on bottom (feedback) input */}
                  <text x="339" y="68" fontSize="6" fill="#F87171" fontFamily="monospace">−</text>

                  {/* Arrow: SUM -> PID */}
                  <line x1="351" y1="55" x2="359" y2="55" stroke="#38BDF8" strokeWidth="1.2" className="flow-dash"/>
                  <polygon points="359,55 356,52.5 356,57.5" fill="#38BDF8"/>

                  {/* CONTROLLER (PID) Node */}
                  <rect x="360" y="46" width="32" height="18" rx="3" fill="#0E4872"/>
                  <text x="376" y="58" fontSize="6.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">PID</text>

                  {/* Arrow: PID -> PLANT */}
                  <line x1="392" y1="55" x2="400" y2="55" stroke="#38BDF8" strokeWidth="1.2" className="flow-dash"/>
                  <polygon points="400,55 397,52.5 397,57.5" fill="#38BDF8"/>

                  {/* PLANT Node */}
                  <rect x="401" y="46" width="40" height="18" rx="3" fill="#0E4872"/>
                  <text x="421" y="58" fontSize="6.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">PLANT</text>

                  {/* Output arrow from PLANT */}
                  <line x1="441" y1="55" x2="450" y2="55" stroke="#38BDF8" strokeWidth="1.2"/>
                  <polygon points="450,55 447,52.5 447,57.5" fill="#38BDF8"/>
                  <text x="455" y="58" fontSize="5" fill="#7DD3FC" fontFamily="monospace">y</text>

                  {/* FEEDBACK PATH (dashed, clearly visible) - curves from output back down to SUM */}
                  <path
                    d="M448,55 Q456,55 456,70 Q456,82 421,82 Q380,82 344,82 L344,62"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 2"
                    className="fade-loop"
                  />
                  {/* Arrow at end of feedback (pointing up into SUM) */}
                  <polygon points="344,62 341,66 347,66" fill="#38BDF8"/>
                  {/* Minus sign at feedback arrow entry point (negative feedback indicator) */}
                  <text x="350" y="65" fontSize="8" fill="#F87171" fontFamily="monospace" fontWeight="bold">−</text>

                  {/* Feedback label */}
                  <text x="400" y="90" fontSize="6" fill="#7DD3FC" textAnchor="middle" fontFamily="monospace">feedback</text>

                  {/* ── SENSOR NODE (bottom right) ── */}
                  <rect x="294" y="124" width="170" height="90" rx="10" fill="rgba(15,23,42,0.85)" stroke="#FCD34D" strokeWidth="1.5"/>
                  <text x="306" y="142" fontSize="9" fill="#FDE68A" fontFamily="monospace" fontWeight="bold">BIOSENSORS</text>
                  {/* Pulse rings — centered at x=318 y=174, max r=14 stays within panel */}
                  <g transform="translate(318, 174)">
                    <circle r="14" fill="none" stroke="#FBBF24" strokeWidth="1" opacity="0.25" className="fade-loop"/>
                    <circle r="9" fill="none" stroke="#FBBF24" strokeWidth="1.2" opacity="0.55" className="fade-loop" style={{animationDelay:'0.4s'}}/>
                    <circle r="4.5" fill="none" stroke="#FCD34D" strokeWidth="1.8" opacity="0.85" className="fade-loop" style={{animationDelay:'0.8s'}}/>
                    <circle r="2.5" fill="#FDE68A" className="pulse-dot" filter="url(#glow-blue)"/>
                  </g>
                  {/* Labels to the right of pulse */}
                  <text x="338" y="157" fontSize="7.5" fill="#FDE68A" fontFamily="monospace">SpO₂   EMG   EEG</text>
                  <text x="338" y="169" fontSize="7.5" fill="#FCD34D" fontFamily="monospace">98%  0.4mV  12Hz</text>
                  <text x="338" y="181" fontSize="7.5" fill="#94A3B8" fontFamily="monospace">STATUS: ACTIVE</text>
                  {/* Status dots */}
                  <circle cx="340" cy="196" r="3.5" fill="#4ADE80" className="pulse-dot" style={{animationDelay:'0.3s'}}/>
                  <circle cx="357" cy="196" r="3.5" fill="#E879F9" className="pulse-dot" style={{animationDelay:'0.7s'}}/>
                  <circle cx="374" cy="196" r="3.5" fill="#38BDF8" className="pulse-dot" style={{animationDelay:'1.1s'}}/>
                  <circle cx="391" cy="196" r="3.5" fill="#FCD34D" className="pulse-dot" style={{animationDelay:'1.5s'}}/>

                  {/* ── CONNECTING LINES ── */}
                  {/* Control → robot */}
                  <path d="M294,62 Q267,130 241,196" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#38BDF8" className="ctrl-dot-1"/>
                  <circle r="2.5" fill="#38BDF8" className="ctrl-dot-2"/>
                  <circle r="2.5" fill="#38BDF8" className="ctrl-dot-3"/>
                  {/* Biosensor → robot */}
                  <path d="M294,174 Q267,200 241,228" stroke="#FBBF24" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#FCD34D" className="bio-dot-1"/>
                  <circle r="2.5" fill="#FCD34D" className="bio-dot-2"/>
                  <circle r="2.5" fill="#FCD34D" className="bio-dot-3"/>

                  {/* ── LABEL ── */}
                  <text x="240" y="382" fontSize="8.5" fill="#64748B" textAnchor="middle" fontFamily="monospace" letterSpacing="2">BIOMEDICAL ROBOTICS · SIGNAL SYSTEMS</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects Section */}
      {sectionVisibility.projects.status !== 'hidden' ? (
      <section className="mb-[96px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-block-lime color-block-section">
            <div className="mb-12">
              <h2 className="display-lg text-ink mb-4">
                {homeData.sections.recentProjects.title[language]}
              </h2>
              <p className="subhead text-ink max-w-2xl">
                {homeData.sections.recentProjects.subtitle[language]}
              </p>
            </div>

            {sectionVisibility.projects.status === 'development' ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0F172A] p-8 md:p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-3 max-w-lg z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-[#F8FAFC]">
                    {language === 'en' ? 'Section Under Construction' : 'Seksi dalam Pengembangan'}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {language === 'en' 
                      ? 'I am currently designing and building this section to showcase exciting new content. Direct access is disabled until it goes live, but stay tuned!'
                      : 'Saya sedang merancang dan membangun bagian ini untuk menampilkan konten baru yang menarik. Akses penuh dinonaktifkan sementara waktu.'
                    }
                  </p>
                </div>
                <Link
                  to="/engineering"
                  className="btn btn-secondary inline-flex items-center space-x-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 z-10"
                >
                  <span>{language === 'en' ? 'Preview Section' : 'Pratinjau Seksi'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {recentProjects.map((project) => {
                    const catItem = projectCategories.find(c => c.value === project.category);
                    return (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        categoryIcon={catItem?.icon}
                      />
                    );
                  })}
                </div>

                <div className="text-center mt-12">
                  <Link
                    to="/engineering"
                    className="btn btn-primary inline-flex items-center space-x-2"
                  >
                    <span>{t('home.viewAllProjects', language)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {/* Recent Writings Section */}
      {sectionVisibility.writings.status !== 'hidden' ? (
      <section className="mb-[96px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-block-lilac color-block-section">
            <div className="mb-12">
              <h2 className="display-lg text-ink mb-4">
                {homeData.sections.recentWritings.title[language]}
              </h2>
              <p className="subhead text-ink max-w-2xl">
                {homeData.sections.recentWritings.subtitle[language]}
              </p>
            </div>

            {sectionVisibility.writings.status === 'development' ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0F172A] p-8 md:p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-3 max-w-lg z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-[#F8FAFC]">
                    {language === 'en' ? 'Section Under Construction' : 'Seksi dalam Pengembangan'}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {language === 'en' 
                      ? 'I am currently designing and building this section to showcase exciting new content. Direct access is disabled until it goes live, but stay tuned!'
                      : 'Saya sedang merancang dan membangun bagian ini untuk menampilkan konten baru yang menarik. Akses penuh dinonaktifkan sementara waktu.'
                    }
                  </p>
                </div>
                <Link
                  to="/writings"
                  className="btn btn-secondary inline-flex items-center space-x-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 z-10"
                >
                  <span>{language === 'en' ? 'Preview Section' : 'Pratinjau Seksi'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {recentWritings.map((writing) => {
                    const catItem = writingCategories.find(c => c.value === writing.category);
                    return (
                      <WritingCard 
                        key={writing.id} 
                        writing={writing} 
                        categoryIcon={catItem?.icon}
                      />
                    );
                  })}
                </div>

                <div className="text-center mt-12">
                  <Link
                    to="/writings"
                    className="btn btn-primary inline-flex items-center space-x-2"
                  >
                    <span>{t('home.readAllWritings', language)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {/* Featured Books Section */}
      {sectionVisibility.books.status !== 'hidden' ? (
      <section className="mb-[96px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-block-cream color-block-section">
            <div className="mb-12">
              <h2 className="display-lg text-ink mb-4">
                {homeData.sections.featuredBooks.title[language]}
              </h2>
              <p className="subhead text-ink max-w-2xl">
                {homeData.sections.featuredBooks.subtitle[language]}
              </p>
            </div>

            {sectionVisibility.books.status === 'development' ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0F172A] p-8 md:p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-3 max-w-lg z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-[#F8FAFC]">
                    {language === 'en' ? 'Section Under Construction' : 'Seksi dalam Pengembangan'}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {language === 'en' 
                      ? 'I am currently designing and building this section to showcase exciting new content. Direct access is disabled until it goes live, but stay tuned!'
                      : 'Saya sedang merancang dan membangun bagian ini untuk menampilkan konten baru yang menarik. Akses penuh dinonaktifkan sementara waktu.'
                    }
                  </p>
                </div>
                <Link
                  to="/library"
                  className="btn btn-secondary inline-flex items-center space-x-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 z-10"
                >
                  <span>{language === 'en' ? 'Preview Section' : 'Pratinjau Seksi'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>

                <div className="text-center mt-12">
                  <Link
                    to="/library"
                    className="btn btn-primary inline-flex items-center space-x-2"
                  >
                    <span>{t('home.browseLibrary', language)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}