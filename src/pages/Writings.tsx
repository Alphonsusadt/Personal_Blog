import { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen, Edit3, PenTool } from 'lucide-react';
import { WritingCard } from '../components/WritingCard';
import { api } from '../lib/api';

interface Writing {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: 'reflections' | 'stories' | 'fiction';
  tags?: string[];
  content: string;
  status?: 'draft' | 'published';
}

export function Writings() {
  const [allWritings, setAllWritings] = useState<Writing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api.getPublicWritings()
      .then((writings: Writing[]) => {
        setAllWritings(writings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { value: 'all', label: 'All Writings', icon: BookOpen },
    { value: 'reflections', label: 'Reflections', icon: BookOpen },
    { value: 'stories', label: 'Stories', icon: Edit3 },
    { value: 'fiction', label: 'Fiction', icon: PenTool }
  ];

  const filteredWritings = useMemo(() => {
    return allWritings.filter(writing => {
      const matchesSearch = writing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           writing.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           writing.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || writing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, allWritings]);

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            Writings
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Reflections on faith, engineering, and the human experience
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
                  'inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  selectedCategory === category.value
                    ? 'bg-[#1E40AF] text-white'
                    : 'bg-[#E5E7EB] text-[#6B7280] hover:bg-[#D1D5DB] dark:bg-[#334155] dark:text-[#94A3B8] dark:hover:bg-[#475569]'
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
            <input
              type="text"
              placeholder="Search writings by title, excerpt, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1A1A1A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#60A5FA] focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-8 text-center">
          {loading ? (
            <p className="text-[#6B7280]">Loading writings...</p>
          ) : (
            <p className="text-[#6B7280]">
              {selectedCategory === 'all'
                ? `Showing ${filteredWritings.length} writings`
                : `Showing ${filteredWritings.length} ${selectedCategory} writings`
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
            <div className="bg-[#E5E7EB] dark:bg-[#334155] rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-10 h-10 text-[#6B7280] dark:text-[#94A3B8]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">
              No writings found
            </h3>
            <p className="text-[#6B7280]">
              Try adjusting your search terms or category filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}