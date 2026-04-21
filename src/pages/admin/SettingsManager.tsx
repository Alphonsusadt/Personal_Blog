import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Save, CheckCircle, Key, Clock, AlertCircle } from 'lucide-react';
import { useAdminAutosave } from '../../hooks/useAdminAutosave';
import { AutoFixButton } from '../../components/AutoFixButton';

interface SettingsData {
  siteTitle: string;
  footerName: string;
  footerBio: string;
  footerTagline: string;
  sections: {
    writings: { enabled: boolean };
    projects: { enabled: boolean };
    books: { enabled: boolean };
  };
}

const hasMeaningfulSettingsData = (value: SettingsData): boolean => {
  return Boolean(
    value.siteTitle.trim() ||
    value.footerName.trim() ||
    value.footerBio.trim() ||
    value.footerTagline.trim() ||
    value.sections.writings.enabled ||
    value.sections.projects.enabled ||
    value.sections.books.enabled
  );
};

export function SettingsManager() {
  const [data, setData] = useState<SettingsData>({
    siteTitle: '',
    footerName: '',
    footerBio: '',
    footerTagline: '',
    sections: {
      writings: { enabled: true },
      projects: { enabled: true },
      books: { enabled: true },
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
        sections: {
          writings: { enabled: d.sections?.writings?.enabled !== false },
          projects: { enabled: d.sections?.projects?.enabled !== false },
          books: { enabled: d.sections?.books?.enabled !== false },
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
              <label className={labelCls}>Footer Bio</label>
              <textarea value={data.footerBio} onChange={e => setData({ ...data, footerBio: e.target.value })} rows={3} className={inputCls} />
              <div className="mt-2 flex justify-end">
                <AutoFixButton text={data.footerBio} onApply={(nextText) => setData({ ...data, footerBio: nextText })} />
              </div>
            </div>
            <div><label className={labelCls}>Footer Tagline</label><input value={data.footerTagline} onChange={e => setData({ ...data, footerTagline: e.target.value })} className={inputCls} /></div>
          </div>
        </section>

        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Homepage Section Visibility</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3">
              <span className="text-sm text-[#E2E8F0]">Show Writings Section</span>
              <input
                type="checkbox"
                checked={data.sections.writings.enabled}
                onChange={(e) => setData({
                  ...data,
                  sections: {
                    ...data.sections,
                    writings: { enabled: e.target.checked },
                  },
                })}
                className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3">
              <span className="text-sm text-[#E2E8F0]">Show Projects Section</span>
              <input
                type="checkbox"
                checked={data.sections.projects.enabled}
                onChange={(e) => setData({
                  ...data,
                  sections: {
                    ...data.sections,
                    projects: { enabled: e.target.checked },
                  },
                })}
                className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3">
              <span className="text-sm text-[#E2E8F0]">Show Library Section</span>
              <input
                type="checkbox"
                checked={data.sections.books.enabled}
                onChange={(e) => setData({
                  ...data,
                  sections: {
                    ...data.sections,
                    books: { enabled: e.target.checked },
                  },
                })}
                className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#60A5FA]"
              />
            </label>
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
