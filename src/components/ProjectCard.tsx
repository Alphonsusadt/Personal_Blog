import { ExternalLink, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../data/projects';
import { cn } from '../utils/cn';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

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
  const { language } = useSiteLanguage();
  const getCategoryColor = (category: Project['category']) => {
    switch (category) {
      case 'signal-processing':
        return 'bg-block-lilac text-ink';
      case 'control':
        return 'bg-block-lime text-ink';
      case 'data-analysis':
        return 'bg-block-pink text-ink';
      default:
        return 'bg-surface-soft text-ink';
    }
  };

  const getCategoryLabel = (category: Project['category']) => {
    switch (category) {
      case 'signal-processing':
        return t('category.signalProcessing', language);
      case 'control':
        return t('category.control', language);
      case 'data-analysis':
        return t('category.dataAnalysis', language);
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
      <Link to={`/engineering/${project.id}`} className="flex flex-col flex-1 w-full">
        <div className="p-6 flex flex-col flex-1">
          {/* Project Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs border border-hairline', getCategoryColor(project.category))}>
                  {getCategoryLabel(project.category)}
                </span>
                <span className="text-ink opacity-60 text-xs flex items-center whitespace-nowrap">
                  <Calendar className="w-3 h-3 mr-1" />
                  2024
                </span>
              </div>
              <h3 className="card-title text-ink group-hover:opacity-70 transition-opacity break-words">
                {resolveLocalizedText(project.title, language)}
              </h3>
            </div>
            <div className="ml-4 flex-shrink-0">
              <CategoryIcon category={project.category} />
            </div>
          </div>

          {/* Description */}
          <p className="text-ink opacity-60 mb-4 line-clamp-3 body-sm">
            {resolveLocalizedText(project.description, language)}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tags.slice(0, featured ? 5 : 3).map((tag, index) => (
              <span
                key={index}
                className="tag"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > (featured ? 5 : 3) && (
              <span className="tag">
                +{project.tags.length - (featured ? 5 : 3)} more
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-hairline">
            {/* Project Links Preview */}
            {(project.githubUrl || project.paperUrl || project.demoUrl) && (
              <div className="flex items-center gap-2 mb-3">
                {project.githubUrl && (
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-lg">
                    <svg className="w-4 h-4 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                )}
                {project.paperUrl && (
                  <div className="flex items-center justify-center w-8 h-8 bg-red-500 rounded-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                )}
                {project.demoUrl && (
                  <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L18,12L11,7.5V16.5Z" />
                    </svg>
                  </div>
                )}
                <span className="text-xs text-ink opacity-60">
                  {t('engineering.linksAvailable', language)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center text-ink opacity-60 text-sm group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('engineering.viewProject', language)}
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
        </div>
      </Link>
    </div>
  );
}