import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, StarHalf, Book, User, Sparkles, CheckCircle, Calendar, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

interface BookType {
  _id?: string;
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  category: 'technical' | 'biography' | 'spiritual' | 'philosophy';
  takeaways: string[];
  review: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function formatDateTimeDetailed(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function CategoryBadge({ category, language }: { category: BookType['category']; language: 'en' | 'id' }) {
  const getStyle = () => {
    switch (category) {
      case 'technical':
        return 'bg-block-lilac text-ink border border-hairline';
      case 'biography':
        return 'bg-block-lime text-ink border border-hairline';
      case 'spiritual':
        return 'bg-block-pink text-ink border border-hairline';
      case 'philosophy':
        return 'bg-block-cream text-ink border border-hairline';
      default:
        return 'bg-surface-soft text-ink border border-hairline';
    }
  };

  const getLabel = () => {
    switch (category) {
      case 'technical':
        return t('category.technical', language);
      case 'biography':
        return t('category.biography', language);
      case 'spiritual':
        return t('category.spiritual', language);
      case 'philosophy':
        return t('category.philosophy', language);
      default:
        return category;
    }
  };

  const getIcon = () => {
    switch (category) {
      case 'technical':
        return <Book className="w-4 h-4 mr-1.5" />;
      case 'biography':
        return <User className="w-4 h-4 mr-1.5" />;
      case 'spiritual':
      case 'philosophy':
        return <Sparkles className="w-4 h-4 mr-1.5" />;
      default:
        return <Book className="w-4 h-4 mr-1.5" />;
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStyle()}`}>
      {getIcon()}
      {getLabel()}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star key={`full-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
    );
  }

  if (hasHalfStar) {
    stars.push(
      <StarHalf key="half" className="w-5 h-5 fill-yellow-400 text-yellow-400" />
    );
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star key={`empty-${i}`} className="w-5 h-5 text-hairline" />
    );
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useSiteLanguage();
  const [book, setBook] = useState<BookType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    api.getPublicSettings()
      .then((settings: any) => {
        const enabled = settings?.sections?.books?.enabled !== false;
        if (!enabled) {
          navigate('/', { replace: true });
          return;
        }
        return api.get(`/api/books/public/${id}`, false)
          .then((data: BookType) => {
            if (!cancelled) setBook(data);
          })
          .catch(() => {
            if (!cancelled) setBook(null);
          });
      })
      .catch(() => {
        return api.get(`/api/books/public/${id}`, false)
          .then((data: BookType) => {
            if (!cancelled) setBook(data);
          })
          .catch(() => {
            if (!cancelled) setBook(null);
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E5E7EB] dark:bg-[#334155] flex items-center justify-center">
              <Book className="w-12 h-12 text-[#6B7280]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
              {t('library.bookNotFound', language)}
            </h1>
            <p className="text-[#6B7280] mb-8">
              {t('library.bookNotFoundHint', language)}
            </p>
            <Link
              to="/library"
              className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('library.backToLibrary', language)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center caption text-ink opacity-60 hover:opacity-100 transition-opacity mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('library.backToLibrary', language)}
        </button>

        {/* Book Header */}
        <header className="mb-10">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <img
                src={book.cover}
                alt={`${resolveLocalizedText(book.title, language)} cover`}
                className="w-48 h-64 rounded-xl shadow-lg object-cover mx-auto md:mx-0"
              />
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <CategoryBadge category={book.category} language={language} />
              </div>

              <h1 className="display-lg text-ink mb-2">
                {resolveLocalizedText(book.title, language)}
              </h1>

              <p className="subhead text-ink opacity-80 mb-4">
                by {resolveLocalizedText(book.author, language)}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <StarRating rating={book.rating} />
                <span className="caption text-ink opacity-60">
                  {book.rating} / 5
                </span>
              </div>

              {/* Timestamps */}
              {(book.createdAt || book.updatedAt) && (
                <div className="flex flex-wrap items-center gap-4 caption text-ink opacity-40 mb-4">
                  {book.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t('library.postedAt', language)} {formatDateTimeDetailed(book.createdAt)}
                    </span>
                  )}
                  {book.updatedAt && book.updatedAt !== book.createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t('library.updatedAt', language)} {formatDateTimeDetailed(book.updatedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Divider */}
        <hr className="border-hairline mb-10" />

        {/* Review Section */}
        <section className="mb-[96px]">
          <h2 className="display-md text-ink mb-8">
            {t('library.myReview', language)}
          </h2>
          <div className="bg-surface-soft border border-hairline rounded-[24px] p-8 lg:p-12">
            <p className="body-lg text-ink opacity-80 leading-relaxed serif-font">
              {book.review}
            </p>
          </div>
        </section>

        {/* Key Takeaways Section */}
        <section className="mb-[96px]">
          <h2 className="display-md text-ink mb-8">
            {t('library.keyTakeaways', language)}
          </h2>
          <div className="space-y-6">
            {book.takeaways.map((takeaway, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 bg-canvas rounded-[24px] border border-hairline shadow-sm"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-on-primary" />
                  </div>
                </div>
                <p className="body text-ink opacity-80 serif-font leading-relaxed">
                  {takeaway}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="mt-16 pt-8 border-t border-hairline">
          <Link
            to="/library"
            className="btn btn-secondary inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            View All Books
          </Link>
        </div>
      </div>
    </div>
  );
}
