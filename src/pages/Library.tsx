import { useState, useMemo, useEffect } from 'react';
import { Search, Book } from 'lucide-react';
import { getLucideIcon } from '../lib/iconMap';
import { BookCard } from '../components/BookCard';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

function CategoryIcon({ icon, className, inverted }: { icon: string; className?: string; inverted?: boolean }) {
  const isUrl = icon.startsWith('http') || icon.startsWith('/');
  const isEmoji = /\p{Emoji}/u.test(icon) && !icon.startsWith('http') && icon.length <= 4;

  const invertClass = inverted ? '[filter:brightness(0)_invert(1)]' : '';

  if (isUrl) return <img src={icon} alt="" className={`object-contain ${invertClass} ${className || ''}`} style={{ width: 16, height: 16 }} />;
  if (isEmoji) return <span className={className} style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>;

  const Comp = getLucideIcon(icon);
  if (Comp) return <Comp className={className} />;
  return <Book className={className} />;
}

interface BookItem {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  category: string;
  takeaways: string[];
  review: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
  { _id: 'fb1', section: 'books', value: 'technical', label: { en: 'Technical', id: 'Teknis' }, icon: 'Terminal', enabled: true, order: 1 },
  { _id: 'fb2', section: 'books', value: 'biography', label: { en: 'Biography', id: 'Biografi' }, icon: 'User', enabled: true, order: 2 },
  { _id: 'fb3', section: 'books', value: 'spiritual', label: { en: 'Spiritual', id: 'Spiritual' }, icon: 'Heart', enabled: true, order: 3 },
  { _id: 'fb4', section: 'books', value: 'philosophy', label: { en: 'Philosophy', id: 'Filosofi' }, icon: 'Scale', enabled: true, order: 4 },
];

export function Library() {
  const navigate = useNavigate();
  const { language } = useSiteLanguage();
  const [allBooks, setAllBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dynamicCategories, setDynamicCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getPublicCategories('books')
      .then((cats: CategoryItem[]) => { if (!cancelled) setDynamicCategories(cats); })
      .catch(() => { if (!cancelled) setDynamicCategories(FALLBACK_CATEGORIES); });

    api.getPublicSettings()
      .then((settings: any) => {
        const enabled = settings?.sections?.books?.enabled !== false;
        if (!enabled) {
          navigate('/', { replace: true });
          return;
        }
        return api.getPublicBooks().then((books: BookItem[]) => {
          if (!cancelled) setAllBooks(books);
        });
      })
      .catch(() => {
        return api.getPublicBooks().then((books: BookItem[]) => {
          if (!cancelled) setAllBooks(books);
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
      { value: 'all', label: t('category.allBooks', language), icon: 'Book' },
      ...dbCats,
    ];
  }, [dynamicCategories, language]);

  const filteredBooks = useMemo(() => {
    return allBooks.filter(book => {
      // Language Filter:
      if (book.contentLanguage && book.contentLanguage !== 'bilingual' && book.contentLanguage !== language) {
        return false;
      }

      // For bilingual content, allow showing even if specific language is missing
      // (resolveLocalizedText will fallback to other language)
      const title = resolveLocalizedText(book.title, language);
      if (!title) return false; // Only filter if NO title exists at all

      const author = resolveLocalizedText(book.author, language);
      const review = resolveLocalizedText(book.review, language);
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (author?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                           (review?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [language, searchTerm, selectedCategory, allBooks]);

  return (
    <div className="min-h-screen py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-[48px]">
          <h1 className="display-lg text-ink mb-4">
            {t('library.title', language)}
          </h1>
          <p className="subhead text-ink opacity-80 max-w-2xl mx-auto">
            {t('library.subtitle', language)}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink opacity-60 w-5 h-5" />
            <input
              type="text"
              placeholder={t('library.searchPlaceholder', language)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-[8px] border border-hairline bg-surface-soft text-ink focus:outline-none focus:border-ink transition-colors body"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
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
        </div>

        {/* Results Count */}
        <div className="mb-8 text-center">
          {loading ? (
            <p className="text-ink opacity-60 body-sm">{t('library.loading', language)}</p>
          ) : (
            <p className="text-ink opacity-60 body-sm">
              {selectedCategory === 'all'
                ? `${t('library.showing', language)} ${filteredBooks.length} ${t('library.books', language)}`
                : `${t('library.showing', language)} ${filteredBooks.length} ${selectedCategory} ${t('library.books', language)}`
              }
            </p>
          )}
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>

        {/* No Results */}
        {filteredBooks.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-surface-soft rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-10 h-10 text-ink opacity-40" />
            </div>
            <h3 className="card-title text-ink mb-2">
              {t('library.noResults', language)}
            </h3>
            <p className="body-sm text-ink opacity-60">
              {t('library.noResultsHint', language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}