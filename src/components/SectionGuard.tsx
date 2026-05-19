import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PageLoader } from './PageLoader';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { ChevronLeft } from 'lucide-react';

interface SectionGuardProps {
  sectionKey: 'projects' | 'writings' | 'books';
  children: React.ReactNode;
}

export function SectionGuard({ sectionKey, children }: SectionGuardProps) {
  const [status, setStatus] = useState<'loading' | 'visible' | 'hidden' | 'development'>('loading');
  const { language } = useSiteLanguage();

  useEffect(() => {
    api.getPublicSettings()
      .then((settings) => {
        const sec = settings?.sections?.[sectionKey];
        const currentStatus = sec?.status || (sec?.enabled !== false ? 'visible' : 'hidden');
        setStatus(currentStatus as 'visible' | 'hidden' | 'development');
      })
      .catch(() => {
        setStatus('visible'); // Fallback to visible if call fails
      });
  }, [sectionKey]);

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (status === 'hidden') {
    return <Navigate to="/" replace />;
  }

  if (status === 'development') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-canvas px-6 py-12 text-center">
        <div className="max-w-xl w-full space-y-8 flex flex-col items-center">
          {/* Stunning under construction visual with biological / technical grid motif */}
          <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border border-amber-500/20 bg-[#0F172A] shadow-2xl flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent animate-pulse pointer-events-none" />
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F59E0B 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            {/* Animated medical-signal-like sine wave loop representing active development */}
            <svg className="w-40 h-24 text-amber-500 z-10" viewBox="0 0 100 40">
              <path
                d="M0,20 L30,20 L33,14 L36,26 L39,20 L50,20 L53,4 L56,36 L59,20 L70,20 L73,16 L76,24 L79,20 L100,20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
                style={{ strokeDasharray: '300', strokeDashoffset: '0' }}
              />
            </svg>

            {/* Glowing developer emblem */}
            <div className="absolute bottom-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold tracking-wider uppercase z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>In Dev</span>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink">
              {language === 'en' ? 'Section Under Construction' : 'Seksi dalam Pengembangan'}
            </h1>
            <p className="text-base text-ink opacity-70 leading-relaxed max-w-md mx-auto">
              {language === 'en'
                ? 'I am currently designing and building this section to showcase exciting new content. Direct access is disabled until it goes live, but stay tuned!'
                : 'Saya sedang merancang dan membangun bagian ini untuk menampilkan konten baru yang menarik. Akses penuh dinonaktifkan sementara waktu.'
              }
            </p>
          </div>

          <Link
            to="/"
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{language === 'en' ? 'Back to Home' : 'Kembali ke Beranda'}</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
