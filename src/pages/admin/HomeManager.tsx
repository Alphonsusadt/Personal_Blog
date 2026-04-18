import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Save, CheckCircle } from 'lucide-react';

type Language = 'en' | 'id';
type LocalizedText = { en: string; id: string };

const emptyLocalizedText: LocalizedText = { en: '', id: '' };

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

const defaultData: HomeData = {
  heroName: { ...emptyLocalizedText },
  heroLastName: { ...emptyLocalizedText },
  heroSubtitle: { ...emptyLocalizedText },
  heroTagline: { ...emptyLocalizedText },
  socialLinks: { linkedin: '', github: '', email: '' },
  sections: {
    recentProjects: { title: { ...emptyLocalizedText }, subtitle: { ...emptyLocalizedText } },
    recentWritings: { title: { ...emptyLocalizedText }, subtitle: { ...emptyLocalizedText } },
    featuredBooks: { title: { ...emptyLocalizedText }, subtitle: { ...emptyLocalizedText } },
  },
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
    heroName: asLocalizedText(data.heroName),
    heroLastName: asLocalizedText(data.heroLastName),
    heroSubtitle: asLocalizedText(data.heroSubtitle),
    heroTagline: asLocalizedText(data.heroTagline),
    socialLinks: {
      linkedin: typeof socialLinks.linkedin === 'string' ? socialLinks.linkedin : '',
      github: typeof socialLinks.github === 'string' ? socialLinks.github : '',
      email: typeof socialLinks.email === 'string' ? socialLinks.email : '',
    },
    sections: {
      recentProjects: parseSection('recentProjects'),
      recentWritings: parseSection('recentWritings'),
      featuredBooks: parseSection('featuredBooks'),
    },
  };
};

export function HomeManager() {
  const [data, setData] = useState<HomeData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    api
      .get('/api/home')
      .then((d) => {
        if (d && Object.keys(d).length > 0) {
          setData(normalizeHomeData(d));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateLocalized = (field: keyof Pick<HomeData, 'heroName' | 'heroLastName' | 'heroSubtitle' | 'heroTagline'>, value: string) => {
    setData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  };

  const updateSectionLocalized = (
    section: keyof HomeData['sections'],
    field: 'title' | 'subtitle',
    value: string,
  ) => {
    setData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [field]: {
            ...prev.sections[section][field],
            [lang]: value,
          },
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      await api.put('/api/home', data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  if (loading) return <p className="text-[#94A3B8]">Loading...</p>;

  const inputCls = "w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#60A5FA]";
  const labelCls = "block text-sm text-[#94A3B8] mb-1";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Home Page</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-[#334155] overflow-hidden">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-2 text-xs font-semibold ${lang === 'en' ? 'bg-[#1E40AF] text-white' : 'text-[#94A3B8]'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('id')}
              className={`px-3 py-2 text-xs font-semibold ${lang === 'id' ? 'bg-[#1E40AF] text-white' : 'text-[#94A3B8]'}`}
            >
              ID
            </button>
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 bg-[#1E40AF] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]">
            {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Hero Section</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>First Name ({lang.toUpperCase()})</label><input value={data.heroName[lang]} onChange={e => updateLocalized('heroName', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Last Name ({lang.toUpperCase()})</label><input value={data.heroLastName[lang]} onChange={e => updateLocalized('heroLastName', e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Subtitle ({lang.toUpperCase()})</label><input value={data.heroSubtitle[lang]} onChange={e => updateLocalized('heroSubtitle', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Tagline ({lang.toUpperCase()})</label><input value={data.heroTagline[lang]} onChange={e => updateLocalized('heroTagline', e.target.value)} className={inputCls} /></div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Social Links</h2>
          <div className="space-y-4">
            <div><label className={labelCls}>LinkedIn URL</label><input value={data.socialLinks.linkedin} onChange={e => setData({ ...data, socialLinks: { ...data.socialLinks, linkedin: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>GitHub URL</label><input value={data.socialLinks.github} onChange={e => setData({ ...data, socialLinks: { ...data.socialLinks, github: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input value={data.socialLinks.email} onChange={e => setData({ ...data, socialLinks: { ...data.socialLinks, email: e.target.value } })} className={inputCls} /></div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Section Titles</h2>
          <div className="space-y-6">
            {(['recentProjects', 'recentWritings', 'featuredBooks'] as const).map(key => (
              <div key={key} className="bg-[#0F172A] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#60A5FA] mb-3">{key === 'recentProjects' ? 'Recent Projects' : key === 'recentWritings' ? 'Recent Writings' : 'Featured Books'}</h3>
                <div className="space-y-3">
                  <div><label className={labelCls}>Title ({lang.toUpperCase()})</label><input value={data.sections[key].title[lang]} onChange={e => updateSectionLocalized(key, 'title', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Subtitle ({lang.toUpperCase()})</label><input value={data.sections[key].subtitle[lang]} onChange={e => updateSectionLocalized(key, 'subtitle', e.target.value)} className={inputCls} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
