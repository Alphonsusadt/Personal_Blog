import { useEffect, useState } from 'react';
import { Github, Linkedin, Mail, Heart, GraduationCap, Code, Users, Send, AlertCircle, CheckCircle2, RefreshCw, Instagram, Twitter, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { useSiteLanguage } from '../hooks/useSiteLanguage';

type LocalizedText = { en: string; id: string };
type LocalizedStringArray = { en: string[]; id: string[] };

interface EducationItem {
  title: LocalizedText;
  institution: LocalizedText;
  year: string;
  description: LocalizedText;
}

interface EngineeringProjectItem {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  date: string;
  image: string;
}

interface AboutData {
  title: LocalizedText;
  subtitle: LocalizedText;
  bio: LocalizedText;
  profileImage: string;
  gpa: string;
  projectsCount: string;
  story: { whyBME: LocalizedText; faithAndEngineering: LocalizedText; currentFocus: LocalizedText };
  skills: {
    programming: LocalizedStringArray;
    specializations: LocalizedStringArray;
    academicInterests: LocalizedStringArray;
    personalInterests: LocalizedStringArray;
  };
  education: EducationItem[];
  engineeringProjects: EngineeringProjectItem[];
  quote: LocalizedText;
  contactHeading: LocalizedText;
  contactMessage: LocalizedText;
  socialLinks: { linkedin: string; github: string; email: string };
}

const defaultEngineeringProjects: EngineeringProjectItem[] = [
  {
    id: 'eng-dummy-1',
    title: {
      en: 'Portable ECG + SpO2 Monitoring Prototype',
      id: 'Prototipe Monitoring ECG + SpO2 Portabel',
    },
    description: {
      en: 'Built a compact biomedical monitoring prototype that streams ECG and oxygen saturation data for remote assessment experiments.',
      id: 'Membangun prototipe monitoring biomedis ringkas yang mengirim data ECG dan saturasi oksigen untuk eksperimen asesmen jarak jauh.',
    },
    date: '2025-08-14',
    image: '',
  },
  {
    id: 'eng-dummy-2',
    title: {
      en: 'EMG Gesture Classifier for Assistive Control',
      id: 'Klasifikasi Gestur EMG untuk Kontrol Asistif',
    },
    description: {
      en: 'Developed an EMG signal feature pipeline and gesture classifier to test intuitive assistive hand-control scenarios.',
      id: 'Mengembangkan pipeline fitur sinyal EMG dan klasifikasi gestur untuk menguji skenario kontrol tangan asistif yang intuitif.',
    },
    date: '2026-01-20',
    image: '',
  },
];

const cloneEngineeringProjects = (items: EngineeringProjectItem[]): EngineeringProjectItem[] => (
  items.map((item) => ({
    ...item,
    title: { ...item.title },
    description: { ...item.description },
  }))
);

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

const asLocalizedArray = (value: unknown): LocalizedStringArray => {
  if (Array.isArray(value)) {
    const clean = value.filter((item): item is string => typeof item === 'string');
    return { en: clean, id: clean };
  }

  if (value && typeof value === 'object') {
    const parsed = value as Partial<LocalizedStringArray>;
    const en = Array.isArray(parsed.en) ? parsed.en.filter((item): item is string => typeof item === 'string') : [];
    const id = Array.isArray(parsed.id) ? parsed.id.filter((item): item is string => typeof item === 'string') : en;
    return { en, id };
  }

  return { en: [], id: [] };
};

const normalizeAboutData = (raw: unknown): AboutData => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const story = (data.story && typeof data.story === 'object') ? (data.story as Record<string, unknown>) : {};
  const skills = (data.skills && typeof data.skills === 'object') ? (data.skills as Record<string, unknown>) : {};
  const socialLinks = (data.socialLinks && typeof data.socialLinks === 'object') ? (data.socialLinks as Record<string, unknown>) : {};

  const education = Array.isArray(data.education)
    ? data.education.map((item) => {
      const edu = (item && typeof item === 'object') ? (item as Record<string, unknown>) : {};
      return {
        title: asLocalizedText(edu.title),
        institution: asLocalizedText(edu.institution),
        year: typeof edu.year === 'string' ? edu.year : '',
        description: asLocalizedText(edu.description),
      };
    })
    : [];

  const hasEngineeringProjectsField = Array.isArray(data.engineeringProjects);
  const engineeringProjects = hasEngineeringProjectsField
    ? (data.engineeringProjects as unknown[]).map((item, index) => {
      const project = (item && typeof item === 'object') ? (item as Record<string, unknown>) : {};
      return {
        id: typeof project.id === 'string' ? project.id : `eng-${index}`,
        title: asLocalizedText(project.title),
        description: asLocalizedText(project.description),
        date: typeof project.date === 'string' ? project.date : '',
        image: typeof project.image === 'string' ? project.image : '',
      };
    })
    : cloneEngineeringProjects(defaultEngineeringProjects);

  return {
    title: asLocalizedText(data.title),
    subtitle: asLocalizedText(data.subtitle),
    bio: asLocalizedText(data.bio),
    profileImage: typeof data.profileImage === 'string' ? data.profileImage : '',
    gpa: typeof data.gpa === 'string' ? data.gpa : '',
    projectsCount: typeof data.projectsCount === 'string' ? data.projectsCount : '',
    story: {
      whyBME: asLocalizedText(story.whyBME),
      faithAndEngineering: asLocalizedText(story.faithAndEngineering),
      currentFocus: asLocalizedText(story.currentFocus),
    },
    skills: {
      programming: asLocalizedArray(skills.programming),
      specializations: asLocalizedArray(skills.specializations),
      academicInterests: asLocalizedArray(skills.academicInterests),
      personalInterests: asLocalizedArray(skills.personalInterests),
    },
    education,
    engineeringProjects,
    quote: asLocalizedText(data.quote),
    contactHeading: asLocalizedText(data.contactHeading),
    contactMessage: asLocalizedText(data.contactMessage),
    socialLinks: {
      linkedin: typeof socialLinks.linkedin === 'string' ? socialLinks.linkedin : '',
      github: typeof socialLinks.github === 'string' ? socialLinks.github : '',
      email: typeof socialLinks.email === 'string' ? socialLinks.email : '',
    },
  };
};

const defaultData: AboutData = normalizeAboutData({});

export function About() {
  const [data, setData] = useState<AboutData>(defaultData);
  const [settings, setSettings] = useState<any>(null);
  const { language } = useSiteLanguage();

  // Contact Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

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

  const hasText = (value: string) => value.trim().length > 0;
  const hasLocalizedText = (value: LocalizedText) => hasText(value[language]) || hasText(value.en) || hasText(value.id);

  const formatEngineeringDate = (rawDate: string) => {
    if (!rawDate) return language === 'id' ? 'Tanpa tanggal' : 'No date';
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return rawDate;

    return parsed.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  useEffect(() => {
    api
      .getPublicAbout()
      .then((d) => {
        if (d && Object.keys(d).length > 0) {
          setData(normalizeAboutData(d));
        }
      })
      .catch(console.error);

    api
      .getPublicSettings()
      .then((s) => {
        if (s) setSettings(s);
      })
      .catch(console.error);
  }, []);

  const hasHeader = hasText(data.title[language]) || hasText(data.subtitle[language]);
  const hasHeroCard = hasText(data.bio[language]) || hasText(data.profileImage) || hasText(data.gpa) || hasText(data.projectsCount);

  const linkedinUrl = settings?.socialLinks?.linkedin || data.socialLinks?.linkedin || 'https://linkedin.com/in/alphonsusadt';
  const githubUrl = settings?.socialLinks?.github || data.socialLinks?.github || 'https://github.com/alphonsusadt';
  const emailUrl = settings?.socialLinks?.email || data.socialLinks?.email || 'alphonsus@example.com';
  const instagramUrl = settings?.socialLinks?.instagram || 'https://instagram.com/alphonsusadt';
  const twitterUrl = settings?.socialLinks?.twitter || 'https://twitter.com/alphonsusadt';
  const researchGateUrl = settings?.socialLinks?.researchgate || 'https://researchgate.net';

  const showLinkedin = settings?.socialVisibility?.linkedin !== false;
  const showGithub = settings?.socialVisibility?.github !== false;
  const showInstagram = settings?.socialVisibility?.instagram !== false;
  const showTwitter = settings?.socialVisibility?.twitter !== false;
  const showResearchGate = settings?.socialVisibility?.researchgate !== false;
  const showEmail = settings?.socialVisibility?.email !== false;

  const storyItems = [
    {
      key: 'why-bme',
      title: 'Why Biomedical Engineering?',
      content: data.story.whyBME[language],
    },
    {
      key: 'faith-engineering',
      title: 'The Intersection of Faith and Engineering',
      content: data.story.faithAndEngineering[language],
    },
    {
      key: 'current-focus',
      title: 'Current Focus',
      content: data.story.currentFocus[language],
    },
  ].filter((item) => hasText(item.content));

  const technicalGroups = [
    { label: 'Programming Languages', values: data.skills.programming[language] },
    { label: 'Specializations', values: data.skills.specializations[language] },
  ].filter((group) => group.values.length > 0);

  const interestGroups = [
    { label: 'Academic', values: data.skills.academicInterests[language] },
    { label: 'Personal', values: data.skills.personalInterests[language] },
  ].filter((group) => group.values.length > 0);

  const hasSkillsSection = technicalGroups.length > 0 || interestGroups.length > 0;

  const educationItems = data.education.filter((item) => (
    hasLocalizedText(item.title) ||
    hasLocalizedText(item.institution) ||
    hasText(item.year) ||
    hasLocalizedText(item.description)
  ));

  const timelineItems = data.engineeringProjects.filter((item) => (
    hasLocalizedText(item.title) ||
    hasLocalizedText(item.description) ||
    hasText(item.date) ||
    hasText(item.image)
  ));

  const hasContactMessage = hasText(data.contactMessage[language]);
  const hasLinkedin = hasText(data.socialLinks.linkedin);
  const hasGithub = hasText(data.socialLinks.github);
  const hasEmail = hasText(data.socialLinks.email);
  const hasSocialLinks = hasLinkedin || hasGithub || hasEmail;
  const hasContactSection = hasText(data.contactHeading[language]) || hasContactMessage || hasSocialLinks;
  const hasQuote = hasText(data.quote[language]);

  return (
    <div className="min-h-screen py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {hasHeader ? (
          <div className="text-center mb-16">
            {hasText(data.title[language]) ? (
              <h1 className="display-lg text-ink mb-4">
                {data.title[language]}
              </h1>
            ) : null}
            {hasText(data.subtitle[language]) ? (
              <p className="subhead text-ink opacity-80 max-w-2xl mx-auto">
                {data.subtitle[language]}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasHeroCard ? (
        <div className="mb-[96px]">
          <div className="bg-block-cream rounded-[24px] p-8 lg:p-12 color-block-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="flex justify-center">
                <div className="bg-canvas rounded-[24px] p-4 shadow-sm border border-hairline w-full max-w-[360px]">
                  <div className="bg-surface-soft border border-hairline rounded-[16px] w-full aspect-[4/5] overflow-hidden flex items-center justify-center">
                    {data.profileImage ? (
                      <img
                        src={data.profileImage}
                        alt="Professional photo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center px-4">
                        <div className="bg-ink rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Users className="w-8 h-8 text-canvas" />
                        </div>
                        <p className="caption text-ink opacity-60">Professional Photo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h2 className="display-sm text-ink mb-4">
                  Biomedical Engineering Student
                </h2>
                {hasText(data.bio[language]) ? (
                  <p className="body text-ink opacity-80 mb-6 leading-relaxed">
                    {data.bio[language]}
                  </p>
                ) : null}
                {(hasText(data.gpa) || hasText(data.projectsCount)) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {hasText(data.gpa) ? (
                      <div className="bg-canvas rounded-[16px] border border-hairline p-4 text-center shadow-sm">
                        <div className="display-sm text-primary">{data.gpa}</div>
                        <div className="caption text-ink opacity-60">GPA</div>
                      </div>
                    ) : null}
                    {hasText(data.projectsCount) ? (
                      <div className="bg-canvas rounded-[16px] border border-hairline p-4 text-center shadow-sm">
                        <div className="display-sm text-primary">{data.projectsCount}</div>
                        <div className="caption text-ink opacity-60">Projects</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {storyItems.length > 0 ? (
        <div className="mb-[96px]">
          <h2 className="display-md text-ink mb-8">
            My Story
          </h2>

          <div className="space-y-12">
            {storyItems.map((item) => (
              <section key={item.key}>
                <h3 className="card-title text-ink mb-4">
                  {item.title}
                </h3>
                <p className="body-lg text-ink opacity-80 leading-relaxed serif-font">
                  {item.content}
                </p>
              </section>
            ))}
          </div>
        </div>
        ) : null}

        {hasSkillsSection ? (
        <div className="mb-[96px]">
          <h2 className="display-md text-ink mb-8">
            Skills & Interests
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {technicalGroups.length > 0 ? (
            <div className="bg-block-lime rounded-[24px] p-8 shadow-sm border border-hairline color-block-section">
              <div className="flex items-center mb-6">
                <div className="bg-canvas p-3 rounded-[12px] mr-4 shadow-sm border border-hairline">
                  <Code className="w-6 h-6 text-ink" />
                </div>
                <h3 className="card-title text-ink">
                  Technical Skills
                </h3>
              </div>
              <div className="space-y-6">
                {technicalGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="body-sm text-ink mb-3">{group.label}</h4>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map(skill => (
                        <span key={skill} className="tag bg-canvas border border-hairline">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ) : null}

            {interestGroups.length > 0 ? (
            <div className="bg-block-lilac rounded-[24px] p-8 shadow-sm border border-hairline color-block-section">
              <div className="flex items-center mb-6">
                <div className="bg-canvas p-3 rounded-[12px] mr-4 shadow-sm border border-hairline">
                  <Heart className="w-6 h-6 text-ink" />
                </div>
                <h3 className="card-title text-ink">
                  Interests
                </h3>
              </div>
              <div className="space-y-6">
                {interestGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="body-sm text-ink mb-3">{group.label}</h4>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map(skill => (
                        <span key={skill} className="tag bg-canvas border border-hairline">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ) : null}
          </div>
        </div>
        ) : null}

        {educationItems.length > 0 ? (
        <div className="mb-[96px]">
          <h2 className="display-md text-ink mb-8">
            Education & Achievements
          </h2>

          <div className="space-y-6">
            {educationItems.map((item, index) => (
              <div key={`${item.title[language]}-${item.year}-${index}`} className="bg-canvas rounded-[24px] p-6 shadow-sm border border-hairline">
                <div className="flex items-start space-x-4">
                  <div className="bg-surface-soft border border-hairline p-3 rounded-[12px]">
                    <GraduationCap className="w-6 h-6 text-ink" />
                  </div>
                  <div className="flex-1">
                    <h3 className="card-title text-ink mb-1">
                      {item.title[language]}
                    </h3>
                    <p className="body-sm text-ink opacity-60 mb-2">{item.institution[language]} • {item.year}</p>
                    <p className="body-sm text-ink opacity-80 serif-font">
                      {item.description[language]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : null}

        {timelineItems.length > 0 ? (
        <div className="mb-[96px]">
          <h2 className="display-md text-ink mb-8">
            Engineering Project Timeline
          </h2>

          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-hairline" />

            <div className="space-y-8 md:space-y-10">
              {timelineItems.map((item, index) => {
                const isLeft = index % 2 === 0;

                return (
                  <div key={item.id || `${item.title[language]}-${index}`} className="relative md:grid md:grid-cols-2 md:gap-10 items-start">
                    <div className={`${isLeft ? 'md:col-start-1' : 'md:col-start-2'} bg-canvas rounded-[24px] p-6 shadow-sm border border-hairline`}>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="card-title text-ink leading-tight">
                          {item.title[language]}
                        </h3>
                        <span className="shrink-0 tag bg-surface-soft border border-hairline">
                          {formatEngineeringDate(item.date)}
                        </span>
                      </div>

                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title[language]}
                          className="w-full h-44 object-cover rounded-[16px] mb-4 border border-hairline"
                        />
                      ) : null}

                      <p className="body-sm text-ink opacity-80 leading-relaxed serif-font">
                        {item.description[language]}
                      </p>
                    </div>

                    <div className="hidden md:flex absolute left-1/2 top-7 -translate-x-1/2 h-4 w-4 rounded-full bg-ink border-2 border-canvas" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        ) : null}

        {hasContactSection ? (
        <div className="mb-[96px] max-w-2xl mx-auto text-left">
          {hasText(data.contactHeading[language]) ? (
            <h2 className="display-md text-ink mb-8 text-center">
              {data.contactHeading[language]}
            </h2>
          ) : null}

          <div className="bg-block-pink color-block-section rounded-[32px] p-8 md:p-10 border border-hairline shadow-sm relative overflow-hidden">
            {formSuccess ? (
              <div className="text-center py-10 space-y-6">
                <div className="w-16 h-16 bg-canvas border border-hairline rounded-full mx-auto flex items-center justify-center text-primary shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="card-title text-ink text-xl">
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
                  className="bg-canvas border border-hairline hover:border-ink text-ink font-semibold rounded-full px-6 py-2.5 shadow-sm text-sm transition-all"
                >
                  {language === 'id' ? 'Kirim Pesan Lain' : 'Send Another Message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {hasContactMessage ? (
                  <p className="body text-ink opacity-80 mb-6 leading-relaxed serif-font text-center max-w-lg mx-auto">
                    {data.contactMessage[language]}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="formName" className="caption text-ink font-semibold opacity-70">
                      {language === 'id' ? 'Nama Anda (Opsional)' : 'Your Name (Optional)'}
                    </label>
                    <input
                      type="text"
                      id="formName"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={language === 'id' ? 'Nama Anda' : 'Your Name'}
                      className="w-full bg-canvas text-ink rounded-[12px] px-4 py-3 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="formEmail" className="caption text-ink font-semibold opacity-70">
                      {language === 'id' ? 'Email Anda (Opsional)' : 'Your Email (Optional)'}
                    </label>
                    <input
                      type="email"
                      id="formEmail"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="yourname@example.com"
                      className="w-full bg-canvas text-ink rounded-[12px] px-4 py-3 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm"
                    />
                    <p className="text-[10px] text-ink opacity-50 mt-1">
                      {language === 'id' 
                        ? '*Kosongkan jika hanya ingin memberi feedback baca-saja.' 
                        : '*Leave blank for read-only anonymous feedback.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="formSubject" className="caption text-ink font-semibold opacity-70">
                    {language === 'id' ? 'Subjek (Opsional)' : 'Subject (Optional)'}
                  </label>
                  <input
                    type="text"
                    id="formSubject"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder={language === 'id' ? 'Subjek pesan...' : 'Subject of message...'}
                    className="w-full bg-canvas text-ink rounded-[12px] px-4 py-3 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="formBody" className="caption text-ink font-semibold opacity-70 flex justify-between">
                    <span>{language === 'id' ? 'Isi Pesan (Wajib)' : 'Message (Required)'}</span>
                    <span className="opacity-50 text-[11px] font-normal">{formBody.length} chars</span>
                  </label>
                  <textarea
                    id="formBody"
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={5}
                    placeholder={language === 'id' ? 'Tulis pesan Anda di sini...' : 'Write your message here...'}
                    className="w-full bg-canvas text-ink rounded-[12px] px-4 py-3 text-sm border border-hairline focus:outline-none focus:border-ink transition-colors shadow-sm leading-relaxed resize-none"
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-canvas border border-red-500/20 text-red-500 text-xs rounded-[12px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full bg-ink hover:bg-ink/90 text-canvas font-semibold rounded-full py-4 text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

            {/* Social Links Bar */}
            <div className="mt-8 pt-6 border-t border-hairline/30 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
              {showLinkedin && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 text-ink hover:opacity-85 transition-opacity"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="font-medium">LinkedIn</span>
                </a>
              )}
              {showGithub && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 text-ink hover:opacity-85 transition-opacity"
                >
                  <Github className="w-4 h-4" />
                  <span className="font-medium">GitHub</span>
                </a>
              )}
              {showInstagram && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 text-ink hover:opacity-85 transition-opacity"
                >
                  <Instagram className="w-4 h-4 text-pink-500" />
                  <span className="font-medium">Instagram</span>
                </a>
              )}
              {showTwitter && (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 text-ink hover:opacity-85 transition-opacity"
                >
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span className="font-medium">Twitter</span>
                </a>
              )}
              {showResearchGate && (
                <a
                  href={researchGateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 text-ink hover:opacity-85 transition-opacity"
                >
                  <Globe className="w-4 h-4 text-teal-500" />
                  <span className="font-medium">ResearchGate</span>
                </a>
              )}
              {showEmail && (
                <a
                  href={`mailto:${emailUrl}`}
                  className="flex items-center space-x-1.5 text-ink hover:opacity-85 transition-opacity"
                >
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Email</span>
                </a>
              )}
            </div>
          </div>
        </div>
        ) : null}

        {hasQuote ? (
        <div className="mb-[96px]">
          <div className="bg-canvas rounded-[24px] p-8 lg:p-12 shadow-sm border border-hairline">
            <blockquote className="text-center">
              <p className="display-sm text-ink opacity-80 mb-6 leading-relaxed serif-font">
                {data.quote[language]}
              </p>
              <footer className="card-title text-primary">
                © Alphonsus Aditya
              </footer>
            </blockquote>
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}
