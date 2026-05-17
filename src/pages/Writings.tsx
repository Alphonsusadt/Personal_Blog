import { useState, useMemo, useEffect, type ComponentType, type SVGProps } from 'react';
import { Search, BookOpen } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { WritingCard } from '../components/WritingCard';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { resolveLocalizedText, getExactLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

function resolveIcon(iconStr: string): ComponentType<SVGProps<SVGSVGElement> & { size?: number; className?: string }> {
  if (!iconStr) return BookOpen;
  if (iconStr.startsWith('http') || iconStr.startsWith('/')) return BookOpen;
  const Comp = (LucideIcons as Record<string, ComponentType<SVGProps<SVGSVGElement> & { size?: number; className?: string }>>)[iconStr];
  return Comp || BookOpen;
}

interface Writing {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags?: string[];
  content: string;
  status?: 'draft' | 'published';
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
}

interface CategoryItem {
  _id: string;
  section: string;
  value: string;
  label: { en: string; id: string };
  icon: string;
  enabled: boolean;
  order: number;
}

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { _id: 'fb1', section: 'writings', value: 'reflections', label: { en: 'Reflections', id: 'Refleksi' }, icon: 'Lightbulb', enabled: true, order: 1 },
  { _id: 'fb2', section: 'writings', value: 'stories', label: { en: 'Stories', id: 'Cerita' }, icon: 'Feather', enabled: true, order: 2 },
  { _id: 'fb3', section: 'writings', value: 'fiction', label: { en: 'Fiction', id: 'Fiksi' }, icon: 'Sparkles', enabled: true, order: 3 },
];

export function Writings() {
  const navigate = useNavigate();
  const { language } = useSiteLanguage();
  const [allWritings, setAllWritings] = useState<Writing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dynamicCategories, setDynamicCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getPublicCategories('writings')
      .then((cats: CategoryItem[]) => { if (!cancelled) setDynamicCategories(cats); })
      .catch(() => { if (!cancelled) setDynamicCategories(FALLBACK_CATEGORIES); });

    api.getPublicSettings()
      .then((settings: any) => {
        const enabled = settings?.sections?.writings?.enabled !== false;
        if (!enabled) {
          navigate('/', { replace: true });
          return;
        }
        return api.getPublicWritings().then((writings: Writing[]) => {
          if (!cancelled) setAllWritings(writings);
        });
      })
      .catch(() => {
        return api.getPublicWritings().then((writings: Writing[]) => {
          if (!cancelled) setAllWritings(writings);
        }).catch(console.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const categories = useMemo(() => {
    const dbCats = dynamicCategories.map((cat) => ({
      value: cat.value,
      label: cat.label[language] || cat.label.en,
      icon: resolveIcon(cat.icon),
    }));
    return [
      { value: 'all', label: t('category.allWritings', language), icon: BookOpen },
      ...dbCats,
    ];
  }, [dynamicCategories, language]);

  const filteredWritings = useMemo(() => {
    return allWritings.filter(writing => {
      // Language Filter:
      // If contentLanguage is strictly set to 'en' or 'id', only show it on the corresponding site language.
      if (writing.contentLanguage && writing.contentLanguage !== 'bilingual' && writing.contentLanguage !== language) {
        return false;
      }

      // For bilingual content, check if the selected language has actual title text.
      // If not, don't show it (avoids showing Indonesian content when user switched to English).
      if (writing.contentLanguage === 'bilingual' || !writing.contentLanguage) {
        const titleForLang = getExactLocalizedText(writing.title, language);
        if (!titleForLang) return false;
      }

      const title = resolveLocalizedText(writing.title, language);
      const excerpt = resolveLocalizedText(writing.excerpt, language);
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           writing.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || writing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [language, searchTerm, selectedCategory, allWritings]);

  return (
    <div className="min-h-screen py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-[48px]">
          <h1 className="display-lg text-ink mb-4">
            {t('writings.title', language)}
          </h1>
          <p className="subhead text-ink opacity-80 max-w-2xl mx-auto">
            {t('writings.subtitle', language)}
          </p>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={[
                  'inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-[480] transition-colors border',
                  selectedCategory === category.value
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-surface-soft'
                ].join(' ')}
              >
                <Icon className="w-4 h-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink opacity-60 w-5 h-5" />
            <input
              type="text"
              placeholder={t('writings.searchPlaceholder', language)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-[8px] border border-hairline bg-surface-soft text-ink focus:outline-none focus:border-ink transition-colors body"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-8 text-center">
          {loading ? (
            <p className="text-ink opacity-60 body-sm">{t('writings.loading', language)}</p>
          ) : (
            <p className="text-ink opacity-60 body-sm">
              {selectedCategory === 'all'
                ? `${t('writings.showing', language)} ${filteredWritings.length} ${t('writings.writings', language)}`
                : `${t('writings.showing', language)} ${filteredWritings.length} ${selectedCategory} ${t('writings.writings', language)}`
              }
            </p>
          )}
        </div>

        {/* Writings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredWritings.map((writing) => (
            <WritingCard key={writing.id} writing={writing} />
          ))}
        </div>

        {/* No Results */}
        {filteredWritings.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-surface-soft rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-10 h-10 text-ink opacity-40" />
            </div>
            <h3 className="card-title text-ink mb-2">
              {t('writings.noResults', language)}
            </h3>
            <p className="body-sm text-ink opacity-60">
              {t('writings.noResultsHint', language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}