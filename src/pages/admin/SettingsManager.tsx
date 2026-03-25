import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Save, CheckCircle, Key } from 'lucide-react';

interface SettingsData {
  siteTitle: string;
  footerName: string;
  footerBio: string;
  footerTagline: string;
}

export function SettingsManager() {
  const [data, setData] = useState<SettingsData>({ siteTitle: '', footerName: '', footerBio: '', footerTagline: '' });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    api.get('/api/settings').then(d => { if (d && d.siteTitle) setData(d); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/api/settings', data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>

      <div className="space-y-8">
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Site Settings</h2>
          <div className="space-y-4">
            <div><label className={labelCls}>Site Title</label><input value={data.siteTitle} onChange={e => setData({ ...data, siteTitle: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Footer Name</label><input value={data.footerName} onChange={e => setData({ ...data, footerName: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Footer Bio</label><textarea value={data.footerBio} onChange={e => setData({ ...data, footerBio: e.target.value })} rows={3} className={inputCls} /></div>
            <div><label className={labelCls}>Footer Tagline</label><input value={data.footerTagline} onChange={e => setData({ ...data, footerTagline: e.target.value })} className={inputCls} /></div>
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
