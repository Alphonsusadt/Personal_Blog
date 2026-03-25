import { Book } from '../data/library';
import { Star, StarHalf, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
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
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'biography':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'spiritual':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'philosophy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
    <Link to={`/library/${book.id}`} className="card group hover:shadow-lg transition-all duration-300 block">
      <div className="p-6">
        {/* Book Cover and Basic Info */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="flex-shrink-0">
            <img
              src={book.cover}
              alt={`${book.title} cover`}
              className="w-20 h-28 rounded-lg shadow-md object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className={getCategoryColor(book.category)}>
                {getCategoryLabel(book.category)}
              </span>
              <div className="flex items-center space-x-1">
                {renderStars(book.rating)}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors line-clamp-2">
              {book.title}
            </h3>
            <p className="text-sm text-[#6B7280] mt-1">by {book.author}</p>
          </div>
        </div>

        {/* Review */}
        <p className="text-[#6B7280] text-sm mb-4 line-clamp-3 serif-font">
          {book.review}
        </p>

        {/* Key Takeaways */}
        <div className="border-t border-[#E5E7EB] dark:border-[#334155] pt-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">
            Key Takeaways:
          </h4>
          <ul className="space-y-1">
            {book.takeaways.slice(0, 2).map((takeaway, index) => (
              <li key={index} className="flex items-start text-sm text-[#6B7280]">
                <span className="text-[#1E40AF] dark:text-[#60A5FA] mr-2">•</span>
                <span className="serif-font">{takeaway}</span>
              </li>
            ))}
            {book.takeaways.length > 2 && (
              <li className="text-sm text-[#6B7280] italic">
                +{book.takeaways.length - 2} more insights
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center text-[#6B7280] text-sm group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors">
            <BookOpen className="w-4 h-4 mr-2" />
            Read Full Review
          </div>
          <div className="flex items-center space-x-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-[#6B7280] dark:bg-[#94A3B8] rounded-full group-hover:bg-[#1E40AF] dark:group-hover:bg-[#60A5FA] transition-colors"
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}