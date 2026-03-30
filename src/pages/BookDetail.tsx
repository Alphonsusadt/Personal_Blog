import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, StarHalf, Book, User, Sparkles, CheckCircle, Calendar, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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

function CategoryBadge({ category }: { category: BookType['category'] }) {
  const getStyle = () => {
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

  const getLabel = () => {
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
      <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300 dark:text-gray-600" />
    );
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/api/books/public/${id}`, false)
      .then((data: BookType) => setBook(data))
      .catch(() => setBook(null))
      .finally(() => setLoading(false));
  }, [id]);

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
              Book Not Found
            </h1>
            <p className="text-[#6B7280] mb-8">
              The book you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/library"
              className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </button>

        {/* Book Header */}
        <header className="mb-10">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <img
                src={book.cover}
                alt={`${book.title} cover`}
                className="w-48 h-64 rounded-xl shadow-lg object-cover mx-auto md:mx-0"
              />
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <CategoryBadge category={book.category} />
              </div>

              <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">
                {book.title}
              </h1>

              <p className="text-xl text-[#6B7280] mb-4">
                by {book.author}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <StarRating rating={book.rating} />
                <span className="text-[#6B7280] text-sm">
                  {book.rating} / 5
                </span>
              </div>

              {/* Timestamps */}
              {(book.createdAt || book.updatedAt) && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9CA3AF] dark:text-[#6B7280] mb-4">
                  {book.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Diposting: {formatDateTimeDetailed(book.createdAt)}
                    </span>
                  )}
                  {book.updatedAt && book.updatedAt !== book.createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Diperbarui: {formatDateTimeDetailed(book.updatedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Divider */}
        <hr className="border-[#E5E7EB] dark:border-[#334155] mb-10" />

        {/* Review Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            My Review
          </h2>
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-xl p-6">
            <p className="text-[#4B5563] dark:text-[#94A3B8] leading-relaxed serif-font text-lg">
              {book.review}
            </p>
          </div>
        </section>

        {/* Key Takeaways Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            Key Takeaways
          </h2>
          <div className="space-y-4">
            {book.takeaways.map((takeaway, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155]"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#1E40AF] dark:bg-[#60A5FA] flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white dark:text-[#0F172A]" />
                  </div>
                </div>
                <p className="text-[#4B5563] dark:text-[#94A3B8] serif-font leading-relaxed">
                  {takeaway}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="mt-16 pt-8 border-t border-[#E5E7EB] dark:border-[#334155]">
          <Link
            to="/library"
            className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            View All Books
          </Link>
        </div>
      </div>
    </div>
  );
}
