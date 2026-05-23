import { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { getLucideIcon } from '../lib/iconMap';
import { WritingCard } from '../components/WritingCard';
import { api, API_BASE } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

function resolveIconSrc(icon: string): string {
  if (icon.startsWith('/')) return `${API_BASE}${icon}`;
  if (icon.startsWith('http') && !icon.includes('/uploads/')) {
    return `${API_BASE}/api/media/icon-proxy?url=${encodeURIComponent(icon)}`;
  }
  return icon;
}

function CategoryIcon({ icon, className, inverted }: { icon: string; className?: string; inverted?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const isUrl = icon.startsWith('http') || icon.startsWith('/');
  const isEmoji = /\p{Emoji}/u.test(icon) && !icon.startsWith('http') && icon.length <= 4;

  const invertClass = inverted ? 'category-icon-active' : 'category-icon-inactive';

  if (isUrl && !imgError) return <img src={resolveIconSrc(icon)} alt="" className={`object-contain ${invertClass} ${className || ''}`} style={{ width: 16, height: 16 }} onError={() => setImgError(true)} />;
  if (isEmoji) return <span className={className} style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>;

  const Comp = getLucideIcon(icon);
  if (Comp) return <Comp className={className} />;
  return <BookOpen className={className} />;
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
      icon: cat.icon,
    }));
    return [
      { value: 'all', label: t('category.allWritings', language), icon: 'BookOpen' },
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

      // For bilingual content, allow showing even if specific language is missing
      // (resolveLocalizedText will fallback to other language)
      const title = resolveLocalizedText(writing.title, language);
      if (!title) return false; // Only filter if NO title exists at all

      const excerpt = resolveLocalizedText(writing.excerpt, language);
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                           writing.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || writing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [language, searchTerm, selectedCategory, allWritings]);

  return (
    <div className="min-h-screen py-12 md:py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-[48px]">
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
                  <CategoryIcon icon={category.icon} className="w-4 h-4" inverted={selectedCategory === category.value} />
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
          {filteredWritings.map((writing) => {
            const catItem = dynamicCategories.find(c => c.value === writing.category);
            return (
              <WritingCard 
                key={writing.id} 
                writing={writing} 
                categoryIcon={catItem?.icon}
              />
            );
          })}
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