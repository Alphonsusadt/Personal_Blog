import { Writing } from '../data/writings';
import { Calendar, Clock, BookOpen, Edit3, PenTool } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

interface WritingCardProps {
  writing: Writing;
}

export function WritingCard({ writing }: WritingCardProps) {
  const getIcon = (category: Writing['category']) => {
    switch (category) {
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
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'stories':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fiction':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryLabel = (category: Writing['category']) => {
    switch (category) {
      case 'reflections':
        return 'Reflections';
      case 'stories':
        return 'Stories';
      case 'fiction':
        return 'Fiction';
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
    <div className="card group hover:shadow-lg transition-all duration-300">
      <Link to={`/writings/${writing.id}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className={cn('p-2 rounded-lg', getCategoryColor(writing.category))}>
                  {getIcon(writing.category)}
                </div>
                <div>
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', getCategoryColor(writing.category))}>
                    {getCategoryLabel(writing.category)}
                  </span>
                </div>
              </div>
              <h3 className={cn(
                'text-xl font-semibold mb-2',
                writing.category === 'reflections' || writing.category === 'stories' ? 'serif-font' : ''
              )}>
                <span className="text-[#1A1A1A] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors">
                  {writing.title}
                </span>
              </h3>
            </div>
          </div>

          {/* Meta Information */}
          <div className="flex items-center space-x-4 text-sm text-[#6B7280] mb-4">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(writing.date)}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {writing.readTime}
            </span>
          </div>

          {/* Excerpt */}
          <p className={cn(
            'text-[#6B7280] mb-4 line-clamp-3 leading-relaxed',
            writing.category === 'reflections' || writing.category === 'stories' ? 'serif-font text-base' : ''
          )}>
            {writing.excerpt}
          </p>

          {/* Tags */}
          {writing.tags && writing.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {writing.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E5E7EB] text-[#6B7280] text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {writing.tags.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E5E7EB] text-[#6B7280] text-xs font-medium">
                  +{writing.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex items-center text-[#6B7280] text-sm group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors">
              <BookOpen className="w-4 h-4 mr-2" />
              Read More
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
    </div>
  );
}
