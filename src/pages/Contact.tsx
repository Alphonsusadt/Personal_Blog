import { useState, useEffect } from 'react';
import { Mail, Linkedin, Github, Send, AlertCircle, CheckCircle2, RefreshCw, Instagram, Twitter, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { formatExternalUrl } from '../utils/url';

interface SettingsData {
  socialLinks?: {
    linkedin?: string;
    github?: string;
    email?: string;
    instagram?: string;
    twitter?: string;
    researchgate?: string;
  };
  socialVisibility?: {
    linkedin?: boolean;
    github?: boolean;
    instagram?: boolean;
    twitter?: boolean;
    researchgate?: boolean;
    email?: boolean;
  };
  contactHeading?: { id: string; en: string };
  contactMessage?: { id: string; en: string };
}

export function Contact() {
  const { language } = useSiteLanguage();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  
  // Contact Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    // Dynamically load active social links and settings from database
    api.getPublicSettings()
      .then((data: any) => {
        if (data) setSettings(data);
      })
      .catch(console.error);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBody.trim()) {
      setFormError(language === 'id' ? 'Mohon isi pesan terlebih dahulu.' : 'Please write your message first.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');
      
      await api.submitPublicMessage({
        name: formName,
        email: formEmail,
        subject: formSubject,
        body: formBody,
        language: language as 'id' | 'en'
      });

      setFormSuccess(true);
      setFormName('');
      setFormEmail('');
      setFormSubject('');
      setFormBody('');
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || (language === 'id' ? 'Gagal mengirim pesan.' : 'Failed to send message.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const linkedinUrl = formatExternalUrl(settings?.socialLinks?.linkedin || 'https://linkedin.com/in/alphonsusadt');
  const githubUrl = formatExternalUrl(settings?.socialLinks?.github || 'https://github.com/alphonsusadt');
  const emailUrl = formatExternalUrl(settings?.socialLinks?.email || 'alphonsus@example.com');
  const instagramUrl = formatExternalUrl(settings?.socialLinks?.instagram || 'https://instagram.com/alphonsusadt');
  const twitterUrl = formatExternalUrl(settings?.socialLinks?.twitter || 'https://twitter.com/alphonsusadt');
  const researchGateUrl = formatExternalUrl(settings?.socialLinks?.researchgate || 'https://researchgate.net');

  const showLinkedin = settings?.socialVisibility?.linkedin !== false;
  const showGithub = settings?.socialVisibility?.github !== false;
  const showInstagram = settings?.socialVisibility?.instagram !== false;
  const showTwitter = settings?.socialVisibility?.twitter !== false;
  const showResearchGate = settings?.socialVisibility?.researchgate !== false;
  const showEmail = settings?.socialVisibility?.email !== false;

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12 md:py-[80px]">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <h1 className="display-xl text-ink">
          {language === 'id' ? 'Kontak' : 'Contact'}
        </h1>
        <p className="body text-ink opacity-80 serif-font leading-relaxed max-w-xl mx-auto">
          {language === 'id' 
            ? 'Ingin berkolaborasi, berdiskusi mengenai teknik biomedis, atau sekadar menyapa? Silakan kirimkan pesan Anda melalui formulir di bawah ini.' 
            : 'Want to collaborate, discuss biomedical engineering, or simply say hello? Please send your message using the form below.'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Interactive Form Card */}
        <div className="bg-block-pink color-block-section rounded-[32px] p-8 md:p-12 border border-hairline shadow-sm relative overflow-hidden text-left">
          {formSuccess ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 bg-canvas border border-hairline rounded-full mx-auto flex items-center justify-center text-primary shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="card-title text-ink text-2xl">
                  {language === 'id' ? 'Pesan Terkirim!' : 'Message Sent!'}
                </h3>
                <p className="body text-ink opacity-80 max-w-md mx-auto serif-font leading-relaxed">
                  {language === 'id' 
                    ? 'Terima kasih telah menghubungi saya. Pesan Anda telah diterima dan akan segera ditinjau.' 
                    : 'Thank you for reaching out. Your message has been received and will be reviewed shortly.'}
                </p>
              </div>
              <button
                onClick={() => setFormSuccess(false)}
                className="bg-canvas border border-hairline hover:border-ink text-ink font-semibold rounded-full px-8 py-3 shadow-sm text-sm transition-all cursor-pointer"
              >
                {language === 'id' ? 'Kirim Pesan Lain' : 'Send Another Message'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label htmlFor="formName" className="caption text-ink font-semibold opacity-70">
                    {language === 'id' ? 'Nama Anda (Opsional)' : 'Your Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    id="formName"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={language === 'id' ? 'Nama Anda' : 'Your Name'}
                    className="w-full bg-canvas text-ink rounded-[14px] px-4 py-3.5 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="formEmail" className="caption text-ink font-semibold opacity-70">
                    {language === 'id' ? 'Email Anda (Opsional)' : 'Your Email (Optional)'}
                  </label>
                  <input
                    type="email"
                    id="formEmail"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-canvas text-ink rounded-[14px] px-4 py-3.5 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm"
                  />
                  <p className="text-[10px] text-ink opacity-50 mt-1">
                    {language === 'id' 
                      ? '*Kosongkan jika hanya ingin memberi feedback baca-saja.' 
                      : '*Leave blank for read-only anonymous feedback.'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="formSubject" className="caption text-ink font-semibold opacity-70">
                  {language === 'id' ? 'Subjek (Opsional)' : 'Subject (Optional)'}
                </label>
                <input
                  type="text"
                  id="formSubject"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder={language === 'id' ? 'Subjek pesan...' : 'Subject of message...'}
                  className="w-full bg-canvas text-ink rounded-[14px] px-4 py-3.5 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="formBody" className="caption text-ink font-semibold opacity-70 flex justify-between">
                  <span>{language === 'id' ? 'Isi Pesan (Wajib)' : 'Message (Required)'}</span>
                  <span className="opacity-50 text-[11px] font-normal">{formBody.length} chars</span>
                </label>
                <textarea
                  id="formBody"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={6}
                  placeholder={language === 'id' ? 'Tulis pesan Anda di sini...' : 'Write your message here...'}
                  className="w-full bg-canvas text-ink rounded-[14px] px-4 py-3.5 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm leading-relaxed resize-none"
                />
              </div>

              {formError && (
                <div className="p-3 bg-canvas border border-red-500/20 text-red-500 text-xs rounded-[14px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full bg-ink hover:bg-ink/90 text-canvas font-semibold rounded-full py-4.5 text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {language === 'id' ? 'Mengirim...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {language === 'id' ? 'Kirim Pesan' : 'Send Message'}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Social Links Panel */}
          <div className="mt-10 pt-8 border-t border-hairline/30 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm">
            {showLinkedin && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 text-ink hover:opacity-85 transition-opacity"
              >
                <Linkedin className="w-4.5 h-4.5" />
                <span className="font-semibold">LinkedIn</span>
              </a>
            )}
            {showGithub && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 text-ink hover:opacity-85 transition-opacity"
              >
                <Github className="w-4.5 h-4.5" />
                <span className="font-semibold">GitHub</span>
              </a>
            )}
            {showInstagram && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 text-ink hover:opacity-85 transition-opacity"
              >
                <Instagram className="w-4.5 h-4.5 text-pink-500" />
                <span className="font-semibold">Instagram</span>
              </a>
            )}
            {showTwitter && (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 text-ink hover:opacity-85 transition-opacity"
              >
                <Twitter className="w-4.5 h-4.5 text-sky-400" />
                <span className="font-semibold">Twitter</span>
              </a>
            )}
            {showResearchGate && (
              <a
                href={researchGateUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 text-ink hover:opacity-85 transition-opacity"
              >
                <Globe className="w-4.5 h-4.5 text-teal-500" />
                <span className="font-semibold">ResearchGate</span>
              </a>
            )}
            {showEmail && (
              <a
                href={emailUrl}
                className="flex items-center space-x-2 text-ink hover:opacity-85 transition-opacity"
              >
                <Mail className="w-4.5 h-4.5" />
                <span className="font-semibold">Email</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
