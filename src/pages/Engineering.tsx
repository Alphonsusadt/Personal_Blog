import { useState, useMemo, useEffect } from 'react';
import { Search, Code, Activity, Database, X } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { api } from '../lib/api';

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
}

export function Engineering() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getPublicProjects()
      .then((projects: Project[]) => {
        setAllProjects(projects);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { value: 'all', label: 'All Projects', icon: Code },
    { value: 'signal-processing', label: 'Signal Processing', icon: Activity },
    { value: 'control', label: 'Control', icon: Database },
    { value: 'data-analysis', label: 'Data Analysis', icon: Database }
  ];

  const filteredProjects = useMemo(() => {
    return allProjects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, allProjects]);

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            Engineering Projects
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Exploring biomedical engineering through signal processing, medical devices, and data analysis
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1A1A1A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#60A5FA] focus:border-transparent"
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
        </div>

        {/* Results Count */}
        <div className="mb-6">
          {loading ? (
            <p className="text-[#6B7280]">Loading projects...</p>
          ) : (
            <p className="text-[#6B7280]">
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
            <div className="bg-[#E5E7EB] dark:bg-[#334155] rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-10 h-10 text-[#6B7280] dark:text-[#94A3B8]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">
              No projects found
            </h3>
            <p className="text-[#6B7280]">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity bg-[#1A1A1A] bg-opacity-75"
                onClick={() => setSelectedProject(null)}
              />

              <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-[#1E293B] shadow-xl rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC]">
                    {selectedProject.title}
                  </h2>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-2 rounded-lg hover:bg-[#E5E7EB] dark:hover:bg-[#334155] transition-colors"
                  >
                    <X className="w-5 h-5 text-[#6B7280]" />
                  </button>
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <p className="text-[#6B7280] mb-6">{selectedProject.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedProject.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-[#E5E7EB] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="bg-[#F1F5F9] dark:bg-[#334155] rounded-lg p-4">
                    <p className="text-sm text-[#6B7280] text-center">
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