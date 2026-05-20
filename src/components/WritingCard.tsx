import { useState } from 'react';
import { Writing } from '../data/writings';
import { Calendar, Clock, BookOpen, Edit3, PenTool } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';
import { getLucideIcon } from '../lib/iconMap';
import { API_BASE } from '../lib/api';

interface WritingCardProps {
  writing: Writing;
  categoryIcon?: string;
}

function resolveIconSrc(icon: string): string {
  if (icon.startsWith('/')) return `${API_BASE}${icon}`;
  if (icon.startsWith('http') && !icon.includes('/uploads/')) {
    return `${API_BASE}/api/media/icon-proxy?url=${encodeURIComponent(icon)}`;
  }
  return icon;
}

export function WritingCard({ writing, categoryIcon }: WritingCardProps) {
  const { language } = useSiteLanguage();
  const [imgError, setImgError] = useState(false);

  const getIcon = () => {
    if (categoryIcon) {
      const isUrl = categoryIcon.startsWith('http') || categoryIcon.startsWith('/');
      const isEmoji = /\p{Emoji}/u.test(categoryIcon) && !categoryIcon.startsWith('http') && categoryIcon.length <= 4;

      if (isUrl && !imgError) {
        return (
          <img
            src={resolveIconSrc(categoryIcon)}
            alt=""
            className="w-5 h-5 object-contain"
            onError={() => setImgError(false)}
          />
        );
      }
      if (isEmoji) {
        return (
          <span style={{ fontSize: 16, lineHeight: 1 }} className="w-5 h-5 flex items-center justify-center">
            {categoryIcon}
          </span>
        );
      }
      const LucideComp = getLucideIcon(categoryIcon);
      if (LucideComp) {
        return <LucideComp className="w-5 h-5" />;
      }
    }

    // Default hardcoded fallback
    switch (writing.category) {
      case 'reflections':
        return <BookOpen className="w-5 h-5" />;
      case 'stories':
        return <Edit3 className="w-5 h-5" />;
      case 'fiction':
        return <PenTool className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };


  const getCategoryColor = (category: Writing['category']) => {
    switch (category) {
      case 'reflections':
        return 'bg-block-lilac text-ink border border-hairline';
      case 'stories':
        return 'bg-block-lime text-ink border border-hairline';
      case 'fiction':
        return 'bg-block-coral text-ink border border-hairline';
      default:
        return 'bg-surface-soft text-ink border border-hairline';
    }
  };

  const getCategoryLabel = (category: Writing['category']) => {
    switch (category) {
      case 'reflections':
        return t('category.reflections', language);
      case 'stories':
        return t('category.stories', language);
      case 'fiction':
        return t('category.fiction', language);
      default:
        return category;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="card group transition-all duration-300 flex flex-col">
      <Link to={`/writings/${writing.id}`} className="flex flex-col flex-1 w-full">
        <div className="p-6 flex flex-col flex-1 w-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <div className={cn('p-2 rounded-[6px]', getCategoryColor(writing.category))}>
                  {getIcon()}
                </div>
                <div>
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs', getCategoryColor(writing.category))}>
                    {getCategoryLabel(writing.category)}
                  </span>
                </div>
              </div>
              <h3 className={cn(
                'card-title mb-2 break-words',
                writing.category === 'reflections' || writing.category === 'stories' ? 'serif-font' : ''
              )}>
                <span className="text-ink group-hover:opacity-70 transition-opacity">
                  {resolveLocalizedText(writing.title, language)}
                </span>
              </h3>
            </div>
          </div>

          {/* Meta Information */}
          <div className="flex items-center space-x-4 text-sm text-ink opacity-60 mb-4">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(writing.date)}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {writing.readTime} {t('writings.read', language)}
            </span>
          </div>

          {/* Excerpt */}
          <p className={cn(
            'text-ink opacity-60 mb-4 line-clamp-3 leading-relaxed',
            writing.category === 'reflections' || writing.category === 'stories' ? 'serif-font text-base' : 'body-sm'
          )}>
            {resolveLocalizedText(writing.excerpt, language)}
          </p>

          {/* Tags */}
          {writing.tags && writing.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {writing.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="tag"
                >
                  {tag}
                </span>
              ))}
              {writing.tags.length > 3 && (
                <span className="tag">
                  +{writing.tags.length - 3} {t('generic.more', language)}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-hairline">
            <div className="flex items-center text-ink opacity-60 text-sm group-hover:opacity-100 transition-opacity">
              <BookOpen className="w-4 h-4 mr-2" />
              {t('writings.readMore', language)}
            </div>
            <div className="flex items-center space-x-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-ink opacity-30 rounded-full group-hover:opacity-100 transition-opacity"
                />
              ))}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
