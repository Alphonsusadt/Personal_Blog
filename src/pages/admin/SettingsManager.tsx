import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Save, CheckCircle, Key, Clock, AlertCircle } from 'lucide-react';
import { useAdminAutosave } from '../../hooks/useAdminAutosave';
import { AutoFixButton } from '../../components/AutoFixButton';
import { normalizeLocalizedText, LocalizedText } from '../../lib/localized';

interface SectionSetting {
  enabled: boolean;
  status: 'visible' | 'hidden' | 'development';
}

interface SettingsData {
  siteTitle: string;
  footerName: string;
  footerBio: LocalizedText;
  footerTagline: string;
  sections: {
    writings: SectionSetting;
    projects: SectionSetting;
    books: SectionSetting;
  };
  senderEmails?: string[];
  activeSenderEmail?: string;
  socialLinks?: {
    linkedin: string;
    github: string;
    instagram: string;
    twitter: string;
    researchgate: string;
    email: string;
  };
  socialVisibility?: {
    linkedin: boolean;
    github: boolean;
    instagram: boolean;
    twitter: boolean;
    researchgate: boolean;
    email: boolean;
  };
}

const hasMeaningfulSettingsData = (value: SettingsData): boolean => {
  return Boolean(
    value.siteTitle.trim() ||
    value.footerName.trim() ||
    (value.footerBio.en?.trim() || value.footerBio.id?.trim()) ||
    value.footerTagline.trim() ||
    value.sections.writings.status !== 'hidden' ||
    value.sections.projects.status !== 'hidden' ||
    value.sections.books.status !== 'hidden'
  );
};

export function SettingsManager() {
  const [data, setData] = useState<SettingsData>({
    siteTitle: '',
    footerName: '',
    footerBio: { en: '', id: '' },
    footerTagline: '',
    sections: {
      writings: { enabled: true, status: 'visible' },
      projects: { enabled: true, status: 'visible' },
      books: { enabled: true, status: 'visible' },
    },
    senderEmails: [],
    activeSenderEmail: '',
    socialLinks: {
      linkedin: '',
      github: '',
      instagram: '',
      twitter: '',
      researchgate: '',
      email: '',
    },
    socialVisibility: {
      linkedin: true,
      github: true,
      instagram: true,
      twitter: true,
      researchgate: true,
      email: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  const saveSettingsToServer = useCallback(async (nextData: SettingsData) => {
    await api.put('/api/settings', nextData);
  }, []);

  const {
    status: autosaveStatus,
    errorMessage: autosaveError,
    saveNow,
  } = useAdminAutosave<SettingsData>({
    storageKey: 'cms_admin_settings',
    data,
    enabled: !loading,
    saveToServer: saveSettingsToServer,
    hasMeaningfulData: hasMeaningfulSettingsData,
  });

  useEffect(() => {
    api.get('/api/settings').then((d) => {
      if (!d) return;
      setData((prev) => ({
        ...prev,
        ...d,
        footerBio: normalizeLocalizedText(d.footerBio),
        sections: {
          writings: {
            enabled: d.sections?.writings?.status ? d.sections.writings.status !== 'hidden' : d.sections?.writings?.enabled !== false,
            status: d.sections?.writings?.status || (d.sections?.writings?.enabled !== false ? 'visible' : 'hidden')
          },
          projects: {
            enabled: d.sections?.projects?.status ? d.sections.projects.status !== 'hidden' : d.sections?.projects?.enabled !== false,
            status: d.sections?.projects?.status || (d.sections?.projects?.enabled !== false ? 'visible' : 'hidden')
          },
          books: {
            enabled: d.sections?.books?.status ? d.sections.books.status !== 'hidden' : d.sections?.books?.enabled !== false,
            status: d.sections?.books?.status || (d.sections?.books?.enabled !== false ? 'visible' : 'hidden')
          },
        },
        senderEmails: Array.isArray(d.senderEmails) ? d.senderEmails : [],
        activeSenderEmail: typeof d.activeSenderEmail === 'string' ? d.activeSenderEmail : '',
        socialLinks: {
          linkedin: d.socialLinks?.linkedin || '',
          github: d.socialLinks?.github || '',
          instagram: d.socialLinks?.instagram || '',
          twitter: d.socialLinks?.twitter || '',
          researchgate: d.socialLinks?.researchgate || '',
          email: d.socialLinks?.email || '',
        },
        socialVisibility: {
          linkedin: d.socialVisibility?.linkedin !== false,
          github: d.socialVisibility?.github !== false,
          instagram: d.socialVisibility?.instagram !== false,
          twitter: d.socialVisibility?.twitter !== false,
          researchgate: d.socialVisibility?.researchgate !== false,
          email: d.socialVisibility?.email !== false,
        },
      }));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await saveNow();
    } catch (err) { console.error(err); }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    try {
      await api.post('/api/auth/change-password', {
        username: localStorage.getItem('cms_user') || 'admin',
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMsg('Password updated successfully');
      setPasswordForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch {
      setPasswordMsg('Failed to update password. Check current password.');
    }
    setTimeout(() => setPasswordMsg(''), 3000);
  };

  if (loading) return <p className="text-[#94A3B8]">Loading...</p>;

  const inputCls = "w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#60A5FA]";
  const labelCls = "block text-sm text-[#94A3B8] mb-1";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Settings</h1>
        <button onClick={handleSave} className="flex items-center gap-2 bg-[#1E40AF] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]">
          {autosaveStatus === 'saving' ? <><Clock className="w-4 h-4 animate-spin" /> Saving...</> : null}
          {autosaveStatus === 'saved' ? <><CheckCircle className="w-4 h-4" /> Saved!</> : null}
          {autosaveStatus === 'error' ? <><AlertCircle className="w-4 h-4" /> Retry Save</> : null}
          {autosaveStatus === 'idle' ? <><Save className="w-4 h-4" /> Save</> : null}
        </button>
      </div>

      {autosaveError ? (
        <p className="mb-4 text-sm text-red-400">Autosave error: {autosaveError}</p>
      ) : null}

      <div className="space-y-8">
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Site Settings</h2>
          <div className="space-y-4">
            <div><label className={labelCls}>Site Title</label><input value={data.siteTitle} onChange={e => setData({ ...data, siteTitle: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Footer Name</label><input value={data.footerName} onChange={e => setData({ ...data, footerName: e.target.value })} className={inputCls} /></div>
            <div>
              <label className={labelCls}>Footer Bio (English)</label>
              <textarea value={data.footerBio.en || ''} onChange={e => setData({ ...data, footerBio: { ...data.footerBio, en: e.target.value } })} rows={3} className={inputCls} />
              <div className="mt-2 flex justify-end">
                <AutoFixButton text={data.footerBio.en || ''} onApply={(nextText) => setData({ ...data, footerBio: { ...data.footerBio, en: nextText } })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Footer Bio (Indonesia)</label>
              <textarea value={data.footerBio.id || ''} onChange={e => setData({ ...data, footerBio: { ...data.footerBio, id: e.target.value } })} rows={3} className={inputCls} />
              <div className="mt-2 flex justify-end">
                <AutoFixButton text={data.footerBio.id || ''} onApply={(nextText) => setData({ ...data, footerBio: { ...data.footerBio, id: nextText } })} />
              </div>
            </div>
            <div><label className={labelCls}>Footer Tagline</label><input value={data.footerTagline} onChange={e => setData({ ...data, footerTagline: e.target.value })} className={inputCls} /></div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Homepage Section Visibility & Development Status</h2>
          <p className="text-xs text-[#94A3B8] mb-6">Kelola visibilitas dan status pengembangan dari masing-masing seksi di portfolio publik kamu.</p>
          <div className="space-y-6">
            {/* Writings Section */}
            <div className="border border-[#334155] rounded-xl p-4 bg-[#0F172A] space-y-3">
              <span className="text-sm font-semibold text-[#E2E8F0] block">Writings Section Status</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      writings: { enabled: true, status: 'visible' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.writings.status === 'visible'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Visible (Aktif)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Seksi aktif sepenuhnya. Semua konten published dapat diakses publik.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      writings: { enabled: true, status: 'development' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.writings.status === 'development'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Dev (Pengembangan)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Muncul dengan badge Dev. Halaman publik menampilkan "Under Construction".
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      writings: { enabled: false, status: 'hidden' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.writings.status === 'hidden'
                      ? 'bg-red-500/10 border-red-500 text-red-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Hidden (Tersembunyi)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Disembunyikan sepenuhnya dari publik, navigasi, dan beranda.
                  </span>
                </button>
              </div>
            </div>

            {/* Projects Section */}
            <div className="border border-[#334155] rounded-xl p-4 bg-[#0F172A] space-y-3">
              <span className="text-sm font-semibold text-[#E2E8F0] block">Projects Section Status</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      projects: { enabled: true, status: 'visible' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.projects.status === 'visible'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Visible (Aktif)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Seksi aktif sepenuhnya. Semua konten published dapat diakses publik.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      projects: { enabled: true, status: 'development' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.projects.status === 'development'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Dev (Pengembangan)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Muncul dengan badge Dev. Halaman publik menampilkan "Under Construction".
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      projects: { enabled: false, status: 'hidden' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.projects.status === 'hidden'
                      ? 'bg-red-500/10 border-red-500 text-red-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Hidden (Tersembunyi)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Disembunyikan sepenuhnya dari publik, navigasi, dan beranda.
                  </span>
                </button>
              </div>
            </div>

            {/* Books Section */}
            <div className="border border-[#334155] rounded-xl p-4 bg-[#0F172A] space-y-3">
              <span className="text-sm font-semibold text-[#E2E8F0] block">Library/Books Section Status</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      books: { enabled: true, status: 'visible' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.books.status === 'visible'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Visible (Aktif)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Seksi aktif sepenuhnya. Semua konten published dapat diakses publik.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      books: { enabled: true, status: 'development' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.books.status === 'development'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Dev (Pengembangan)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Muncul dengan badge Dev. Halaman publik menampilkan "Under Construction".
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setData({
                    ...data,
                    sections: {
                      ...data.sections,
                      books: { enabled: false, status: 'hidden' }
                    }
                  })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    data.sections.books.status === 'hidden'
                      ? 'bg-red-500/10 border-red-500 text-red-400'
                      : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:bg-[#334155]/20'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Hidden (Tersembunyi)
                  </span>
                  <span className="text-[11px] leading-tight text-[#94A3B8]">
                    Disembunyikan sepenuhnya dari publik, navigasi, dan beranda.
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Social Media Connections & Visibility</h2>
          <p className="text-xs text-[#94A3B8] mb-6">Manage all public social media profile links and control their visibility on your portfolio pages.</p>
          
          <div className="space-y-6">
            {/* LinkedIn */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-[#334155]/50 pb-4">
              <div className="md:col-span-1">
                <span className="text-sm font-semibold text-[#E2E8F0] block">LinkedIn</span>
                <span className="text-xs text-[#94A3B8]">Professional network profile</span>
              </div>
              <div className="md:col-span-1">
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={data.socialLinks?.linkedin || ''}
                  onChange={(e) => setData({
                    ...data,
                    socialLinks: {
                      ...(data.socialLinks || { github: '', email: '', instagram: '', twitter: '', researchgate: '', linkedin: '' }),
                      linkedin: e.target.value
                    }
                  })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#94A3B8] mr-1">Visible</span>
                  <input
                    type="checkbox"
                    checked={data.socialVisibility?.linkedin !== false}
                    onChange={(e) => setData({
                      ...data,
                      socialVisibility: {
                        ...(data.socialVisibility || { github: true, email: true, instagram: true, twitter: true, researchgate: true, linkedin: true }),
                        linkedin: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                  />
                </label>
              </div>
            </div>

            {/* GitHub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-[#334155]/50 pb-4">
              <div className="md:col-span-1">
                <span className="text-sm font-semibold text-[#E2E8F0] block">GitHub</span>
                <span className="text-xs text-[#94A3B8]">Code repositories and projects</span>
              </div>
              <div className="md:col-span-1">
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={data.socialLinks?.github || ''}
                  onChange={(e) => setData({
                    ...data,
                    socialLinks: {
                      ...(data.socialLinks || { github: '', email: '', instagram: '', twitter: '', researchgate: '', linkedin: '' }),
                      github: e.target.value
                    }
                  })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#94A3B8] mr-1">Visible</span>
                  <input
                    type="checkbox"
                    checked={data.socialVisibility?.github !== false}
                    onChange={(e) => setData({
                      ...data,
                      socialVisibility: {
                        ...(data.socialVisibility || { github: true, email: true, instagram: true, twitter: true, researchgate: true, linkedin: true }),
                        github: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                  />
                </label>
              </div>
            </div>

            {/* Instagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-[#334155]/50 pb-4">
              <div className="md:col-span-1">
                <span className="text-sm font-semibold text-[#E2E8F0] block">Instagram</span>
                <span className="text-xs text-[#94A3B8]">Visual & creative social profile</span>
              </div>
              <div className="md:col-span-1">
                <input
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={data.socialLinks?.instagram || ''}
                  onChange={(e) => setData({
                    ...data,
                    socialLinks: {
                      ...(data.socialLinks || { github: '', email: '', instagram: '', twitter: '', researchgate: '', linkedin: '' }),
                      instagram: e.target.value
                    }
                  })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#94A3B8] mr-1">Visible</span>
                  <input
                    type="checkbox"
                    checked={data.socialVisibility?.instagram !== false}
                    onChange={(e) => setData({
                      ...data,
                      socialVisibility: {
                        ...(data.socialVisibility || { github: true, email: true, instagram: true, twitter: true, researchgate: true, linkedin: true }),
                        instagram: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                  />
                </label>
              </div>
            </div>

            {/* Twitter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-[#334155]/50 pb-4">
              <div className="md:col-span-1">
                <span className="text-sm font-semibold text-[#E2E8F0] block">Twitter / X</span>
                <span className="text-xs text-[#94A3B8]">Short reflections & threads</span>
              </div>
              <div className="md:col-span-1">
                <input
                  type="url"
                  placeholder="https://twitter.com/..."
                  value={data.socialLinks?.twitter || ''}
                  onChange={(e) => setData({
                    ...data,
                    socialLinks: {
                      ...(data.socialLinks || { github: '', email: '', instagram: '', twitter: '', researchgate: '', linkedin: '' }),
                      twitter: e.target.value
                    }
                  })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#94A3B8] mr-1">Visible</span>
                  <input
                    type="checkbox"
                    checked={data.socialVisibility?.twitter !== false}
                    onChange={(e) => setData({
                      ...data,
                      socialVisibility: {
                        ...(data.socialVisibility || { github: true, email: true, instagram: true, twitter: true, researchgate: true, linkedin: true }),
                        twitter: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                  />
                </label>
              </div>
            </div>

            {/* ResearchGate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-[#334155]/50 pb-4">
              <div className="md:col-span-1">
                <span className="text-sm font-semibold text-[#E2E8F0] block">ResearchGate</span>
                <span className="text-xs text-[#94A3B8]">Academic research & publications</span>
              </div>
              <div className="md:col-span-1">
                <input
                  type="url"
                  placeholder="https://researchgate.net/profile/..."
                  value={data.socialLinks?.researchgate || ''}
                  onChange={(e) => setData({
                    ...data,
                    socialLinks: {
                      ...(data.socialLinks || { github: '', email: '', instagram: '', twitter: '', researchgate: '', linkedin: '' }),
                      researchgate: e.target.value
                    }
                  })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#94A3B8] mr-1">Visible</span>
                  <input
                    type="checkbox"
                    checked={data.socialVisibility?.researchgate !== false}
                    onChange={(e) => setData({
                      ...data,
                      socialVisibility: {
                        ...(data.socialVisibility || { github: true, email: true, instagram: true, twitter: true, researchgate: true, linkedin: true }),
                        researchgate: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                  />
                </label>
              </div>
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pb-2">
              <div className="md:col-span-1">
                <span className="text-sm font-semibold text-[#E2E8F0] block">Contact Email</span>
                <span className="text-xs text-[#94A3B8]">Public inquiry email address</span>
              </div>
              <div className="md:col-span-1">
                <input
                  type="email"
                  placeholder="alphonsus@example.com"
                  value={data.socialLinks?.email || ''}
                  onChange={(e) => setData({
                    ...data,
                    socialLinks: {
                      ...(data.socialLinks || { github: '', email: '', instagram: '', twitter: '', researchgate: '', linkedin: '' }),
                      email: e.target.value
                    }
                  })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#94A3B8] mr-1">Visible</span>
                  <input
                    type="checkbox"
                    checked={data.socialVisibility?.email !== false}
                    onChange={(e) => setData({
                      ...data,
                      socialVisibility: {
                        ...(data.socialVisibility || { github: true, email: true, instagram: true, twitter: true, researchgate: true, linkedin: true }),
                        email: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Outgoing Email Settings (Resend)</h2>
          
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Saved Sender Emails</label>
              <div className="space-y-2 mb-3">
                {(!data.senderEmails || data.senderEmails.length === 0) ? (
                  <p className="text-sm text-[#94A3B8] italic">No email addresses saved yet.</p>
                ) : (
                  data.senderEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="activeSenderEmail"
                          checked={data.activeSenderEmail === email}
                          onChange={() => setData({ ...data, activeSenderEmail: email })}
                          className="h-4 w-4 border-[#334155] bg-[#0F172A] text-[#60A5FA]"
                        />
                        <span className="text-sm text-[#E2E8F0]">{email}</span>
                      </label>
                      <button
                        onClick={() => {
                          const list = (data.senderEmails || []).filter(e => e !== email);
                          const active = data.activeSenderEmail === email ? (list[0] || '') : data.activeSenderEmail;
                          setData({ ...data, senderEmails: list, activeSenderEmail: active });
                        }}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Email Address Form */}
              <div className="flex gap-2">
                <input
                  type="email"
                  id="new-sender-email"
                  placeholder="e.g. hello@yourdomain.com"
                  className={inputCls}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const btn = document.getElementById('add-sender-email-btn');
                      if (btn) btn.click();
                    }
                  }}
                />
                <button
                  id="add-sender-email-btn"
                  onClick={() => {
                    const input = document.getElementById('new-sender-email') as HTMLInputElement;
                    const val = input ? input.value.trim() : '';
                    if (!val) return;
                    if (!val.includes('@')) {
                      alert('Please enter a valid email address');
                      return;
                    }
                    if ((data.senderEmails || []).includes(val)) {
                      alert('This email is already added');
                      return;
                    }
                    const list = [...(data.senderEmails || []), val];
                    const active = data.activeSenderEmail ? data.activeSenderEmail : val;
                    setData({ ...data, senderEmails: list, activeSenderEmail: active });
                    if (input) input.value = '';
                  }}
                  className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors shrink-0"
                >
                  Add Email
                </button>
              </div>
              <p className="mt-2 text-xs text-[#94A3B8]">
                *Note: The selected email will be the Outbox address and will receive a BCC copy of all replies.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-[#60A5FA]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Change Password</h2>
          </div>
          {passwordMsg && <p className={`text-sm mb-4 ${passwordMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{passwordMsg}</p>}
          <div className="space-y-4">
            <div><label className={labelCls}>Current Password</label><input type="password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>New Password</label><input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Confirm New Password</label><input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className={inputCls} /></div>
            <button onClick={handleChangePassword} className="bg-[#334155] text-[#F8FAFC] px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors">Update Password</button>
          </div>
        </section>
      </div>
    </div>
  );
}
