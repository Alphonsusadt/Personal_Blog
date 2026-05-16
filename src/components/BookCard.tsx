import { Book } from '../data/library';
import { Star, StarHalf, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const { language } = useSiteLanguage();
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf
          key="half"
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300"
        />
      );
    }

    return stars;
  };

  const getCategoryColor = (category: Book['category']) => {
    switch (category) {
      case 'technical':
        return 'bg-block-mint text-ink border border-hairline';
      case 'biography':
        return 'bg-block-lime text-ink border border-hairline';
      case 'spiritual':
        return 'bg-block-lilac text-ink border border-hairline';
      case 'philosophy':
        return 'bg-block-coral text-ink border border-hairline';
      default:
        return 'bg-surface-soft text-ink border border-hairline';
    }
  };

  const getCategoryLabel = (category: Book['category']) => {
    switch (category) {
      case 'technical':
        return 'Technical';
      case 'biography':
        return 'Biography';
      case 'spiritual':
        return 'Spiritual';
      case 'philosophy':
        return 'Philosophy';
      default:
        return category;
    }
  };

  return (
    <Link to={`/library/${book.id}`} className="card group transition-all duration-300 flex flex-col">
      <div className="p-6 flex flex-col flex-1 w-full">
        {/* Book Cover and Basic Info */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="flex-shrink-0">
            <img
              src={book.cover}
              alt={`${resolveLocalizedText(book.title, language)} cover`}
              className="w-20 h-28 rounded-[8px] border border-hairline object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs ${getCategoryColor(book.category)}`}>
                {getCategoryLabel(book.category)}
              </span>
              <div className="flex items-center space-x-1">
                {renderStars(book.rating)}
              </div>
            </div>
            <h3 className="card-title text-ink group-hover:opacity-70 transition-opacity line-clamp-2">
              {resolveLocalizedText(book.title, language)}
            </h3>
            <p className="body-sm text-ink opacity-60 mt-1">by {resolveLocalizedText(book.author, language)}</p>
          </div>
        </div>

        {/* Review */}
        <p className="text-ink opacity-60 text-sm mb-4 line-clamp-3 serif-font">
          {resolveLocalizedText(book.review, language)}
        </p>

        {/* Key Takeaways */}
        <div className="border-t border-hairline pt-4">
          <h4 className="caption text-ink opacity-60 mb-2">
            Key Takeaways:
          </h4>
          <ul className="space-y-1">
            {book.takeaways.slice(0, 2).map((takeaway, index) => (
              <li key={index} className="flex items-start text-sm text-ink opacity-80">
                <span className="text-ink mr-2">•</span>
                <span className="serif-font">{takeaway}</span>
              </li>
            ))}
            {book.takeaways.length > 2 && (
              <li className="text-sm text-ink opacity-60 italic">
                +{book.takeaways.length - 2} more insights
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-hairline">
          <div className="flex items-center text-ink opacity-60 text-sm group-hover:opacity-100 transition-opacity">
            <BookOpen className="w-4 h-4 mr-2" />
            Read Full Review
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
  );
}