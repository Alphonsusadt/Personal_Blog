import { useState, useMemo, useEffect } from 'react';
import { Search, Code, Activity, Database, X } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { resolveLocalizedText, getExactLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: 'signal-processing' | 'control' | 'data-analysis';
  content: string;
  featured?: boolean;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
}

export function Engineering() {
  const navigate = useNavigate();
  const { language } = useSiteLanguage();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getPublicSettings()
      .then((settings: any) => {
        const enabled = settings?.sections?.projects?.enabled !== false;
        if (!enabled) {
          navigate('/', { replace: true });
          return;
        }
        return api.getPublicProjects().then((projects: Project[]) => {
          if (!cancelled) setAllProjects(projects);
        });
      })
      .catch(() => {
        // If settings fail, fall back to attempting to load projects
        return api.getPublicProjects().then((projects: Project[]) => {
          if (!cancelled) setAllProjects(projects);
        }).catch(console.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const categories = [
    { value: 'all', label: 'All Projects', icon: Code },
    { value: 'signal-processing', label: 'Signal Processing', icon: Activity },
    { value: 'control', label: 'Control', icon: Database },
    { value: 'data-analysis', label: 'Data Analysis', icon: Database }
  ];

  const filteredProjects = useMemo(() => {
    return allProjects.filter(project => {
      // Language Filter:
      if (project.contentLanguage && project.contentLanguage !== 'bilingual' && project.contentLanguage !== language) {
        return false;
      }

      // For bilingual content, check if the selected language has actual title text.
      if (project.contentLanguage === 'bilingual' || !project.contentLanguage) {
        const titleForLang = getExactLocalizedText(project.title, language);
        if (!titleForLang) return false;
      }

      const title = resolveLocalizedText(project.title, language);
      const description = resolveLocalizedText(project.description, language);
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [language, searchTerm, selectedCategory, allProjects]);

  return (
    <div className="min-h-screen py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-[48px]">
          <h1 className="display-lg text-ink mb-4">
            Engineering Projects
          </h1>
          <p className="subhead text-ink opacity-80 max-w-2xl mx-auto">
            Exploring biomedical engineering through signal processing, medical devices, and data analysis
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink opacity-60 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-[8px] border border-hairline bg-surface-soft text-ink focus:outline-none focus:border-ink transition-colors body"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={[
                    'inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-[480] transition-colors border',
                    selectedCategory === category.value
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-surface-soft'
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          {loading ? (
            <p className="text-ink opacity-60 body-sm">Loading projects...</p>
          ) : (
            <p className="text-ink opacity-60 body-sm">
              Showing {filteredProjects.length} of {allProjects.length} projects
            </p>
          )}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-surface-soft rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-10 h-10 text-ink opacity-40" />
            </div>
            <h3 className="card-title text-ink mb-2">
              No projects found
            </h3>
            <p className="body-sm text-ink opacity-60">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity bg-ink bg-opacity-75"
                onClick={() => setSelectedProject(null)}
              />

              <div className="inline-block w-full max-w-4xl p-8 my-8 text-left align-middle transition-all transform bg-canvas border border-hairline shadow-sm rounded-[24px]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="display-lg text-ink">
                    {selectedProject.title}
                  </h2>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-2 rounded-full hover:bg-surface-soft transition-colors"
                  >
                    <X className="w-6 h-6 text-ink" />
                  </button>
                </div>

                <div className="prose max-w-none">
                  <p className="body text-ink mb-6">{selectedProject.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedProject.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="tag"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="bg-block-lime rounded-[24px] p-8 mt-8">
                    <p className="body text-ink text-center">
                      Click "View Project" to see the full project details with LaTeX equations and diagrams
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="btn btn-primary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}