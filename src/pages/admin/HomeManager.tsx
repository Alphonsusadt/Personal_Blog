import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Save, CheckCircle } from 'lucide-react';

interface HomeData {
  heroName: string;
  heroLastName: string;
  heroSubtitle: string;
  heroTagline: string;
  socialLinks: { linkedin: string; github: string; email: string };
  sections: {
    recentProjects: { title: string; subtitle: string };
    recentWritings: { title: string; subtitle: string };
    featuredBooks: { title: string; subtitle: string };
  };
}

const defaultData: HomeData = {
  heroName: '', heroLastName: '', heroSubtitle: '', heroTagline: '',
  socialLinks: { linkedin: '', github: '', email: '' },
  sections: {
    recentProjects: { title: '', subtitle: '' },
    recentWritings: { title: '', subtitle: '' },
    featuredBooks: { title: '', subtitle: '' },
  },
};

export function HomeManager() {
  const [data, setData] = useState<HomeData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/home').then(d => { if (d && d.heroName) setData(d); }).catch(console.error).finally(() => setLoading(false));
  }, []);

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
        <button onClick={handleSave} className="flex items-center gap-2 bg-[#1E40AF] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]">
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>

      <div className="space-y-8">
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Hero Section</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>First Name</label><input value={data.heroName} onChange={e => setData({ ...data, heroName: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Last Name</label><input value={data.heroLastName} onChange={e => setData({ ...data, heroLastName: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Subtitle</label><input value={data.heroSubtitle} onChange={e => setData({ ...data, heroSubtitle: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Tagline</label><input value={data.heroTagline} onChange={e => setData({ ...data, heroTagline: e.target.value })} className={inputCls} /></div>
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
                  <div><label className={labelCls}>Title</label><input value={data.sections[key].title} onChange={e => setData({ ...data, sections: { ...data.sections, [key]: { ...data.sections[key], title: e.target.value } } })} className={inputCls} /></div>
                  <div><label className={labelCls}>Subtitle</label><input value={data.sections[key].subtitle} onChange={e => setData({ ...data, sections: { ...data.sections, [key]: { ...data.sections[key], subtitle: e.target.value } } })} className={inputCls} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
