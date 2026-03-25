import { ExternalLink, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../data/projects';
import { cn } from '../utils/cn';

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
}

function CategoryIcon({ category }: { category: Project['category'] }) {
  if (category === 'signal-processing') {
    return (
      <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
        <svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7">
          <polyline
            points="0,14 6,14 10,4 14,24 18,10 22,18 26,14 34,14 38,14"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500 dark:text-blue-400"
          />
        </svg>
      </div>
    );
  }
  if (category === 'control') {
    return (
      <div className="w-16 h-16 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
          {/* Control loop / feedback arrow */}
          <circle cx="14" cy="14" r="5" stroke="currentColor" strokeWidth="1.8" className="text-green-500 dark:text-green-400" />
          <path d="M14 4 A10 10 0 0 1 24 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-green-500 dark:text-green-400" />
          <polyline points="21,10 24,14 20,15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 dark:text-green-400" />
          <path d="M14 24 A10 10 0 0 1 4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-green-500 dark:text-green-400" />
          <polyline points="7,18 4,14 8,13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 dark:text-green-400" />
        </svg>
      </div>
    );
  }
  if (category === 'data-analysis') {
    return (
      <div className="w-16 h-16 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
          <rect x="3" y="17" width="5" height="8" rx="1" className="fill-purple-400 dark:fill-purple-500" />
          <rect x="11" y="11" width="5" height="14" rx="1" className="fill-purple-500 dark:fill-purple-400" />
          <rect x="19" y="5" width="5" height="20" rx="1" className="fill-purple-600 dark:fill-purple-300" />
          <line x1="2" y1="25.5" x2="26" y2="25.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-purple-400 dark:text-purple-500" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <polyline points="8,10 4,14 8,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" />
        <polyline points="20,10 24,14 20,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" />
        <line x1="16" y1="7" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400" />
      </svg>
    </div>
  );
}

export function ProjectCard({ project, featured = false }: ProjectCardProps) {
  const getCategoryColor = (category: Project['category']) => {
    switch (category) {
      case 'signal-processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'control':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'data-analysis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryLabel = (category: Project['category']) => {
    switch (category) {
      case 'signal-processing':
        return 'Signal Processing';
      case 'control':
        return 'Control';
      case 'data-analysis':
        return 'Data Analysis';
      default:
        return category;
    }
  };

  return (
    <div
      className={cn(
        'card group cursor-pointer transition-all duration-300 flex flex-col',
        featured && 'md:col-span-2 md:row-span-2'
      )}
    >
      <Link to={`/engineering/${project.id}`} className="flex flex-col flex-1">
        <div className="p-6 flex flex-col flex-1">
          {/* Project Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', getCategoryColor(project.category))}>
                  {getCategoryLabel(project.category)}
                </span>
                <span className="text-[#6B7280] text-xs flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  2024
                </span>
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors">
                {project.title}
              </h3>
            </div>
            <div className="ml-4 flex-shrink-0">
              <CategoryIcon category={project.category} />
            </div>
          </div>

          {/* Description */}
          <p className="text-[#6B7280] mb-4 line-clamp-3">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tags.slice(0, featured ? 5 : 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E5E7EB] text-[#6B7280] text-xs font-medium hover:bg-[#1E40AF] hover:text-white transition-colors cursor-default"
              >
                <span className="w-1 h-1 bg-current rounded-full mr-1.5"></span>
                {tag}
              </span>
            ))}
            {project.tags.length > (featured ? 5 : 3) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E5E7EB] text-[#6B7280] text-xs font-medium">
                +{project.tags.length - (featured ? 5 : 3)} more
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex items-center text-[#6B7280] text-sm group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Project
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