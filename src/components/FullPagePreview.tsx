import { X } from 'lucide-react';
import { renderMarkdown } from '../utils/renderers';
import { Star, CheckCircle, Calendar, Clock, Tag, Github, FileText, Globe } from 'lucide-react';

interface Writing {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Book {
  title: string;
  author: string;
  cover: string;
  rating: number;
  category: string;
  takeaways: string[];
  review: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Project {
  title: string;
  description: string;
  tags: string[];
  category: string;
  content: string;
  devStatus?: string;
  date?: string;
  githubUrl?: string;
  paperUrl?: string;
  demoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

type PreviewType = 'writing' | 'book' | 'project';

interface FullPagePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  type: PreviewType;
  data: Writing | Book | Project;
}

export function FullPagePreview({ isOpen, onClose, type, data }: FullPagePreviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Preview Halaman</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {type === 'writing' ? 'Writing' : type === 'book' ? 'Book' : 'Project'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Preview Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-white">
          {type === 'writing' && <WritingPreview data={data as Writing} />}
          {type === 'book' && <BookPreview data={data as Book} />}
          {type === 'project' && <ProjectPreview data={data as Project} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Ini adalah preview tampilan di website publik
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// Writing Preview Component
function WritingPreview({ data }: { data: Writing }) {
  const categoryLabels: Record<string, string> = {
    'reflections': 'Refleksi',
    'technical': 'Teknikal',
    'ideas': 'Ide',
    'tutorial': 'Tutorial',
  };

  return (
    <article className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {categoryLabels[data.category] || data.category}
          </span>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{data.date || 'Tanggal'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock className="w-4 h-4" />
            <span>{data.readTime || '5 min'}</span>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {data.title || 'Judul Tulisan'}
        </h1>
        
        <p className="text-xl text-gray-600 leading-relaxed">
          {data.excerpt || 'Deskripsi singkat tulisan...'}
        </p>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {data.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Divider */}
      <hr className="border-gray-200 my-8" />

      {/* Content */}
      <div 
        className="prose prose-lg max-w-none
          prose-headings:text-gray-900 prose-headings:font-bold
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900
          prose-code:text-red-600 prose-code:bg-red-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-900 prose-pre:text-gray-100
          prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4
          prose-img:rounded-lg prose-img:shadow-md"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content || '*Mulai menulis untuk melihat preview...*') }}
      />
    </article>
  );
}

// Book Preview Component
function BookPreview({ data }: { data: Book }) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-8">
      {/* Book Header */}
      <header className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          {data.cover ? (
            <img 
              src={data.cover} 
              alt={data.title}
              className="w-48 h-72 object-cover rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-48 h-72 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
              <span className="text-white text-6xl">📚</span>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4 inline-block">
            {data.category?.charAt(0).toUpperCase() + data.category?.slice(1) || 'Category'}
          </span>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {data.title || 'Judul Buku'}
          </h1>
          
          <p className="text-lg text-gray-600 mb-4">
            oleh <span className="font-medium">{data.author || 'Penulis'}</span>
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-gray-600 text-sm">Rating:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= (data.rating || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-600 font-medium">{data.rating || 0}/5</span>
          </div>
        </div>
      </header>

      {/* Key Takeaways */}
      {data.takeaways && data.takeaways.length > 0 && (
        <section className="mb-8 p-6 bg-green-50 rounded-xl border border-green-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Key Takeaways
          </h2>
          <ul className="space-y-3">
            {data.takeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{takeaway}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Review */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Review</h2>
        <div 
          className="prose prose-lg max-w-none
            prose-headings:text-gray-900
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-a:text-blue-600
            prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(data.review || '*Tulis review buku di sini...*') }}
        />
      </section>
    </article>
  );
}

// Project Preview Component
function ProjectPreview({ data }: { data: Project }) {
  const statusColors: Record<string, string> = {
    'planning': 'bg-blue-100 text-blue-700',
    'ongoing': 'bg-yellow-100 text-yellow-700',
    'completed': 'bg-green-100 text-green-700',
  };

  return (
    <article className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
            {data.category?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Category'}
          </span>
          {data.devStatus && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[data.devStatus] || 'bg-gray-100 text-gray-700'}`}>
              {data.devStatus.charAt(0).toUpperCase() + data.devStatus.slice(1)}
            </span>
          )}
          {data.date && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{data.date}</span>
            </div>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {data.title || 'Judul Project'}
        </h1>
        
        <p className="text-lg text-gray-600 leading-relaxed mb-6">
          {data.description || 'Deskripsi singkat project...'}
        </p>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-6">
          {data.githubUrl && (
            <a href={data.githubUrl} target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
              <Github className="w-4 h-4" />
              GitHub
            </a>
          )}
          {data.paperUrl && (
            <a href={data.paperUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FileText className="w-4 h-4" />
              Paper
            </a>
          )}
          {data.demoUrl && (
            <a href={data.demoUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Globe className="w-4 h-4" />
              Demo
            </a>
          )}
        </div>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Divider */}
      <hr className="border-gray-200 my-8" />

      {/* Content */}
      <div 
        className="prose prose-lg max-w-none
          prose-headings:text-gray-900 prose-headings:font-bold
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900
          prose-code:text-red-600 prose-code:bg-red-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-900 prose-pre:text-gray-100
          prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4
          prose-img:rounded-lg prose-img:shadow-md"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content || '*Mulai menulis untuk melihat preview...*') }}
      />
    </article>
  );
}
