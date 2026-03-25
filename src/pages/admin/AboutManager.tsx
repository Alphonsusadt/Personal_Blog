import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Save, Plus, X, CheckCircle } from 'lucide-react';

interface AboutData {
  title: string;
  subtitle: string;
  bio: string;
  gpa: string;
  projectsCount: string;
  story: { whyBME: string; faithAndEngineering: string; currentFocus: string };
  skills: { programming: string[]; specializations: string[]; academicInterests: string[]; personalInterests: string[] };
  education: { title: string; institution: string; year: string; description: string }[];
  quote: string;
  socialLinks: { linkedin: string; github: string; email: string };
}

const defaultData: AboutData = {
  title: '', subtitle: '', bio: '', gpa: '', projectsCount: '',
  story: { whyBME: '', faithAndEngineering: '', currentFocus: '' },
  skills: { programming: [], specializations: [], academicInterests: [], personalInterests: [] },
  education: [],
  quote: '',
  socialLinks: { linkedin: '', github: '', email: '' },
};

export function AboutManager() {
  const [data, setData] = useState<AboutData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [skillInputs, setSkillInputs] = useState({ programming: '', specializations: '', academicInterests: '', personalInterests: '' });

  useEffect(() => {
    api.get('/api/about').then(d => { if (d && d.title) setData(d); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/api/about', data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  const addSkill = (key: keyof typeof skillInputs) => {
    const val = skillInputs[key].trim();
    if (!val) return;
    setData({ ...data, skills: { ...data.skills, [key]: [...data.skills[key], val] } });
    setSkillInputs({ ...skillInputs, [key]: '' });
  };

  const removeSkill = (key: keyof AboutData['skills'], i: number) => {
    setData({ ...data, skills: { ...data.skills, [key]: data.skills[key].filter((_, idx) => idx !== i) } });
  };

  const addEducation = () => {
    setData({ ...data, education: [...data.education, { title: '', institution: '', year: '', description: '' }] });
  };

  const updateEducation = (i: number, field: string, value: string) => {
    const edu = [...data.education];
    edu[i] = { ...edu[i], [field]: value };
    setData({ ...data, education: edu });
  };

  const removeEducation = (i: number) => {
    setData({ ...data, education: data.education.filter((_, idx) => idx !== i) });
  };

  if (loading) return <p className="text-[#94A3B8]">Loading...</p>;

  const inputCls = "w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#60A5FA]";
  const labelCls = "block text-sm text-[#94A3B8] mb-1";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">About Page</h1>
        <button onClick={handleSave} className="flex items-center gap-2 bg-[#1E40AF] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]">
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>

      <div className="space-y-8">
        {/* Header */}
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Header</h2>
          <div className="space-y-4">
            <div><label className={labelCls}>Title</label><input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Subtitle</label><input value={data.subtitle} onChange={e => setData({ ...data, subtitle: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Bio</label><textarea value={data.bio} onChange={e => setData({ ...data, bio: e.target.value })} rows={3} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>GPA</label><input value={data.gpa} onChange={e => setData({ ...data, gpa: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Projects Count</label><input value={data.projectsCount} onChange={e => setData({ ...data, projectsCount: e.target.value })} className={inputCls} /></div>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">My Story</h2>
          <div className="space-y-4">
            <div><label className={labelCls}>Why Biomedical Engineering?</label><textarea value={data.story.whyBME} onChange={e => setData({ ...data, story: { ...data.story, whyBME: e.target.value } })} rows={4} className={inputCls} /></div>
            <div><label className={labelCls}>Faith and Engineering</label><textarea value={data.story.faithAndEngineering} onChange={e => setData({ ...data, story: { ...data.story, faithAndEngineering: e.target.value } })} rows={4} className={inputCls} /></div>
            <div><label className={labelCls}>Current Focus</label><textarea value={data.story.currentFocus} onChange={e => setData({ ...data, story: { ...data.story, currentFocus: e.target.value } })} rows={3} className={inputCls} /></div>
          </div>
        </section>

        {/* Skills */}
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Skills & Interests</h2>
          {(['programming', 'specializations', 'academicInterests', 'personalInterests'] as const).map(key => (
            <div key={key} className="mb-4">
              <label className={labelCls}>{key === 'programming' ? 'Programming Languages' : key === 'specializations' ? 'Specializations' : key === 'academicInterests' ? 'Academic Interests' : 'Personal Interests'}</label>
              <div className="flex gap-2 mb-2 flex-wrap">{data.skills[key].map((s, i) => <span key={i} className="flex items-center gap-1 bg-[#0F172A] text-[#60A5FA] text-xs px-2 py-1 rounded">{s}<button onClick={() => removeSkill(key, i)} className="hover:text-red-400"><X className="w-3 h-3" /></button></span>)}</div>
              <div className="flex gap-2"><input value={skillInputs[key]} onChange={e => setSkillInputs({ ...skillInputs, [key]: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill(key))} placeholder="Add..." className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#60A5FA]" /><button onClick={() => addSkill(key)} className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg text-sm">Add</button></div>
            </div>
          ))}
        </section>

        {/* Education */}
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Education</h2>
            <button onClick={addEducation} className="flex items-center gap-1 text-[#60A5FA] text-sm hover:underline"><Plus className="w-4 h-4" /> Add</button>
          </div>
          <div className="space-y-4">
            {data.education.map((edu, i) => (
              <div key={i} className="bg-[#0F172A] rounded-lg p-4 relative">
                <button onClick={() => removeEducation(i)} className="absolute top-2 right-2 text-[#94A3B8] hover:text-red-400"><X className="w-4 h-4" /></button>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={edu.title} onChange={e => updateEducation(i, 'title', e.target.value)} placeholder="Title" className={inputCls} />
                  <input value={edu.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} placeholder="Institution" className={inputCls} />
                </div>
                <input value={edu.year} onChange={e => updateEducation(i, 'year', e.target.value)} placeholder="Year" className={`${inputCls} mb-3`} />
                <textarea value={edu.description} onChange={e => updateEducation(i, 'description', e.target.value)} placeholder="Description" rows={2} className={inputCls} />
              </div>
            ))}
          </div>
        </section>

        {/* Quote & Social */}
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Quote & Social Links</h2>
          <div className="space-y-4">
            <div><label className={labelCls}>Philosophy Quote</label><textarea value={data.quote} onChange={e => setData({ ...data, quote: e.target.value })} rows={3} className={inputCls} /></div>
            <div><label className={labelCls}>LinkedIn URL</label><input value={data.socialLinks.linkedin} onChange={e => setData({ ...data, socialLinks: { ...data.socialLinks, linkedin: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>GitHub URL</label><input value={data.socialLinks.github} onChange={e => setData({ ...data, socialLinks: { ...data.socialLinks, github: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input value={data.socialLinks.email} onChange={e => setData({ ...data, socialLinks: { ...data.socialLinks, email: e.target.value } })} className={inputCls} /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
