import { useEffect, useState } from 'react';
import { Github, Linkedin, Mail, Heart, GraduationCap, Code, Users } from 'lucide-react';
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
  const { language } = useSiteLanguage();

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
  }, []);

  const hasHeader = hasText(data.title[language]) || hasText(data.subtitle[language]);
  const hasHeroCard = hasText(data.bio[language]) || hasText(data.profileImage) || hasText(data.gpa) || hasText(data.projectsCount);

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
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {hasHeader ? (
          <div className="text-center mb-16">
            {hasText(data.title[language]) ? (
              <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                {data.title[language]}
              </h1>
            ) : null}
            {hasText(data.subtitle[language]) ? (
              <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
                {data.subtitle[language]}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasHeroCard ? (
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-lg">
                  <div className="bg-[#E5E7EB] dark:bg-[#334155] border-2 border-dashed border-[#9CA3AF] dark:border-[#6B7280] rounded-lg w-full h-64 overflow-hidden flex items-center justify-center">
                    {data.profileImage ? (
                      <img
                        src={data.profileImage}
                        alt="Professional photo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center px-4">
                        <div className="bg-[#1E40AF] dark:bg-[#60A5FA] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-[#6B7280] text-sm">Professional Photo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                  Biomedical Engineering Student
                </h2>
                {hasText(data.bio[language]) ? (
                  <p className="text-[#6B7280] mb-6 leading-relaxed">
                    {data.bio[language]}
                  </p>
                ) : null}
                {(hasText(data.gpa) || hasText(data.projectsCount)) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {hasText(data.gpa) ? (
                      <div className="bg-white dark:bg-[#1E293B] rounded-lg p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-[#1E40AF] dark:text-[#60A5FA]">{data.gpa}</div>
                        <div className="text-sm text-[#6B7280]">GPA</div>
                      </div>
                    ) : null}
                    {hasText(data.projectsCount) ? (
                      <div className="bg-white dark:bg-[#1E293B] rounded-lg p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-[#1E40AF] dark:text-[#60A5FA]">{data.projectsCount}</div>
                        <div className="text-sm text-[#6B7280]">Projects</div>
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
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            My Story
          </h2>

          <div className="space-y-8">
            {storyItems.map((item) => (
              <section key={item.key}>
                <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                  {item.title}
                </h3>
                <p className="text-[#6B7280] leading-relaxed serif-font">
                  {item.content}
                </p>
              </section>
            ))}
          </div>
        </div>
        ) : null}

        {hasSkillsSection ? (
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Skills & Interests
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {technicalGroups.length > 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center mb-4">
                <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-2 rounded-lg mr-3">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC]">
                  Technical Skills
                </h3>
              </div>
              <div className="space-y-3">
                {technicalGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">{group.label}</h4>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map(skill => (
                        <span key={skill} className="tag">
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
            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center mb-4">
                <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-2 rounded-lg mr-3">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC]">
                  Interests
                </h3>
              </div>
              <div className="space-y-3">
                {interestGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">{group.label}</h4>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map(skill => (
                        <span key={skill} className="tag">
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
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Education & Achievements
          </h2>

          <div className="space-y-6">
            {educationItems.map((item, index) => (
              <div key={`${item.title[language]}-${item.year}-${index}`} className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-start space-x-4">
                  <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-3 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-1">
                      {item.title[language]}
                    </h3>
                    <p className="text-[#6B7280] mb-2">{item.institution[language]} • {item.year}</p>
                    <p className="text-[#6B7280] text-sm serif-font">
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
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Engineering Project Timeline
          </h2>

          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-[#1E40AF] via-[#60A5FA] to-[#93C5FD]" />

            <div className="space-y-8 md:space-y-10">
              {timelineItems.map((item, index) => {
                const isLeft = index % 2 === 0;

                return (
                  <div key={item.id || `${item.title[language]}-${index}`} className="relative md:grid md:grid-cols-2 md:gap-10 items-start">
                    <div className={`${isLeft ? 'md:col-start-1' : 'md:col-start-2'} bg-white dark:bg-[#1E293B] rounded-xl p-5 shadow-sm border border-[#E5E7EB] dark:border-[#334155]`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] leading-tight">
                          {item.title[language]}
                        </h3>
                        <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {formatEngineeringDate(item.date)}
                        </span>
                      </div>

                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title[language]}
                          className="w-full h-44 object-cover rounded-lg mb-3 border border-[#E5E7EB] dark:border-[#334155]"
                        />
                      ) : null}

                      <p className="text-[#6B7280] leading-relaxed serif-font text-sm">
                        {item.description[language]}
                      </p>
                    </div>

                    <div className="hidden md:flex absolute left-1/2 top-7 -translate-x-1/2 h-4 w-4 rounded-full bg-[#1E40AF] ring-4 ring-blue-100 dark:ring-blue-900/40" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        ) : null}

        {hasContactSection ? (
        <div className="mb-16">
          {hasText(data.contactHeading[language]) ? (
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
              {data.contactHeading[language]}
            </h2>
          ) : null}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-8">
            {hasContactMessage ? (
              <p className="text-lg text-[#6B7280] mb-6 leading-relaxed serif-font text-center max-w-2xl mx-auto">
                {data.contactMessage[language]}
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              {hasLinkedin ? (
                <a
                  href={data.socialLinks.linkedin}
                  className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Linkedin className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                  <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">LinkedIn</span>
                </a>
              ) : null}

              {hasGithub ? (
                <a
                  href={data.socialLinks.github}
                  className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Github className="w-5 h-5 text-[#1A1A1A] dark:text-[#F8FAFC]" />
                  <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">GitHub</span>
                </a>
              ) : null}

              {hasEmail ? (
                <a
                  href={`mailto:${data.socialLinks.email}`}
                  className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Mail className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                  <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">Email</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
        ) : null}

        {hasQuote ? (
        <div className="mb-16">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
            <blockquote className="text-center">
              <p className="text-xl text-[#6B7280] mb-6 leading-relaxed serif-font">
                {data.quote[language]}
              </p>
              <footer className="text-[#1E40AF] dark:text-[#60A5FA] font-medium">
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
