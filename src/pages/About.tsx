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
  quote: LocalizedText;
  contactHeading: LocalizedText;
  contactMessage: LocalizedText;
  socialLinks: { linkedin: string; github: string; email: string };
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

  return {
    title: asLocalizedText(data.title, 'About Alphonsus'),
    subtitle: asLocalizedText(data.subtitle, 'Bridging the worlds of biomedical engineering and faith'),
    bio: asLocalizedText(data.bio),
    profileImage: typeof data.profileImage === 'string' ? data.profileImage : '',
    gpa: typeof data.gpa === 'string' ? data.gpa : '3.9',
    projectsCount: typeof data.projectsCount === 'string' ? data.projectsCount : '6+',
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
    quote: asLocalizedText(data.quote),
    contactHeading: asLocalizedText(data.contactHeading, "Let's Connect"),
    contactMessage: asLocalizedText(data.contactMessage),
    socialLinks: {
      linkedin: typeof socialLinks.linkedin === 'string' ? socialLinks.linkedin : 'https://linkedin.com/in/alphonsusadt',
      github: typeof socialLinks.github === 'string' ? socialLinks.github : 'https://github.com/alphonsusadt',
      email: typeof socialLinks.email === 'string' ? socialLinks.email : 'alphonsus@example.com',
    },
  };
};

const defaultData: AboutData = normalizeAboutData({});

export function About() {
  const [data, setData] = useState<AboutData>(defaultData);
  const { language } = useSiteLanguage();

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

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            {data.title[language]}
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            {data.subtitle[language]}
          </p>
        </div>

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
                <p className="text-[#6B7280] mb-6 leading-relaxed">
                  {data.bio[language]}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#1E293B] rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-[#1E40AF] dark:text-[#60A5FA]">{data.gpa}</div>
                    <div className="text-sm text-[#6B7280]">GPA</div>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-[#1E40AF] dark:text-[#60A5FA]">{data.projectsCount}</div>
                    <div className="text-sm text-[#6B7280]">Projects</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            My Story
          </h2>

          <div className="space-y-8">
            <section>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                Why Biomedical Engineering?
              </h3>
              <p className="text-[#6B7280] leading-relaxed mb-4 serif-font">
                {data.story.whyBME[language]}
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                The Intersection of Faith and Engineering
              </h3>
              <p className="text-[#6B7280] leading-relaxed mb-4 serif-font">
                {data.story.faithAndEngineering[language]}
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                Current Focus
              </h3>
              <p className="text-[#6B7280] leading-relaxed serif-font">
                {data.story.currentFocus[language]}
              </p>
            </section>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Skills & Interests
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Programming Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.programming[language].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.specializations[language].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

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
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Academic</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.academicInterests[language].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Personal</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.personalInterests[language].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Education & Achievements
          </h2>

          <div className="space-y-6">
            {data.education.map((item, index) => (
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

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            {data.contactHeading[language]}
          </h2>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-8">
            <p className="text-lg text-[#6B7280] mb-6 leading-relaxed serif-font text-center max-w-2xl mx-auto">
              {data.contactMessage[language]}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <a
                href={data.socialLinks.linkedin}
                className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Linkedin className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">LinkedIn</span>
              </a>

              <a
                href={data.socialLinks.github}
                className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Github className="w-5 h-5 text-[#1A1A1A] dark:text-[#F8FAFC]" />
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">GitHub</span>
              </a>

              <a
                href={`mailto:${data.socialLinks.email}`}
                className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Mail className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">Email</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
            <blockquote className="text-center">
              <p className="text-xl text-[#6B7280] mb-6 leading-relaxed serif-font">
                {data.quote[language]}
              </p>
              <footer className="text-[#1E40AF] dark:text-[#60A5FA] font-medium">
                � Alphonsus Aditya
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
